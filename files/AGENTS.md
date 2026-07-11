# AegisNet — Agent Task List

Work through these in order, one per session. Each row has a build target and a verify command — after any fix, re-run verify from a clean state before moving on. Full detail, code, and edge cases for each module are in `AegisNet_Master_Build_Prompt.md`.

| # | Module | Build | Verify | Predicted result |
|---|--------|-------|--------|-------------------|
| 0 | Scaffold & environment | repo tree, venv, `requirements.txt`, `.env.example` | `python -c "import scapy,pandas,xgboost,fastapi,httpx"` | exits 0, no `ImportError` |
| 1 | DPI feature extraction | `src/dpi/flow_tracker.py`, `feature_extractor.py` | `pytest tests/test_flow_tracker.py` against a self-crafted synthetic pcap | exactly 4 flow rows, exact counts per fixture |
| 2 | Dataset acquisition & preprocessing | `src/ml/prepare_dataset.py` (Kaggle mirror → official UNB fallback → ask human) | print `full_df.shape` and `.value_counts()` | >100k rows, both classes present, attack a clear minority |
| 3 | XGBoost training & evaluation | `src/ml/train.py` → `models/artifact_bundle/` | reload saved bundle from disk (not in-memory) and re-score on held-out test set | precision & recall on attack class both >0.90 |
| 4 | Cognitive engine | `src/cognitive/llm_agent.py` (Groq primary, Gemini fallback) | `pytest tests/test_guardrail.py` — valid-key AND invalid-key cases | valid: 3-key schema; invalid: `DEFAULT_ERROR_REPORT`, no crash, bounded time |
| 5 | FastAPI backend bridge | `src/backend/main.py`, `pipeline_loop.py`, `connection_manager.py` | run `uvicorn`, connect a throwaway WebSocket test client | ≥3 schema-valid `"flow"` messages within 5s, clean disconnect handling |
| 6 | React + Tailwind dashboard | `frontend/` wired to the live WebSocket | `npm run dev` with backend running; visually confirm in browser | metrics tick, console scrolls, cognitive panel activates within ~90s |
| 7 | End-to-end integration & demo rehearsal | `run_demo.md`, `--demo-mode` seeding flag | full timed run-through from a clean clone, using only the README | working demo in <10 min setup, all 3 attack types surface once |

**Non-negotiable, every module:** free-tier APIs only · fail loud, never fabricate · shared 19-feature schema · shared WebSocket contract · scaler+model+feature-order saved/loaded together · Inf imputed not dropped · `httpx.AsyncClient` not `requests` in async code · commit only after verify passes.
