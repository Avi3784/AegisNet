# AegisNet — Corrected Master Build Specification (v2)

**Subtitle:** Agentic AI Framework for Edge ATM Network Security and Intrusion Detection
**This document supersedes the earlier draft.** It fixes several integration-breaking issues found in review (see Section 0) and replaces the Streamlit presentation layer with React + Tailwind CSS, which requires a new backend bridge (Section 8) that did not exist in the original plan.

**How to use this with Antigravity:** Work through Sections 5–9 as separate, sequential tasks (one per Antigravity "Plan" session), not one giant prompt. `git init` and commit before you start, and commit again after each phase passes its "Definition of Done" checklist — Antigravity's own docs recommend this so a bad autonomous edit is a `git revert` away, not a rebuild. Use Plan mode for each phase so the agent produces a Plan Artifact you can review before it writes code, and use the Browser Subagent specifically to verify Phase 9 (the React dashboard actually renders and the mock feed animates).

---

## 0. What changed from the original plan, and why

| # | Problem in the original plan | Why it breaks | Fix |
|---|---|---|---|
| 1 | DPI output (Phase 1) and model training data (Phase 2) have no guaranteed shared schema | `model.predict()` on live-extracted flows throws a column mismatch the first time you wire Phase 1 → Phase 4 | One canonical ~19-feature schema, defined once (Section 3), used by every phase |
| 2 | Swapping Streamlit for React drops the only thing that could call Python | React runs in the browser; it cannot import `xgboost` or read a `.env` file | New FastAPI backend (Section 8) bridges the ML/LLM pipeline to the browser over a WebSocket |
| 3 | LLM call uses `requests` (blocking); pipeline wants `asyncio` (non-blocking) | `requests` blocks the event loop no matter what calls it — this recreates the exact freeze the plan tries to avoid | LLM client switched to `httpx.AsyncClient` |
| 4 | Rows with `Inf` values are dropped | `Flow Bytes/s` / `Flow Packets/s` divide-by-zero almost exclusively on near-zero-duration flows — i.e. DoS flood packets. Dropping them removes real positive-class signal | Impute `Inf` with the column's finite max, don't drop |
| 5 | CICIDS2017 + UNSW-NB15 combined for 3 specific labeled attacks | Different feature sets, and UNSW-NB15 has no clean SSH/FTP brute-force category — reconciling them buys nothing here | CICIDS2017 only for training; UNSW-NB15 optional as a separate generalization test |
| 6 | LLM guardrail expects 3 exact JSON keys, but the system prompt never states them | Model is free to name fields anything; guardrail rejects most responses as "hallucinated" | Exact schema embedded in the prompt + provider-native JSON mode as a first line of defense |
| 7 | `MinMaxScaler` and feature-column order are fit during training but never saved | Live inference would scale/order features differently than training did → silently wrong predictions | Model + scaler + feature list saved and loaded together as one bundle |
| 8 | No CORS handling anywhere in the plan | React dev server (port 5173) calling FastAPI (port 8000) is a cross-origin request; browsers block it by default | `CORSMiddleware` added explicitly in Section 8 |
| 9 | Recommended model `llama-3.3-70b-versatile` | Groq deprecated this model on **June 17, 2026** | Use `openai/gpt-oss-120b` (verify against `console.groq.com/docs/models` before you build, since Groq's catalog rotates often) |
| 10 | Exact CICIDS2017 column strings assumed | Header strings vary slightly by source/release (e.g. `Flow Bytes/s` vs `Flow Byts/s`, leading spaces) | Defensive strip + rename-dict + loud failure pattern (Section 6.2), not hardcoded trust |

---

## 1. Project Overview & Scope (unchanged)

**Domain:** Edge ATM Network Security.
**Goal:** An autonomous, out-of-band threat detection prototype that flags malicious network traffic and uses an agentic LLM to generate explainable, Tier-3 SOC analyst reports and mitigation strategies.

**Architectural exclusions — do not implement:**
- **No active mitigation.** No `iptables` calls, no packet dropping. This is a detection + advisory system only.
- **No multi-agent frameworks.** No AutoGen/CrewAI. A single deterministic orchestrator pipeline.
- **No enterprise SIEM.** No Splunk/ELK integration. Output is the dashboard described in Section 9.

**Target attack vectors** (all detected as binary Normal=0 / Attack=1, with the *type* identified downstream by the cognitive engine, not the classifier):
- **Volumetric DoS on gateway** — packet-count spikes, near-zero flow duration.
- **Admin brute force (SSH/FTP)** — high-frequency small packets on ports 22/21.
- **Subnet reconnaissance / port scan** — one source IP hitting many destination ports with no completed handshake.

---

## 2. Repository structure

```
aegisnet/
├── data/
│   ├── raw/                      # CICIDS2017 CSVs + pcaps (gitignored, not committed)
│   └── processed/
│       └── custom_extracted_features.csv
├── models/
│   └── artifact_bundle/          # xgb_aegisnet.json + scaler.pkl + feature_columns.json
├── src/
│   ├── config.py                 # canonical feature list, paths, hyperparams, constants
│   ├── dpi/
│   │   ├── flow_tracker.py       # Phase 1
│   │   └── feature_extractor.py
│   ├── ml/
│   │   ├── prepare_dataset.py    # Phase 2 preprocessing
│   │   ├── train.py
│   │   └── evaluate.py
│   ├── cognitive/
│   │   └── llm_agent.py          # Phase 3
│   └── backend/
│       ├── main.py               # Phase 4a — FastAPI app
│       ├── pipeline_loop.py
│       └── connection_manager.py
├── frontend/                     # Phase 4b — React app (dashboard file provided separately)
├── tests/
│   ├── test_flow_tracker.py
│   ├── test_preprocessing.py
│   └── test_guardrail.py
├── .env.example
├── requirements.txt
└── README.md
```

---

## 3. Canonical feature schema — define this once, use it everywhere

This is the single most important fix. Phase 1 (DPI) must emit exactly these columns, in this order, and Phase 2 (training) must train on exactly these columns pulled from CICIDS2017. Never let either phase silently add or drop a column.

| # | Feature (canonical name) | Type | Notes |
|---|---|---|---|
| 1 | `destination_port` | int | Strong signal for brute force (21/22) |
| 2 | `flow_duration` | float, µs | |
| 3 | `total_fwd_packets` | int | |
| 4 | `total_bwd_packets` | int | |
| 5 | `total_fwd_bytes` | int | Sum of forward payload lengths |
| 6 | `total_bwd_bytes` | int | |
| 7 | `fwd_packet_length_max` | int | |
| 8 | `fwd_packet_length_mean` | float | |
| 9 | `bwd_packet_length_max` | int | |
| 10 | `bwd_packet_length_mean` | float | |
| 11 | `flow_bytes_per_sec` | float | Guard divide-by-zero — see 6.3 |
| 12 | `flow_packets_per_sec` | float | Guard divide-by-zero — see 6.3 |
| 13 | `flow_iat_mean` | float | Mean inter-arrival time between packets in the flow |
| 14 | `down_up_ratio` | float | bwd_packets / max(fwd_packets, 1) |
| 15 | `syn_flag_count` | int | |
| 16 | `ack_flag_count` | int | |
| 17 | `fin_flag_count` | int | |
| 18 | `rst_flag_count` | int | |
| 19 | `psh_flag_count` | int | |
| — | `label` (train only) | 0/1 | Not present in live inference rows |

This is a deliberately reduced subset of CICFlowMeter's ~80 columns — chosen because it's realistic for a from-scratch Scapy parser to compute correctly, while still separating the 3 target attacks. Don't try to replicate every CICFlowMeter feature; the extra ~60 columns (active/idle sub-flow timing, per-direction header length, etc.) require flow-segmentation logic that's disproportionate effort for what it buys here.

---

## 4. Environment & dependencies

`requirements.txt`:
```
scapy>=2.5
pandas>=2.0
numpy>=1.24
scikit-learn>=1.3
xgboost>=2.0
httpx>=0.27
fastapi>=0.110
uvicorn[standard]>=0.29
python-dotenv>=1.0
pytest>=8.0
joblib>=1.3
```

`.env.example`:
```
GROQ_API_KEY=
GEMINI_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
GEMINI_MODEL=gemini-3.5-flash
```
Add `.env` to `.gitignore`. Verify both model IDs against current provider docs before relying on them — Groq in particular deprecates models with a few weeks' notice.

Frontend (`frontend/package.json` deps): `react`, `react-dom`, `recharts`, `lucide-react`, `tailwindcss`, `vite`.

---

## 5. Phase 1 — DPI Feature Extraction

**Objective:** Parse `.pcap` files into flow records matching the Section 3 schema.

**Tech:** `scapy` (portable, pip-installable, no external binary — prefer this over PyShark/tshark for an agentic build environment where tshark may not be pre-installed).

**Streaming, not loading whole files:**
```python
from scapy.utils import PcapReader

def iter_packets(pcap_path):
    with PcapReader(pcap_path) as reader:
        for pkt in reader:
            yield pkt
```
Never use `rdpcap()` on large files — it loads the entire capture into RAM.

**Bidirectional flow key — normalize direction so A→B and B→A packets land in the same flow:**
```python
def flow_key(ip_a, port_a, ip_b, port_b, proto):
    """Returns (canonical_key, direction) where direction is 'fwd' if this
    packet's (src, sport) matches the lexicographically smaller endpoint."""
    endpoint_a = (ip_a, port_a)
    endpoint_b = (ip_b, port_b)
    if endpoint_a <= endpoint_b:
        return (ip_a, port_a, ip_b, port_b, proto), 'fwd'
    return (ip_b, port_b, ip_a, port_a, proto), 'bwd'
```

**Flow timeout:** close and emit a flow after 120 seconds of inactivity (matches CICFlowMeter convention) so long-running captures don't hold every flow in memory indefinitely. Maintain an active-flows dict keyed by the canonical key above; on each packet, check if `now - last_seen > 120` for that key and if so, finalize + emit + start a new flow under the same key.

**Per-flow accumulator fields:** track packet count, byte sum, packet-length max, and timestamps separately for `fwd` and `bwd` directions, plus a running SYN/ACK/FIN/RST/PSH counter across both directions (TCP flags come from `pkt[TCP].flags`, a bitfield — decode with `pkt[TCP].flags & 0x02` for SYN, `0x10` for ACK, `0x01` for FIN, `0x04` for RST, `0x08` for PSH).

**Output:** write every finalized flow as a row to `data/processed/custom_extracted_features.csv` with headers matching Section 3 exactly (no `label` column — this file is for inference, not training).

**Definition of Done:**
- [ ] Running the extractor on a sample pcap produces a CSV with exactly the 19 Section 3 columns, correctly named.
- [ ] `tests/test_flow_tracker.py` verifies: (a) two packets in opposite directions between the same host pair map to one flow, not two; (b) a flow with a >120s gap produces two separate rows, not one.
- [ ] No `rdpcap()` calls anywhere in the codebase (grep to confirm).

---

## 6. Phase 2 — Perception Layer (XGBoost)

**Objective:** Binary classifier (0=Normal, 1=Attack), trained on CICIDS2017 only.

### 6.1 Dataset — use these three CICIDS2017 files only

| File | Attack labels to keep (+ BENIGN) |
|---|---|
| `Tuesday-WorkingHours.pcap_ISCX.csv` | `FTP-Patator`, `SSH-Patator` |
| `Wednesday-workingHours.pcap_ISCX.csv` | `DoS Hulk`, `DoS GoldenEye`, `DoS slowloris`, `DoS Slowhttptest` (drop `Heartbleed` — only 11 rows, out of scope, would just add noise) |
| `Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv` | `PortScan` |

Do not pull in UNSW-NB15 for training — different feature schema, and it has no clean SSH/FTP brute-force category to map onto. If you want a generalization check later, evaluate the trained model's *behavior* against UNSW-NB15 flows as a separate stretch-goal experiment, not as training data.

### 6.2 Defensive column loading — do not hardcode trust in exact header strings

CICIDS2017 header strings vary slightly by source/release (leading spaces, `Flow Bytes/s` vs `Flow Byts/s`, etc). Strip, map, and fail loudly if something's missing — don't let a silent `KeyError` surface three files deep into a pipeline:

```python
import pandas as pd

COLUMN_MAP = {
    'Destination Port': 'destination_port',
    'Flow Duration': 'flow_duration',
    'Total Fwd Packets': 'total_fwd_packets',
    'Total Backward Packets': 'total_bwd_packets',
    'Total Length of Fwd Packets': 'total_fwd_bytes',
    'Total Length of Bwd Packets': 'total_bwd_bytes',
    'Fwd Packet Length Max': 'fwd_packet_length_max',
    'Fwd Packet Length Mean': 'fwd_packet_length_mean',
    'Bwd Packet Length Max': 'bwd_packet_length_max',
    'Bwd Packet Length Mean': 'bwd_packet_length_mean',
    'Flow Bytes/s': 'flow_bytes_per_sec',
    'Flow Packets/s': 'flow_packets_per_sec',
    'Flow IAT Mean': 'flow_iat_mean',
    'Down/Up Ratio': 'down_up_ratio',
    'SYN Flag Count': 'syn_flag_count',
    'ACK Flag Count': 'ack_flag_count',
    'FIN Flag Count': 'fin_flag_count',
    'RST Flag Count': 'rst_flag_count',
    'PSH Flag Count': 'psh_flag_count',
    'Label': 'label',
}

def load_and_clean(path, keep_labels):
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()
    # Handle the "Flow Byts/s" vs "Flow Bytes/s" style variants defensively
    alt = {'Flow Byts/s': 'Flow Bytes/s', 'Flow Pkts/s': 'Flow Packets/s'}
    df = df.rename(columns=alt)
    missing = [c for c in COLUMN_MAP if c not in df.columns]
    if missing:
        raise ValueError(
            f"{path}: expected columns not found after cleaning: {missing}\n"
            f"Available columns: {list(df.columns)}"
        )
    df = df.rename(columns=COLUMN_MAP)[list(COLUMN_MAP.values())]
    df['label'] = df['label'].str.strip()
    df = df[df['label'].isin(keep_labels)]
    df['binary_label'] = (df['label'] != 'BENIGN').astype(int)
    return df

tuesday = load_and_clean('data/raw/Tuesday-WorkingHours.pcap_ISCX.csv',
                          ['BENIGN', 'FTP-Patator', 'SSH-Patator'])
wednesday = load_and_clean('data/raw/Wednesday-workingHours.pcap_ISCX.csv',
                            ['BENIGN', 'DoS Hulk', 'DoS GoldenEye', 'DoS slowloris', 'DoS Slowhttptest'])
friday = load_and_clean('data/raw/Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv',
                         ['BENIGN', 'PortScan'])

full_df = pd.concat([tuesday, wednesday, friday], ignore_index=True)
```

### 6.3 Inf handling — impute, don't drop

```python
import numpy as np

RATE_COLS = ['flow_bytes_per_sec', 'flow_packets_per_sec']
full_df[RATE_COLS] = full_df[RATE_COLS].replace([np.inf, -np.inf], np.nan)
for col in RATE_COLS:
    finite_max = full_df[col].max(skipna=True)
    full_df[col] = full_df[col].fillna(finite_max)

# Any remaining NaNs elsewhere are genuinely missing data, safe to drop
full_df = full_df.dropna()
```
Reasoning: divide-by-zero on these two columns happens almost exclusively on near-zero-duration flows — exactly the DoS flood signature. Dropping those rows would bias the model away from recognizing the attack it needs to catch.

### 6.4 Train/test split, scaling, class imbalance

```python
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import xgboost as xgb
import joblib, json

FEATURE_COLS = [c for c in COLUMN_MAP.values() if c not in ('label',)]
X = full_df[FEATURE_COLS]
y = full_df['binary_label']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)   # fit ONLY on train
X_test_scaled = scaler.transform(X_test)          # transform test, never re-fit

scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

model = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.1,
    scale_pos_weight=scale_pos_weight,
    eval_metric='aucpr',   # PR-AUC, more informative than accuracy on imbalanced data
    random_state=42,
)
model.fit(X_train_scaled, y_train)
```

### 6.5 Evaluation

Report precision, recall, F1, confusion matrix, and PR-AUC — not just accuracy (a model that predicts "Normal" for everything scores >90% accuracy on this data and is useless).

### 6.6 Save model + scaler + feature order as ONE bundle — this is the fix for #7 above

```python
import os
os.makedirs('models/artifact_bundle', exist_ok=True)
model.save_model('models/artifact_bundle/xgb_aegisnet.json')
joblib.dump(scaler, 'models/artifact_bundle/scaler.pkl')
with open('models/artifact_bundle/feature_columns.json', 'w') as f:
    json.dump(FEATURE_COLS, f)
```
At inference time (Phase 4a), always load all three together and apply them in this order: reindex incoming row(s) to `feature_columns.json`'s order → `scaler.transform()` → `model.predict()`. Never call `model.predict()` on unscaled data or data in a different column order than training used.

**Definition of Done:**
- [ ] `models/artifact_bundle/` contains all three files after running `src/ml/train.py`.
- [ ] Precision/recall/F1/PR-AUC printed and saved to a results file.
- [ ] `tests/test_preprocessing.py` confirms Inf values in `flow_bytes_per_sec` are imputed, not dropped (assert row count is preserved on a synthetic frame with one Inf row).

---

## 7. Phase 3 — Cognitive Engine

**Objective:** On `prediction == 1`, call an LLM to produce a structured SOC report.

### 7.1 System prompt — schema must be explicit, not implied

```
You are AegisNet's Cognitive Engine, a Tier-3 SOC analyst for an ATM network.
Analyze the malicious network flow data below, flagged by the ML detection layer.
Identify the likely attack (Volumetric DoS, Admin Brute Force, or Subnet Reconnaissance)
and provide a 2-step ATM-specific mitigation strategy.

Respond with ONLY a JSON object matching this exact structure, no other text:
{
  "Threat_Analysis": "<2-3 sentence explanation of what the flow data indicates and why>",
  "Confidence_Validation": "<confidence level and brief justification, e.g. 'High (92%) - packet-rate signature matches known SYN-flood profile'>",
  "Recommended_Mitigation": ["<step 1>", "<step 2>"]
}
```

### 7.2 Async client with provider-native JSON mode + one retry + fallback

Use `httpx.AsyncClient`, not `requests` — this is fix #3 from Section 0.

```python
import httpx, json, os

REQUIRED_KEYS = ("Threat_Analysis", "Confidence_Validation", "Recommended_Mitigation")

def _validate(report: dict) -> bool:
    return all(k in report for k in REQUIRED_KEYS) and isinstance(
        report["Recommended_Mitigation"], list
    )

async def _call_groq(flow_json: str, system_prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"},
            json={
                "model": os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": flow_json},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            },
        )
        resp.raise_for_status()
        return json.loads(resp.json()["choices"][0]["message"]["content"])

async def _call_gemini(flow_json: str, system_prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{os.environ.get('GEMINI_MODEL', 'gemini-3.5-flash')}:generateContent",
            headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]},
            json={
                "contents": [{"parts": [{"text": f"{system_prompt}\n\n{flow_json}"}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2,
                },
            },
        )
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)

DEFAULT_ERROR_REPORT = {
    "Threat_Analysis": "Cognitive engine unavailable — flow flagged by ML layer only.",
    "Confidence_Validation": "Unavailable",
    "Recommended_Mitigation": ["Escalate to on-call SOC analyst for manual review."],
}

async def get_cognitive_report(flow_row: dict, system_prompt: str) -> dict:
    flow_json = json.dumps(flow_row)
    for attempt_fn in (_call_groq, _call_groq, _call_gemini):
        # Groq is attempted twice (one retry) before falling back to Gemini
        try:
            report = await attempt_fn(flow_json, system_prompt)
            if _validate(report):
                return report
        except Exception:
            continue
    return DEFAULT_ERROR_REPORT
```

**Definition of Done:**
- [ ] `tests/test_guardrail.py` confirms `_validate()` rejects a dict missing any required key, and rejects `Recommended_Mitigation` that isn't a list.
- [ ] Calling `get_cognitive_report` with a broken/missing API key returns `DEFAULT_ERROR_REPORT`, never raises.
- [ ] Verify `openai/gpt-oss-120b` and `gemini-3.5-flash` are still current model IDs against provider docs before relying on this — both providers rotate their catalogs.

---

## 8. Phase 4a — FastAPI Backend Bridge (NEW — required for the React frontend to function)

**Objective:** Run the pipeline loop server-side and stream results to the browser. This component is required because React cannot run Python; it did not exist in the original Streamlit-based plan.

```python
# src/backend/main.py
import asyncio, json, time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(run_pipeline_loop())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/live-feed")
async def live_feed(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keep-alive; client doesn't need to send anything meaningful
    except WebSocketDisconnect:
        manager.disconnect(ws)

async def run_pipeline_loop():
    from src.backend.pipeline_loop import stream_predictions
    async for message in stream_predictions():
        await manager.broadcast(message)
```

### 8.1 WebSocket message contract — the frontend (Section 9) expects exactly this shape

```json
// type "flow" — sent for every row, benign or not
{
  "type": "flow",
  "timestamp": 1720000000000,
  "flow": {
    "src_ip": "10.42.20.7", "src_port": 51322,
    "dst_ip": "10.42.11.4", "dst_port": 22,
    "protocol": "TCP", "flags": "PSH,ACK",
    "prediction": 0
  }
}

// type "threat" — sent only when prediction == 1, immediately after the "flow" message
{
  "type": "threat",
  "timestamp": 1720000000500,
  "attack_type": "brute_force",
  "cognitive_report": {
    "Threat_Analysis": "...",
    "Confidence_Validation": "High (91%) - ...",
    "Recommended_Mitigation": ["...", "..."]
  }
}
```
`pipeline_loop.py` reads `custom_extracted_features.csv` row by row with a ~0.5–0.75s delay (reindex to `feature_columns.json` order → scale → predict), yields a `"flow"` message every row, and yields a `"threat"` message immediately after whenever prediction is 1 (calling `get_cognitive_report` from Section 7 first). The frontend derives its own running totals (total flows, active threats, alert/operational status) from the stream — the backend doesn't need a separate metrics message type.

**Definition of Done:**
- [ ] `uvicorn src.backend.main:app --reload` starts without error.
- [ ] Connecting a WebSocket client to `ws://localhost:8000/ws/live-feed` receives a stream of `"flow"` messages matching the schema above.
- [ ] A request from `http://localhost:5173` (the Vite dev server) succeeds — i.e. CORS is actually configured, not just present in the code.

---

## 9. Phase 4b — React + Tailwind Dashboard

A complete, working dashboard component (`AegisNetDashboard.jsx`) is provided alongside this spec, built against the exact message contract in Section 8.1. It currently runs on an in-memory simulated feed so it's demoable standalone; the only change needed to go live is inside its `useAegisNetFeed()` hook — replace the `setInterval` mock generator with:

```js
useEffect(() => {
  const ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/live-feed');
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'flow') { /* push into flows[], update metrics, update chartData */ }
    if (msg.type === 'threat') { /* trigger the cognitive panel with msg.cognitive_report */ }
  };
  return () => ws.close();
}, []);
```
Set `VITE_WS_URL` in a `frontend/.env` file so the URL isn't hardcoded.

**To scaffold the project:**
```
npm create vite@latest frontend -- --template react
cd frontend
npm install recharts lucide-react
npm install -D tailwindcss @tailwindcss/vite
```
Drop the provided `AegisNetDashboard.jsx` into `frontend/src/`, import and render it from `App.jsx`.

**Definition of Done:**
- [ ] `npm run dev` renders the dashboard with the simulated feed animating (metrics ticking up, console scrolling, chart moving, cognitive panel triggering periodically).
- [ ] After wiring the WebSocket per above, the same UI updates from real backend messages instead of the mock generator.
- [ ] Use Antigravity's browser subagent here specifically — have it open the running dev server and confirm visually that the console scrolls and the cognitive panel activates, rather than trusting a headless test alone.

---

## 10. Run instructions (end to end)

```bash
# 1. Environment
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY / GEMINI_API_KEY

# 2. Train the model (one-time)
python -m src.ml.train

# 3. Generate a demo feature CSV from a sample pcap (or reuse a CICIDS2017 day for demo purposes)
python -m src.dpi.feature_extractor --pcap data/raw/sample.pcap --out data/processed/custom_extracted_features.csv

# 4. Start the backend
uvicorn src.backend.main:app --reload --port 8000

# 5. In a second terminal, start the frontend
cd frontend && npm run dev
```

---

## 11. Honest scope notes — for your report/demo framing

Be upfront about these rather than letting them surface as questions in review:
- Single supervised model (XGBoost), not an ensemble — a deliberate simplification for a working, demoable prototype.
- Cloud LLM (Groq/Gemini) for the cognitive layer, not a local model — a tradeoff of demo reliability and speed against the on-prem/data-residency motivation that would favor a local model in a real deployment.
- Reduced 19-feature schema, not full CICFlowMeter (~80 columns) — chosen because it's realistic for a from-scratch DPI parser to compute correctly.
- Trained and validated on CICIDS2017 only; UNSW-NB15 is not used unless you explicitly add the optional generalization test mentioned in Section 6.1.
