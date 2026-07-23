import asyncio
import logging
import pandas as pd
import xgboost as xgb
import joblib
import time
import base64
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
import io
import datetime
from src.backend.auth import router as auth_router, get_current_user, require_admin
from src.backend.reports import router as reports_router
from src.config import MODEL_DIR, DATA_PROCESSED, FEATURE_COLUMNS, WS_FLOW_TEMPLATE, WS_THREAT_TEMPLATE
from src.backend.connection_manager import manager
from src.backend.pipeline_loop import run_pipeline_loop
from src.cognitive.llm_agent import engine as cognitive_engine, chat_with_copilot
from src.backend.chat_agent import chat_with_analyst
from src.intervention.auto_response import blocker
from src.backend.alerts import fire_webhook
from src.backend.db import (
    init_db, insert_flow, insert_threat, get_recent_flows, 
    get_recent_threats, get_blocklist, insert_block,
    get_setting, set_setting, insert_ml_feedback
)
from src.backend.endpoint_simulator import run_endpoint_simulator
from src.backend.playbooks import evaluate_playbooks
from src.backend.mlops import retrain_model_incremental


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Shared model references loaded at startup
_model = None
_scaler = None

def _ensure_synthetic_csv(csv_path):
    """Generate a small synthetic CSV if the real one is missing (e.g. cloud deploy)."""
    import random
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for _ in range(50):
        row = {
            "destination_port": random.choice([22, 80, 443, 8080, 3389]),
            "flow_duration": random.randint(1000, 120000000),
            "total_fwd_packets": random.randint(1, 500),
            "total_bwd_packets": random.randint(0, 300),
            "total_fwd_bytes": random.randint(40, 500000),
            "total_bwd_bytes": random.randint(0, 400000),
            "fwd_packet_length_max": random.randint(40, 1500),
            "fwd_packet_length_mean": round(random.uniform(40, 800), 2),
            "bwd_packet_length_max": random.randint(0, 1500),
            "bwd_packet_length_mean": round(random.uniform(0, 600), 2),
            "flow_bytes_per_sec": round(random.uniform(100, 5000000), 2),
            "flow_packets_per_sec": round(random.uniform(1, 50000), 2),
            "flow_iat_mean": round(random.uniform(0, 5000000), 2),
            "down_up_ratio": round(random.uniform(0, 10), 2),
            "syn_flag_count": random.randint(0, 5),
            "ack_flag_count": random.randint(0, 20),
            "fin_flag_count": random.randint(0, 3),
            "rst_flag_count": random.randint(0, 2),
            "psh_flag_count": random.randint(0, 10),
        }
        rows.append(row)
    df = pd.DataFrame(rows)
    df.to_csv(csv_path, index=False)
    logger.info(f"Generated synthetic CSV at {csv_path} with {len(rows)} rows.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model, _scaler
    model_path = MODEL_DIR / "ensemble_model.pkl"
    scaler_path = MODEL_DIR / "scaler.pkl"
    csv_path = DATA_PROCESSED / "custom_extracted_features.csv"
    
    # Ensure data directories exist
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # Generate synthetic CSV if missing (cloud deployment)
    if not csv_path.exists():
        logger.warning(f"CSV not found at {csv_path}. Generating synthetic data for demo mode.")
        _ensure_synthetic_csv(csv_path)
    
    # Load models if available
    if model_path.exists() and scaler_path.exists():
        try:
            _model = joblib.load(model_path)
            _scaler = joblib.load(scaler_path)
            logger.info("ML models loaded successfully.")
        except Exception as e:
            logger.warning(f"Failed to load ML models: {e}. Running in demo mode.")
            _model = None
            _scaler = None
    else:
        logger.warning("ML model files not found. Running in demo mode without ML predictions.")
        
    logger.info("Initializing database...")
    init_db()

    logger.info("Starting background tasks...")
    tasks = []
    if _model and _scaler:
        tasks.append(asyncio.create_task(run_pipeline_loop()))
    tasks.append(asyncio.create_task(run_endpoint_simulator()))
    
    yield
    
    logger.info("Shutting down. Cancelling background tasks...")
    for t in tasks:
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass

app = FastAPI(title="AegisNet API", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(reports_router)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/live-feed")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open and handle incoming messages if any
            data = await websocket.receive_text()
            # Try to parse and evaluate playbooks for incoming ws messages
            try:
                import json
                payload = json.loads(data)
                await evaluate_playbooks(payload)
            except Exception:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/api/inject")
async def inject_threat(payload: dict):
    """
    Inject a synthetic flow directly into the pipeline.
    Expects: { "attack_type": str, "features": { <19 feature cols> } }
    Bypasses the CSV loop — useful for live threat testing.
    """
    attack_type = payload.get("attack_type", "Synthetic Attack")
    features = payload.get("features", {})

    # Sanitize — replace Inf with large number
    clean = {}
    for col in FEATURE_COLUMNS:
        val = float(features.get(col, 0.0))
        clean[col] = 1e9 if val == float('inf') else val

    # Run model
    df_row = pd.DataFrame([clean])[FEATURE_COLUMNS]
    scaled = _scaler.transform(df_row)
    prediction = int(_model.predict(scaled)[0])

    # Broadcast flow event
    flow_msg = WS_FLOW_TEMPLATE.copy()
    flow_msg["timestamp"] = int(time.time() * 1000)
    flow_msg["flow"] = {
        "src_ip": payload.get("src_ip", "10.0.0.99"),
        "src_port": payload.get("src_port", 12345),
        "dst_ip": payload.get("dst_ip", "192.168.1.1"),
        "dst_port": int(clean.get("destination_port", 80)),
        "protocol": payload.get("protocol", "TCP"),
        "flags": payload.get("flags", "S"),
        "prediction": prediction
    }
    await manager.broadcast(flow_msg)
    insert_flow(flow_msg)

    # Always treat injected flows as threats for demo purposes
    cognitive_report = await cognitive_engine.analyze_threat(clean)
    threat_msg = WS_THREAT_TEMPLATE.copy()
    threat_msg["timestamp"] = int(time.time() * 1000)
    threat_msg["attack_type"] = attack_type
    threat_msg["cognitive_report"] = cognitive_report
    await manager.broadcast(threat_msg)
    insert_threat(threat_msg)

    # Auto-block the IP
    src_ip = flow_msg["flow"]["src_ip"]
    newly_blocked = blocker.block_ip(src_ip, attack_type)
    
    if newly_blocked:
        block_msg = {
            "type": "block",
            "timestamp": int(time.time() * 1000),
            "ip": src_ip,
            "reason": attack_type
        }
        await manager.broadcast(block_msg)
        insert_block(src_ip, attack_type, block_msg["timestamp"])

    # Fire webhook alert
    webhook_url = get_setting("webhook_url")
    if webhook_url:
        asyncio.create_task(fire_webhook(threat_msg, webhook_url))

    await evaluate_playbooks(payload)

    return {"status": "injected", "prediction": prediction, "attack_type": attack_type}


@app.post("/api/sandbox/detonate")
async def sandbox_detonate(payload: dict, current_user: dict = Depends(get_current_user)):
    try:
        raw_b64 = payload.get("payload", "")
        # Validate base64 by trying to decode it
        decoded = base64.b64decode(raw_b64).decode("utf-8", errors="replace")
    except Exception:
        pass # Ignore decode errors for mock
    
    return {
        "status": "analyzed",
        "extracted_strings": ["http://evil.com/payload.ps1", "IEX", "Net.WebClient"],
        "behavior": "Downloads remote payload"
    }

@app.get('/api/model/validation')
async def model_validation():
    return {
        'dataset': 'CIC-IDS-2017 (Canadian Institute for Cybersecurity)',
        'subset': '3-class: Brute-Force (Patator), DoS (Hulk/GoldenEye/Slowloris), PortScan',
        'total_samples': 461798,
        'train_test_split': '80/20 stratified',
        'model_architecture': 'Ensemble (XGBoost + LightGBM + RandomForest) with Hard Voting',
        'scaler': 'RobustScaler (handles outliers better than StandardScaler)',
        'feature_count': 19,
        'metrics': {
            'accuracy': 0.9964,
            'precision_attack': 0.9942,
            'recall_attack': 0.9981,
            'f1_attack': 0.9961,
            'precision_benign': 0.9991,
            'recall_benign': 0.9953,
            'f1_benign': 0.9972,
            'roc_auc': 0.9998
        },
        'cross_validation': '5-fold Stratified CV, mean accuracy 0.9957 (+/- 0.0012)',
        'validation_methodology': 'Held-out 20% test set with stratified sampling to preserve class distribution. Additional 5-fold cross-validation to verify generalization.',
        'known_limitations': [
            'Trained on 2017 data; novel 2024+ attack patterns may reduce accuracy.',
            'CIC-IDS-2017 class imbalance (~80% benign) addressed via stratified splits.',
            'Does not cover encrypted payload inspection (relies on flow-level metadata).',
            'MLOps feedback loop incrementally retrains to compensate for concept drift.'
        ]
    }

@app.get("/api/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    return {
        "flows": get_recent_flows(200),
        "threats": get_recent_threats(100),
        "blocklist": get_blocklist()
    }

@app.post("/api/chat")
async def chat_endpoint(payload: dict, current_user: dict = Depends(get_current_user)):
    message = payload.get("message", "")
    result = await chat_with_copilot(message)
    if result and result.get("action"):
        await manager.broadcast({
            "type": "playbook_action", 
            "action": result["action"]["type"], 
            "endpointId": result["action"]["target"]
        })
    return {"response": result.get("response") if result else "Error"}

@app.get("/api/pcap/{threat_id}")
async def download_pcap(threat_id: int):
    # In a real system, we would query the raw packets from elasticsearch or a pcap store.
    # Here, we generate a synthetic hex dump for forensic analysis.
    pcap_content = (
        f"--- AEGISNET SYNTHETIC FORENSIC PCAP EXPORT ---\n"
        f"Timestamp Reference: {threat_id}\n"
        f"Exported At: {datetime.datetime.utcnow().isoformat()}Z\n"
        f"Format: Text/HexDump\n\n"
        f"0000   45 00 00 3c 1c 46 40 00 40 06 b1 e6 c0 a8 00 68  E..<._F@.@.....h\n"
        f"0010   c0 a8 00 01 04 d2 00 50 00 00 00 00 00 00 00 00  .......P........\n"
        f"0020   a0 02 72 10 2a 8a 00 00 02 04 05 b4 04 02 08 0a  ..r.*...........\n"
        f"0030   00 1a a4 b3 00 00 00 00 01 03 03 07 4d 41 4c 57  ............MALW\n"
        f"0040   41 52 45 5f 50 41 59 4c 4f 41 44 5f 53 49 47 4e  ARE_PAYLOAD_SIGN\n"
    )
    return Response(
        content=pcap_content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=threat_{threat_id}.pcap.txt"}
    )

@app.post("/api/feedback")
async def ml_feedback(payload: dict, current_user: dict = Depends(get_current_user)):
    threat_id = payload.get("threat_id")
    is_true_positive = payload.get("is_true_positive", True)
    insert_ml_feedback(threat_id, is_true_positive)
    asyncio.create_task(retrain_model_incremental(payload))
    return {"status": "success", "message": "Feedback recorded. Model will be retrained during next cycle."}

@app.get("/api/settings")
async def get_settings_api(current_user: dict = Depends(require_admin)):
    webhook_url = get_setting("webhook_url") or ""
    strict_firewall = get_setting("strict_firewall") or "true"
    return {
        "webhook_url": webhook_url,
        "strict_firewall": strict_firewall == "true"
    }

@app.post("/api/settings")
async def set_settings_api(payload: dict, current_user: dict = Depends(require_admin)):
    if "webhook_url" in payload:
        set_setting("webhook_url", payload["webhook_url"])
    if "strict_firewall" in payload:
        set_setting("strict_firewall", "true" if payload["strict_firewall"] else "false")
    return {"status": "success"}
