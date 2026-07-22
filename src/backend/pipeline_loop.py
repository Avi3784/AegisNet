import asyncio
import csv
import time
import random
import logging
import pandas as pd
import xgboost as xgb
import joblib
from src.config import DATA_PROCESSED, MODEL_DIR, FEATURE_COLUMNS, WS_FLOW_TEMPLATE, WS_THREAT_TEMPLATE
from src.backend.connection_manager import manager
from src.cognitive.llm_agent import engine as cognitive_engine
from src.intervention.auto_response import blocker
from src.backend.db import insert_flow, insert_threat, insert_block

APT_IPS = {"192.168.1.50": "Lazarus Group", "10.0.0.99": "Cozy Bear"}

logger = logging.getLogger(__name__)

async def run_pipeline_loop():
    logger.info("Pipeline loop started.")
    
    csv_path = DATA_PROCESSED / "custom_extracted_features.csv"
    model_path = MODEL_DIR / "ensemble_model.pkl"
    scaler_path = MODEL_DIR / "scaler.pkl"
    
    # Load models
    try:
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
    except Exception as e:
        logger.error(f"Failed to load models in pipeline loop: {e}")
        return

    while True:
        try:
            with open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Delay 5 seconds to simulate real-time traffic
                    await asyncio.sleep(5)
                    
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
                    # Generate a plausible public IP
                    if random.random() < 0.1:
                        random_ip = random.choice(list(APT_IPS.keys()))
                    else:
                        random_ip = f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
                    
                    if random_ip in APT_IPS:
                        prediction = 1
                    
                    flow_msg = WS_FLOW_TEMPLATE.copy()
                    flow_msg["timestamp"] = int(time.time() * 1000)
                    flow_msg["flow"] = {
                        "src_ip": random_ip, 
                        "src_port": random.randint(1024, 65535),
                        "dst_ip": "10.0.0.2",
                        "dst_port": int(features.get("destination_port", 0)),
                        "protocol": "TCP",
                        "flags": "S" if features.get("syn_flag_count", 0) > 0 else "A",
                        "prediction": prediction
                    }
                    
                    await manager.broadcast(flow_msg)
                    insert_flow(flow_msg)
                    
                    if prediction == 1:
                        logger.warning("Threat detected! Engaging Cognitive Engine...")
                        # Run cognitive engine
                        report = await cognitive_engine.analyze_threat(features)
                        
                        attack_types = ["DDoS Amplification", "SYN Flood", "Port Scan", "Brute Force", "Data Exfiltration", "Zero-Day Anomaly"]
                        assigned_attack = random.choice(attack_types)
                        
                        if random_ip in APT_IPS:
                            assigned_attack += " [OSINT: APT DETECTED]"
                        
                        threat_msg = WS_THREAT_TEMPLATE.copy()
                        threat_msg["timestamp"] = int(time.time() * 1000)
                        threat_msg["attack_type"] = assigned_attack
                        threat_msg["cognitive_report"] = report
                        
                        await manager.broadcast(threat_msg)
                        insert_threat(threat_msg)
                        
                        # Auto-block the IP
                        src_ip = flow_msg["flow"]["src_ip"]
                        attack_type = threat_msg["attack_type"]
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
                        
        except FileNotFoundError:
            logger.error(f"CSV not found at {csv_path}. Pipeline loop cannot continue.")
            break
        except Exception as e:
            logger.error(f"Error in pipeline loop: {e}")
            await asyncio.sleep(5)
