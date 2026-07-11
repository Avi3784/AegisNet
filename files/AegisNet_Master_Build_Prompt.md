# AegisNet — Master Build Prompt

**Paste this entire document as your first message to Antigravity (Plan mode) or GitHub Copilot (Agent mode, VS Code).** It is written as direct instructions to you, the coding agent. Follow it module by module — do not skip ahead, do not combine modules, do not declare a module done until its Verify step actually passes on a clean run.

---

## Part A — How to run this, per tool

**If you are Antigravity:** treat each numbered module below as one Plan-mode session. Produce a Plan Artifact for the module, let the human review it, then execute. `git init` and make an initial commit before Module 0's changes; commit again after every module passes its Verify step. Use the Browser Subagent specifically for Module 6's visual check — don't just trust that `npm run dev` exiting 0 means the UI actually works.

**If you are GitHub Copilot (VS Code Agent Mode):** the free plan caps agent mode at 50 requests/month, and agent mode burns through several requests per task because it iterates. Budget for this — run **one module per agent-mode session**, not the whole project in one go. Save Part B of this document (trimmed) as `.github/copilot-instructions.md` so it's read automatically before every task, and save the module table as `AGENTS.md` so you always know what "done" means for the current task. (Both companion files are provided separately alongside this prompt — use them as-is.)

**Either tool:** if you hit a step you genuinely cannot complete autonomously — no internet access, a dataset host that requires manual registration, a missing API key — **stop and say so plainly.** Do not fabricate data, invent fake metrics, or silently skip the step and mark the module done anyway. The human would rather do a 2-minute manual step than discover later that a "passing" module was faked.

---

## Part B — Ground rules that apply to every module below

1. **Free tier only, always.** Groq and Gemini both offer genuinely free API access — no credit card. Never suggest, default to, or fall back on OpenAI, Anthropic, AWS, or any other paid service at any point, even as a "just to test" suggestion.
2. **Fail loud, never fabricate.** If a column is missing, a file isn't found, a key is invalid, or a download fails — raise a clear error naming exactly what's wrong and what you expected. Never let a pipeline silently continue on bad/fake data.
3. **The build → verify → fix loop, applied to every module:**
   - Build the module.
   - Handle every edge case listed for that module — these are not optional extras, they are part of the module.
   - **Verify:** run the module's verify step exactly as written.
   - If it fails: fix the specific cause, then **re-verify from a clean run** (re-run the whole verify step from scratch — don't assume a partial re-check is enough, and don't move on because "the fix looks right").
   - **Test against the predicted result:** compare actual output to the module's stated prediction. If it doesn't match, that's still a bug, even if no exception was thrown — go back to fixing, not to tuning around it.
   - Only once verify passes AND the result matches the prediction: `git commit` with a message naming the module, then move to the next module.
4. **Canonical feature schema — shared by every module that touches flow data.** Defined once here, used everywhere, never redefined per-module:

   | # | Feature | Type |
   |---|---|---|
   | 1 | `destination_port` | int |
   | 2 | `flow_duration` | float (µs) |
   | 3 | `total_fwd_packets` | int |
   | 4 | `total_bwd_packets` | int |
   | 5 | `total_fwd_bytes` | int |
   | 6 | `total_bwd_bytes` | int |
   | 7 | `fwd_packet_length_max` | int |
   | 8 | `fwd_packet_length_mean` | float |
   | 9 | `bwd_packet_length_max` | int |
   | 10 | `bwd_packet_length_mean` | float |
   | 11 | `flow_bytes_per_sec` | float |
   | 12 | `flow_packets_per_sec` | float |
   | 13 | `flow_iat_mean` | float |
   | 14 | `down_up_ratio` | float |
   | 15 | `syn_flag_count` | int |
   | 16 | `ack_flag_count` | int |
   | 17 | `fin_flag_count` | int |
   | 18 | `rst_flag_count` | int |
   | 19 | `psh_flag_count` | int |

5. **WebSocket message contract — shared by backend and frontend, never invented ad hoc:**
   ```json
   {"type": "flow", "timestamp": 0, "flow": {"src_ip": "", "src_port": 0, "dst_ip": "", "dst_port": 0, "protocol": "", "flags": "", "prediction": 0}}
   {"type": "threat", "timestamp": 0, "attack_type": "", "cognitive_report": {"Threat_Analysis": "", "Confidence_Validation": "", "Recommended_Mitigation": ["", ""]}}
   ```
   The frontend derives totals/status from this stream itself — do not invent a third message type for metrics.
