# AegisNet — Project Instructions for Copilot

## What this is
Edge ATM network intrusion detection prototype: DPI feature extraction (Scapy) → XGBoost binary classifier → LLM (Groq/Gemini, free tier) cognitive layer → FastAPI WebSocket backend → React + Tailwind dashboard. Detection + advisory only — never active mitigation (no `iptables`, no packet blocking, no multi-agent frameworks).

## Hard rules
- **Free tier APIs only.** Never suggest or default to OpenAI/Anthropic paid APIs or any paid cloud service. Groq (`openai/gpt-oss-120b`) primary, Gemini (`gemini-3.5-flash`) fallback — both are free-tier eligible with no credit card, but verify exact current model names before relying on them; both providers rotate their catalogs.
- **Fail loud, never fabricate.** If a step can't be completed (missing data, missing keys, no internet, a dataset host requiring manual registration), stop and clearly tell the human what's blocking you. Never fake output, fake a passing test, or silently skip a broken step.
- **One canonical 19-feature schema** (see the master build prompt, Part B) is shared by the DPI extractor and the training pipeline. Never let either drift from it.
- **WebSocket contract:** `{"type": "flow", ...}` for every row, `{"type": "threat", ...}` immediately after when `prediction == 1`. The frontend derives its own running totals from this stream — don't add a separate metrics message type.
- **Model deployment discipline:** fit the scaler only on the training split; save model + scaler + feature-column order together as one bundle; always reload and apply all three together at inference, never predict on unscaled or misordered data.
- **Inf handling:** replace divide-by-zero rate columns with the column's finite max — never drop those rows, they're disproportionately real attack signal (near-zero-duration DoS flows).
- **Async LLM calls:** use `httpx.AsyncClient`, never `requests`, in any async pipeline. Self-throttle to roughly one call per 2.5 seconds regardless of burst rate.

## Workflow
Build one module at a time from `AGENTS.md` / the master build prompt. For each module: build → handle its listed edge cases → verify → re-verify from a clean run after any fix → confirm the result matches the module's stated prediction → only then commit and move to the next module. Do not skip ahead or combine modules in one session — the free plan's request budget doesn't support that anyway.

## Stack
Python 3.10+, FastAPI, httpx, scapy, pandas, scikit-learn, xgboost, pytest · React (Vite) + Tailwind, recharts, lucide-react.
