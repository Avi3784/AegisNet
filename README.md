# AegisNet

**AegisNet is a research prototype for hybrid network intrusion detection and analyst-oriented incident triage.** It targets general network environments. An ATM-connected network is one possible deployment scenario, not the only target and not a separately validated environment.

The repository contains a FastAPI backend, React dashboard, flow-feature processing, machine-learning pipeline, persistence, and analyst-facing workflows. Some workflows are demonstrations or simulations. This is not a production security appliance and must not be connected to live ATM or enterprise infrastructure as an autonomous blocking system.

## Research direction

The accompanying paper proposes three stages:

1. **Static pathway — XGBoost:** classify known attack patterns from flow-level features and produce a known-attack score.
2. **Temporal pathway — Bi-LSTM:** learn representations from windows of consecutive flows (paper window length: 10), producing a 32-dimensional latent representation.
3. **Anomaly pathway — VAE:** reconstruct the Bi-LSTM latent representation. The VAE is trained on benign latent representations; reconstruction error provides an anomaly score.

The proposed late-fusion score is `R = alpha * calibrated_XGBoost_score + (1 - alpha) * calibrated_VAE_reconstruction_score`. The two scores must be calibrated independently on validation data. Fusion weights and decision thresholds must also be selected using validation data only.

**Research status:** the paper describes the complete Bi-LSTM → VAE → calibration → fusion path as proposed work. Do not interpret a standalone model, dashboard event, or demo injection as proof that this integrated architecture has been implemented or validated.

## Current prototype capabilities

- FastAPI application and WebSocket live-feed interface.
- React/Vite dashboard.
- A 19-column flow-feature schema in `src/config.py`.
- Flow CSV replay and model-inference code.
- Model training scripts under `src/ml/`.
- SQLite persistence for users, flows, threats, settings, and feedback.
- Analyst-facing incident summaries and response/playbook interfaces.
- Synthetic demo data and synthetic threat injection for UI walkthroughs.

The demo data and `/api/inject` route are test fixtures. They exercise the interface; they are not evidence that a live network attack was detected. A synthetic injection must be labelled as a test event, not a model prediction.

## Data and evaluation

The project has used CICIDS2017-derived flow data. Public enterprise intrusion datasets are not ATM-specific.

- Report results on CICIDS2017, CSE-CIC-IDS2018, or UNSW-NB15 as results on those datasets, not as ATM detection accuracy.
- Publish performance numbers only when reproducible from a saved evaluation run with dataset version, split, feature schema, model artifact, and metrics recorded.
- Accuracy alone is insufficient. Report precision, recall, F1, false-positive rate, confusion matrix, AUROC where appropriate, and latency/throughput when measured.
- Split data chronologically before constructing temporal windows. Fit preprocessing only on training data. Keep windows from crossing train/validation/test boundaries.
- Keep held-out attack-family and cross-dataset experiments separate from ordinary random-split results.

## Demo and operational safety

Run locally or in an isolated lab with authorized sample data.

- Use synthetic fixtures only for UI and workflow demonstrations, and label them as synthetic.
- Keep endpoint isolation, IP blocking, and other response actions in simulation mode unless an authorized operator explicitly approves a controlled lab action.
- Treat LLM-generated explanations as analyst assistance, not as detection evidence or authority to take response actions.
- Do not upload sensitive PCAPs or credentials to third-party services.
- Configure secrets through environment variables. Never commit API keys, passwords, signing keys, or real customer traffic.

## Local setup

### Backend

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment

Create a local `.env` file for optional integrations. Do not commit it.

```env
GROQ_API_KEY=
GEMINI_API_KEY=
KAGGLE_API_TOKEN=
AEGISNET_ADMIN_PASSWORD=
AEGISNET_SECRET_KEY=
```

A Kaggle token is optional unless you use the dataset download script. Generate a new token and keep it only in your local environment. Any credential previously committed to Git history must be revoked/rotated; deleting it from the latest file does not erase it from old commits.

Set `AEGISNET_ADMIN_PASSWORD` before the first database initialization if you want the application to bootstrap its initial admin account. Set `AEGISNET_SECRET_KEY` to a long, random secret before using authentication. ### Prepare data and train the static pathway

```bash
# Requires source CICIDS2017 CSV files in data/raw/, or a configured Kaggle token
python -m src.ml.prepare_dataset
python -m src.ml.train_model
```

The training entry point currently trains the XGBoost static pathway and writes `models/ensemble_model.pkl`, `models/scaler.pkl`, and `models/metrics.json`. The filename `ensemble_model.pkl` is retained for backend compatibility; the current artifact is an XGBoost classifier, not a voting ensemble. This does not implement the Bi-LSTM/VAE pathway or late fusion.

The API can start in demo mode when trained model artifacts are absent. Demo mode must be visibly distinguished from model-backed inference.

## Repository map

- `src/backend/` — API, persistence, WebSocket feed, authentication, analyst workflows.
- `src/ml/` — data preparation and model training.
- `src/dpi/` — flow feature extraction.
- `src/cognitive/` — LLM-assisted incident explanation.
- `src/intervention/` — response workflow and simulation.
- `frontend/` — dashboard.
- `models/` — local model artifacts; artifacts alone are not reproducible evidence.

## Known limitations and next research milestones

These are completion targets, not claims of current capability:

1. Reconcile the canonical feature schema and model artifact format across training and inference.
2. Implement the paper's Bi-LSTM latent representation and benign-only VAE training path.
3. Add validation-only calibration, weighted late fusion, and the documented decision rule.
4. Add chronological, leakage-safe splits and held-out attack-family evaluation.
5. Add ablations, multiple seeds, statistical uncertainty, and cross-dataset evaluation.
6. Record reproducible model metadata, dataset provenance, metrics, and inference timing.
7. Harden authentication, secrets, permissions, and safe-by-default response simulation.
8. Add automated backend tests and a repeatable end-to-end demo.

## License

MIT License