6. **Model deployment discipline.** A trained model is never useful alone — the `MinMaxScaler` and the exact feature-column order used at training time must be saved and reloaded together with it, and applied in that exact order at inference. Never call `.predict()` on unscaled data or on a differently-ordered column set.
7. **LLM calls are async and throttled.** Use `httpx.AsyncClient`, never `requests`, anywhere in an async pipeline. Rate-limit your own calls to no more than one every ~2.5 seconds regardless of how fast flagged rows arrive — Groq's free tier is 30 requests/minute on `openai/gpt-oss-120b` (verify current numbers at console.groq.com/docs/rate-limits, this changes) and Gemini's free-tier RPM is similarly modest and model-dependent — self-throttling avoids ever depending on exact published numbers staying constant.

---

## Part C — Module map

| # | Module | Produces |
|---|---|---|
| 0 | Scaffold & environment | repo structure, venv, dependencies |
| 1 | DPI feature extraction | `src/dpi/`, tested against a self-crafted synthetic pcap |
| 2 | Dataset acquisition & preprocessing | cleaned, labeled `full_df` from real CICIDS2017 data |
| 3 | XGBoost training & evaluation | `models/artifact_bundle/` (model + scaler + feature list) |
| 4 | Cognitive engine | `src/cognitive/llm_agent.py`, Groq primary / Gemini fallback |
| 5 | FastAPI backend bridge | `src/backend/`, WebSocket + pipeline loop |
| 6 | React + Tailwind dashboard | `frontend/`, wired to the live WebSocket |
| 7 | End-to-end integration & demo rehearsal | a working, rehearsed, timed demo |

---

## Module 0 — Scaffold & environment

**Build:**
```
aegisnet/
├── data/{raw,processed}/
├── models/artifact_bundle/
├── src/{config.py, dpi/, ml/, cognitive/, backend/}
├── frontend/
├── tests/
├── .env.example
├── requirements.txt
└── README.md
```
`requirements.txt`: `scapy>=2.5 pandas>=2.0 numpy>=1.24 scikit-learn>=1.3 xgboost>=2.0 httpx>=0.27 fastapi>=0.110 uvicorn[standard]>=0.29 python-dotenv>=1.0 pytest>=8.0 joblib>=1.3 websockets>=12.0 kaggle>=1.6`

`.env.example`:
```
GROQ_API_KEY=
GEMINI_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
GEMINI_MODEL=gemini-3.5-flash
```
`.gitignore`: `.env`, `venv/`, `__pycache__/`, `node_modules/`, `data/raw/*`, `data/processed/*`.

**Edge cases:** pin Python 3.10+ and check it before creating the venv; `scapy` needs `libpcap` on Linux (`sudo apt-get install libpcap-dev` — ask before running `sudo`) and Npcap on Windows — check for import failure and report the OS-specific fix rather than retrying blindly; check `node --version` (need 18+) before scaffolding the frontend later.

**Stop-and-ask point:** you cannot create accounts on the human's behalf. Ask the human to:
1. Create a free Groq key at console.groq.com (email or Google sign-in, no card).
2. Create a free Gemini key at aistudio.google.com/apikey (no card).
3. Paste both into `.env`.
Do not proceed past Module 3 without confirming real keys are present — a placeholder key is not acceptable.

**Verify:** `python -c "import scapy, pandas, numpy, sklearn, xgboost, httpx, fastapi; print('ok')"` → prints `ok`, exit code 0.

**Predicted result:** clean import, no `ModuleNotFoundError`.

---

## Module 1 — DPI Feature Extraction

