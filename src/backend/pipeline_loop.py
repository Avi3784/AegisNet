import asyncio
import csv
import time
import logging
import pandas as pd
import xgboost as xgb
import joblib
from src.config import DATA_PROCESSED, MODEL_DIR, FEATURE_COLUMNS, WS_FLOW_TEMPLATE, WS_THREAT_TEMPLATE
from src.backend.connection_manager import manager
from src.cognitive.llm_agent import engine as cognitive_engine

logger = logging.getLogger(__name__)

async def run_pipeline_loop():
    logger.info("Pipeline loop started.")
    
    csv_path = DATA_PROCESSED / "custom_extracted_features.csv"
    model_path = MODEL_DIR / "aegis_xgb.json"
    scaler_path = MODEL_DIR / "scaler.pkl"
    
    # Load models
    try:
        model = xgb.XGBClassifier()
        model.load_model(model_path)
        scaler = joblib.load(scaler_path)
    except Exception as e:
        logger.error(f"Failed to load models in pipeline loop: {e}")
        return

    while True:
        try:
            with open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Delay 0.5s to 0.75s to simulate real-time traffic
                    await asyncio.sleep(0.5)
                    
                    # Ensure we have all columns and replace Inf
                    features = {}
                    for col in FEATURE_COLUMNS:
                        val = float(row[col])
                        if val == float('inf'):
                            val = 1e9
                        features[col] = val
                        
                    # Prepare for prediction
                    df_row = pd.DataFrame([features])[FEATURE_COLUMNS]
                    scaled_row = scaler.transform(df_row)
                    
                    prediction = int(model.predict(scaled_row)[0])
                    
                    # Prepare WS flow message
                    flow_msg = WS_FLOW_TEMPLATE.copy()
                    flow_msg["timestamp"] = int(time.time() * 1000)
                    flow_msg["flow"] = {
                        "src_ip": "10.0.0.1", # Dummy IP since it's not in the 19 features
                        "src_port": 10000,
                        "dst_ip": "10.0.0.2",
                        "dst_port": int(features.get("destination_port", 0)),
                        "protocol": "TCP",
                        "flags": "S" if features.get("syn_flag_count", 0) > 0 else "A",
                        "prediction": prediction
                    }
                    
                    await manager.broadcast(flow_msg)
                    
                    if prediction == 1:
                        logger.warning("Threat detected! Engaging Cognitive Engine...")
                        # Run cognitive engine
                        report = await cognitive_engine.analyze_threat(features)
                        
                        threat_msg = WS_THREAT_TEMPLATE.copy()
                        threat_msg["timestamp"] = int(time.time() * 1000)
                        threat_msg["attack_type"] = "Unknown / Suspicious Flow"
                        threat_msg["cognitive_report"] = report
                        
                        await manager.broadcast(threat_msg)
                        
        except FileNotFoundError:
            logger.error(f"CSV not found at {csv_path}. Pipeline loop cannot continue.")
            break
        except Exception as e:
            logger.error(f"Error in pipeline loop: {e}")
            await asyncio.sleep(5)
