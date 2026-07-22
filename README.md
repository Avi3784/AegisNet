# AegisNet: Enterprise XDR & MLOps Platform

AegisNet is a comprehensive Extended Detection and Response (XDR) platform designed to simulate, detect, and autonomously neutralize advanced cyber threats in real-time. It combines traditional Machine Learning (XGBoost) with a cutting-edge Generative AI Cognitive Engine to provide defense-in-depth against both known attack signatures and novel zero-day behaviors.

## System Architecture

```text
Raw Packets → DPI Feature Extraction (19 features) → XGBoost Classifier
→ [Safe → Log] / [Attack → Cognitive Engine (Groq / Gemini)]
→ FastAPI WebSocket → React + Tailwind Dashboard
```

1. **Machine Learning Engine:** Ingests raw network flows and runs them through an XGBoost model pre-trained on the CIC-IDS-2017 dataset.
2. **Cognitive Engine:** If a flow is classified as an attack, it is routed to the LLM backend (Groq, with a failover to Gemini). The LLM analyzes the raw packet features, generates a human-readable incident report, and maps the behavior to the MITRE ATT&CK framework.
3. **Automated SOAR:** A natural-language Copilot acts as an autonomous agent, allowing security analysts to isolate endpoints or block IPs via simple chat commands.

---

## Machine Learning & Dataset Limitations

AegisNet utilizes the **CIC-IDS-2017** dataset. However, to bypass severe class imbalance and allow for real-time browser demonstration on standard hardware, the model is trained on a focused 3-class subset: **Brute-Force (Patator), DoS (Hulk, GoldenEye, Slowloris), and PortScan**. 

### Model Performance Metrics (Simulated Testing)
- **Accuracy:** 96.4%
- **Precision (Attack Class):** 94.2%
- **Recall (Attack Class):** 98.1%
- **F1 Score:** 96.1%

*Note: The system includes a live MLOps pipeline. Users can flag false positives/negatives in the dashboard to incrementally retrain the ensemble model on the fly, effectively building a custom dataset in real-time.*

---

## The AI Cognitive Engine

To prevent single-point-of-failure API limits during a live deployment, AegisNet utilizes a dual-LLM architecture:
1. **Primary Analysis (Groq):** Used for ultra-low latency inference. It parses the attack vectors into JSON action-intents.
2. **Fallback Analysis (Google Gemini):** If Groq hits a rate limit or times out, the system automatically seamlessly fails over to Gemini Flash.

The Cognitive engine explicitly maps zero-day anomalous behaviors to the MITRE ATT&CK matrix (e.g., *T1059 Command and Scripting Interpreter*), answering the crucial question: **"Why was this flagged?"** directly in the UI.

---

## Quickstart & Local Setup

### 1. Backend (FastAPI + ML)
```bash
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

# Run the API and WebSocket server
uvicorn src.backend.main:app --port 8000
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

*(Note: Vercel deployments require `VITE_API_URL` and `VITE_WS_URL` to point to your live backend).*

---

## Global Deployment (Hugging Face Spaces + Vercel)

AegisNet is fully Dockerized for immediate cloud deployment. 
1. **Backend:** Connect this repository to a **Hugging Face Space** (Docker environment). Hugging Face will automatically read the `Dockerfile`, install the massive XGBoost dependencies using their 16GB RAM free tier, and expose port 7860.
2. **Frontend:** Connect the `frontend` folder to **Vercel**, add the Hugging Face backend URL to the Environment Variables, and deploy.

---
## License
MIT License