**Build** (`src/dpi/flow_tracker.py`, `src/dpi/feature_extractor.py`):
- Stream packets with `scapy.utils.PcapReader` — never `rdpcap()` on a full file, it loads everything into RAM.
- Bidirectional flow key: normalize `(ip, port)` pairs so `A→B` and `B→A` packets land in the same flow (sort the two endpoints, direction = which one this packet's source matches).
- Track per-flow: packet counts, byte sums, packet-length max/mean, timestamps — separately for forward and backward — plus a combined SYN/ACK/FIN/RST/PSH counter (decode via `pkt[TCP].flags & 0x02` etc.).
- 120-second inactivity timeout closes and emits a flow (matches CICFlowMeter convention).
- **At end-of-file, flush every still-open flow** — this is easy to miss and silently drops the last flow of the file if forgotten.
- Output: `data/processed/custom_extracted_features.csv`, headers exactly matching the Part B schema, no `label` column (this file is for inference).

**Edge cases (must all be explicitly handled, not just "shouldn't crash"):**
- Non-TCP packets (UDP/ICMP) — flag-counting logic must not assume a TCP layer exists.
- A flow consisting of exactly one packet.
- Two flows with identical IPs/ports but different protocol must be tracked separately.
- A flow still active at end-of-file must be emitted, not dropped.
- A corrupt/truncated pcap should raise a clear error, not crash with a raw traceback or hang.

**Verify — build a deterministic, self-contained test (no download needed):**
Write `tests/make_test_pcap.py` using Scapy's packet-crafting (not capture) to build a small synthetic pcap with exactly:
- Flow A: a normal 6-packet TCP exchange (SYN, SYN-ACK, ACK, PSH-ACK ×2, FIN) between one host pair.
- Flow B: 40 SYN-only packets from one source to one destination:443 within 1 second (DoS-shaped burst).
- Flow C: 2 packets between the same host pair, timestamps 130 seconds apart (must split into 2 rows due to the timeout).

Run the extractor against this pcap. `pytest tests/test_flow_tracker.py` should assert:
- Exactly 4 rows are produced (Flow A: 1, Flow B: 1, Flow C: 2).
- Flow B's row has `total_fwd_packets == 40` and `syn_flag_count == 40`.
- Flow A and B packets in opposite directions are not double-counted as separate flows.

**Predicted result:** exactly 4 rows, exact counts above. Any deviation is a flow-tracking bug — fix it and re-run the full test from scratch, don't patch around a wrong count.

---

## Module 2 — Dataset Acquisition & Preprocessing

**Build — acquisition, in this order, stopping to ask rather than guessing:**
1. Try the Kaggle mirror first — it's the only realistically scriptable path. Ask the human, once, to create a free Kaggle account and API token (kaggle.com/settings → "Create New Token", saves `kaggle.json`) and place it at `~/.kaggle/kaggle.json`. Then run `kaggle datasets list -s cicids2017` and pick the current top match rather than hardcoding a slug that may have changed — download with `kaggle datasets download -d <slug> -p data/raw --unzip`.
2. If that fails, tell the human the official source is unb.ca/cic/datasets/ids-2017.html (cite this in the report either way — it's the authoritative source), but that it typically requires a manual request form and is **not something you should assume you can script**. Stop and ask the human to manually download `MachineLearningCSV.zip` and place the three relevant CSVs in `data/raw/`.
3. Do not fabricate synthetic training data as a silent substitute if both paths fail.

**Build — preprocessing (`src/ml/prepare_dataset.py`):**
- List `data/raw/` and fuzzy-match filenames containing "Tuesday", "Wednesday", "Friday" — don't hardcode exact filenames, mirrors sometimes rename them.
- Strip whitespace from column headers; defensively rename known variant spellings (`Flow Byts/s` → `Flow Bytes/s`, etc.) before mapping to the canonical schema; **raise a clear error listing available columns if an expected one is missing** rather than a bare `KeyError`.
- Per-file label keep-lists: Tuesday → `BENIGN, FTP-Patator, SSH-Patator`; Wednesday → `BENIGN, DoS Hulk, DoS GoldenEye, DoS slowloris, DoS Slowhttptest` (drop `Heartbleed`, ~11 rows, out of scope); Friday → `BENIGN, PortScan`.
- Replace `Inf` in the two rate columns with that column's finite max — **do not drop Inf rows**, they're disproportionately DoS-flood flows (near-zero flow duration causes the divide-by-zero).
- Drop true NaNs elsewhere; drop exact duplicate rows.

**Edge cases:** empty result after filtering (assert row count per class before proceeding — if either class has under ~100 rows, stop and report which file/label produced nothing, don't train on it); a file with an unexpected extra column that isn't in the map (fine — just ignored, not an error); UNSW-NB15 is not used for training at all in this project (different schema, no clean brute-force category — mention this in the report as a deliberate scope choice, not an oversight).

**Verify:** print `full_df.shape` and `full_df['binary_label'].value_counts()`.

**Predicted result:** well over 100,000 total rows; both classes present; attack class a clear minority (roughly 5–20% is normal for this data — CICIDS2017 is famously ~70%+ benign). If you see only one class, or a few hundred rows total, something upstream broke (wrong file matched, filter too strict, or download incomplete) — stop, fix, and re-run this module's verify from a clean state before touching Module 3.

---

## Module 3 — XGBoost Training & Evaluation

**Build (`src/ml/train.py`):**
```python
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)   # fit ONLY on train
X_test_scaled = scaler.transform(X_test)
scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
model = xgb.XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.1,
                           scale_pos_weight=scale_pos_weight, eval_metric='aucpr', random_state=42)
model.fit(X_train_scaled, y_train)
```
Save model, scaler, and feature-column order together to `models/artifact_bundle/` — write to a temp path and rename on success, so a crash mid-save never leaves a half-written bundle.

**Edge cases:** confirm `scale_pos_weight` is computed from the train split, not the full dataset (a subtle leakage-adjacent mistake); confirm the scaler is never re-fit on test data; confirm feature order is read back from the saved `feature_columns.json`, not assumed.

**Verify — this needs a genuine re-verify, not a re-read of training logs:**
- Run `train.py`.
- Separately, in a fresh script/session, **reload the three saved artifacts from disk** (not the in-memory objects from training) and re-score on the held-out test set. If the reloaded model's metrics don't match what training reported, the save/load path is broken — that's exactly the kind of bug this re-verify step exists to catch.
- Report precision, recall, F1, and PR-AUC on the attack class specifically — not just accuracy (a model that predicts "benign" for everything scores >80% accuracy here and is useless).

**Predicted result:** precision and recall on the attack class both above 0.90 — these three attack types are cleanly separable in flow-feature space, so a properly-built pipeline should comfortably clear that bar. If you're well below it, debug in this order before touching hyperparameters: (1) is the scaler actually being applied before `.predict()`, (2) is the reloaded feature order identical to training, (3) is `scale_pos_weight` actually reaching the classifier, (4) did Inf values get imputed rather than silently dropped upstream.

---

## Module 4 — Cognitive Engine

**Build (`src/cognitive/llm_agent.py`):** system prompt with the exact JSON schema spelled out (3 keys: `Threat_Analysis`, `Confidence_Validation`, `Recommended_Mitigation` as a 2-item list), `httpx.AsyncClient`, provider-native JSON mode (`response_format: {"type": "json_object"}` for Groq, `responseMimeType: "application/json"` for Gemini), one retry on Groq before falling back to Gemini, and a `DEFAULT_ERROR_REPORT` if both fail. Throttle to no more than one call per ~2.5 seconds (Part B, rule 7).

**Edge cases:** missing/invalid API key; network timeout (set an explicit `timeout=10.0`); malformed JSON despite JSON mode (still wrap `json.loads` in try/except); a 429 — read `retry-after` if present, otherwise exponential backoff with jitter, capped at 2 attempts before falling back to the other provider.

**Verify — both a positive and a negative test are required, not just the happy path:**
1. **Positive:** call with a real flagged flow row and real keys. Assert the response has exactly the 3 required keys and `Recommended_Mitigation` is a list of exactly 2 strings.
2. **Negative:** temporarily set `GROQ_API_KEY` to an obviously invalid string and call again. Assert the function returns `DEFAULT_ERROR_REPORT` exactly, does not raise, and does not hang beyond your combined timeout budget (~20s worst case across both providers + retry).

**Predicted result:** (1) valid schema every time with real keys; (2) graceful, bounded-time fallback with no exception — this negative case is the one that actually proves the guardrail works, so don't skip it.

---

## Module 5 — FastAPI Backend Bridge

**Build (`src/backend/`):** `ConnectionManager` (accept/track/broadcast/disconnect over a list of active WebSockets), a `lifespan` context manager that starts the pipeline loop as a background task on startup and cancels it on shutdown, `CORSMiddleware` allowing `http://localhost:5173` and `http://localhost:3000`, a `/ws/live-feed` endpoint, and `pipeline_loop.py` that reads `custom_extracted_features.csv` row by row (~0.5–0.75s delay), reindexes each row to the saved feature order, scales, predicts, and broadcasts a `"flow"` message every row plus a `"threat"` message (with a cognitive report) immediately after any `prediction == 1`.

**Edge cases:** model/scaler files missing at startup should fail fast with a clear message at boot, not partway through the first request; the replay CSV missing or empty should fail the same way; a client disconnecting mid-broadcast must not crash the broadcast loop for other clients (wrap each `send_json` in its own try/except inside the broadcast method); confirm CORS headers are actually present for the frontend origin, not just "the server starts."

**Verify:**
1. `uvicorn src.backend.main:app --port 8000` — no exception in the first 5 seconds.
2. A throwaway script using the `websockets` library connects to `ws://localhost:8000/ws/live-feed` and asserts it receives at least 3 schema-valid `"flow"` messages within 5 seconds.
3. Kill that test client mid-stream and confirm the server log shows a clean disconnect, not an unhandled exception.

**Predicted result:** schema-valid messages arriving on schedule, clean disconnect handling, no CORS errors when the origin header matches the frontend's dev server.

---

## Module 6 — React + Tailwind Dashboard

**Build (`frontend/`):** scaffold with Vite, install `recharts`, `lucide-react`, Tailwind. Use the provided `AegisNetDashboard.jsx` (from the earlier deliverable in this project) as the starting point, or build an equivalent against the Part B message contract if working from a clean repo. Replace its `useAegisNetFeed()` mock interval with a real `WebSocket` connection to `VITE_WS_URL`, parsing `"flow"` and `"threat"` messages into the same state updates the mock version already used.

**Edge cases:** the WebSocket connection can drop mid-demo — wrap it in a small reconnect-with-backoff wrapper (retry after 1s, 2s, 4s, capping at ~10s) rather than leaving the UI stuck; a malformed/unparseable server message should be caught and skipped (`try/catch` around `JSON.parse`), not crash the render tree; keep the flows/chart arrays capped (last ~40/~24 entries) so a long-running demo doesn't leak memory.

**Verify:** `npm run dev`; with Module 5's backend also running, open the dashboard (use the browser subagent if available) and confirm: metrics tick up, the console scrolls, the chart moves, and the Cognitive Engine panel transitions idle → analyzing → active at least once within the observation window.

**Predicted result:** given the real dataset's roughly 5–20% attack rate (Module 2), a threat should surface within the first ~60–90 seconds of replay at the 0.5–0.75s per-row pace. If nothing surfaces after several minutes, don't assume the UI is broken first — check that the backend is actually sending `"threat"` messages (Module 5's verify) before debugging the frontend.

---

## Module 7 — End-to-End Integration & Demo Rehearsal

**Build:** `run_demo.md` with the exact 2-terminal startup sequence (backend, then frontend), and a `--demo-mode` flag on the replay script that force-injects one instance of each of the 3 attack types into the first ~20 rows of the replay, **clearly logged as demo-forced** (e.g. a `[DEMO-SEEDED]` tag in the console output). This exists purely so a live demo doesn't depend on random luck for pacing — it must never be confused with, or substituted for, the real held-out evaluation metrics from Module 3, which are the numbers that actually belong in your report.

**Edge cases:** the replay CSV reaching its end mid-demo — loop it back to the start rather than the stream silently going quiet.

**Verify:** a full run-through, timed, starting from a clean clone of the repo and following only your own `README.md` — if you (or someone else) can't get from clone to working demo using just the README, the README is the bug.

**Predicted result:** a working demo, start to finish, in under 10 minutes of setup time, with at least one of each attack type visibly surfacing in the Cognitive Engine panel during a single sitting.

**Exit gate:** final commit, tag it `v1.0-demo`.

---

## Part D — Plain-English explainer (for your viva/demo, not for the agent)

- **Modules 0–2:** "I use CICIDS2017, a peer-reviewed academic benchmark, and a packet parser I built from scratch extracts 19 measurable features — packet counts, byte sums, flag counts — from raw network flows."
- **Module 3:** "An XGBoost model — gradient-boosted decision trees, strong on tabular data — learns to separate attack flows from normal ones. Since attacks are a small minority of real traffic, I weight training so the model can't just learn to always guess 'normal' and still score well."
- **Module 4:** "When the model flags a flow, I send just that flow's numbers to a free LLM (Groq or Gemini) with a locked-down prompt asking for a fixed JSON structure: what the likely attack is, how confident it is, and two concrete ATM-specific mitigation steps — like a junior SOC analyst's write-up."
- **Module 5:** "A small FastAPI server runs the detection loop and pushes results to the browser live over a WebSocket, so the dashboard updates instantly instead of polling."
- **Module 6:** "The dashboard is a React app: live traffic console, a threat counter, and a panel that lights up with the AI's analysis whenever something's flagged."
- **Honesty note for the report:** this is a single supervised model (not an ensemble), a cloud LLM (not local), and a reduced feature set (not the full ~80-column CICFlowMeter output) — all deliberate simplifications for a working, demoable, explainable prototype. Say so directly if asked; it's a stronger answer than pretending otherwise.
