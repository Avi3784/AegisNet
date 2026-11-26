import asyncio
import csv
import time
import random
import logging

import joblib
import pandas as pd

from src.config import DATA_PROCESSED, MODEL_DIR, FEATURE_COLUMNS, WS_FLOW_TEMPLATE, WS_THREAT_TEMPLATE
from src.backend.connection_manager import manager
from src.cognitive.llm_agent import engine as cognitive_engine
from src.intervention.auto_response import blocker
from src.backend.db import insert_flow, insert_threat, insert_block

logger = logging.getLogger(__name__)


async def run_pipeline_loop():
    """Replay prepared flow features and emit model-backed events.

    The prepared CSV has no endpoint identifiers. Addresses below are
    documentation-only placeholders, not captured network endpoints.
    """
    logger.info("Pipeline loop started.")
    csv_path = DATA_PROCESSED / "custom_extracted_features.csv"
    model_path = MODEL_DIR / "ensemble_model.pkl"
    scaler_path = MODEL_DIR / "scaler.pkl"

    try:
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
    except Exception as exc:
        logger.error("Failed to load models in pipeline loop: %s", exc)
        return

    while True:
        try:
            with open(csv_path, "r", newline="") as handle:
                for row in csv.DictReader(handle):
                    await asyncio.sleep(5)
                    features = {}
                    for col in FEATURE_COLUMNS:
                        value = float(row[col])
                        if pd.isna(value):
                            raise ValueError(f"Missing required feature: {col}")
                        if value == float("inf"):
                            value = 1e9
                        elif value == float("-inf"):
                            value = -1e9
                        features[col] = value

                    frame = pd.DataFrame([features], columns=FEATURE_COLUMNS)
                    scaled = scaler.transform(frame)
                    prediction = int(model.predict(scaled)[0])

                    # Documentation IP ranges identify these as demo placeholders.
                    flow_msg = WS_FLOW_TEMPLATE.copy()
                    flow_msg["timestamp"] = int(time.time() * 1000)
                    flow_msg["flow"] = {
                        "src_ip": f"198.51.100.{random.randint(1, 254)}",
                        "src_port": random.randint(1024, 65535),
                        "dst_ip": "192.0.2.10",
                        "dst_port": int(features.get("destination_port", 0)),
                        "protocol": "TCP",
                        "flags": "S" if features.get("syn_flag_count", 0) > 0 else "A",
                        "prediction": prediction,
                        "source": "dataset_replay",
                    }
                    await manager.broadcast(flow_msg)
                    insert_flow(flow_msg)

                    if prediction == 1:
                        report = await cognitive_engine.analyze_threat(features)
                        threat_msg = WS_THREAT_TEMPLATE.copy()
                        threat_msg["timestamp"] = int(time.time() * 1000)
                        threat_msg["attack_type"] = "Suspicious flow (binary model output; subtype not inferred)"
                        threat_msg["cognitive_report"] = report
                        threat_msg["source"] = "dataset_replay"
                        await manager.broadcast(threat_msg)
                        insert_threat(threat_msg)

                        # Record a simulated response; no real firewall is modified.
                        src_ip = flow_msg["flow"]["src_ip"]
                        reason = threat_msg["attack_type"]
                        if blocker.block_ip(src_ip, reason):
                            block_msg = {
                                "type": "block",
                                "timestamp": int(time.time() * 1000),
                                "ip": src_ip,
                                "reason": reason,
                                "mode": "simulation",
                            }
                            await manager.broadcast(block_msg)
                            insert_block(src_ip, reason, block_msg["timestamp"])
        except FileNotFoundError:
            logger.error("Feature CSV not found at %s; stopping replay.", csv_path)
            break
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Error in pipeline replay loop.")
            await asyncio.sleep(5)