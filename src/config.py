"""
AegisNet — Central configuration.

Loads environment variables from .env and defines the canonical 19-feature
schema shared by every module that touches flow data.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Paths ────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_RAW = PROJECT_ROOT / "data" / "raw"
DATA_PROCESSED = PROJECT_ROOT / "data" / "processed"
MODEL_DIR = PROJECT_ROOT / "models"
MODEL_BUNDLE = PROJECT_ROOT / "models" / "artifact_bundle"

# ── Environment ──────────────────────────────────────────────────────────
load_dotenv(PROJECT_ROOT / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

# ── Canonical 19-feature schema (Part B, rule 4) ────────────────────────
FEATURE_COLUMNS = [
    "destination_port",
    "flow_duration",
    "total_fwd_packets",
    "total_bwd_packets",
    "total_fwd_bytes",
    "total_bwd_bytes",
    "fwd_packet_length_max",
    "fwd_packet_length_mean",
    "bwd_packet_length_max",
    "bwd_packet_length_mean",
    "flow_bytes_per_sec",
    "flow_packets_per_sec",
    "flow_iat_mean",
    "down_up_ratio",
    "syn_flag_count",
    "ack_flag_count",
    "fin_flag_count",
    "rst_flag_count",
    "psh_flag_count",
]

# ── WebSocket message contract (Part B, rule 5) ─────────────────────────
WS_FLOW_TEMPLATE = {
    "type": "flow",
    "timestamp": 0,
    "flow": {
        "src_ip": "",
        "src_port": 0,
        "dst_ip": "",
        "dst_port": 0,
        "protocol": "",
        "flags": "",
        "prediction": 0,
    },
}

WS_THREAT_TEMPLATE = {
    "type": "threat",
    "timestamp": 0,
    "attack_type": "",
    "cognitive_report": {
        "Threat_Analysis": "",
        "Confidence_Validation": "",
        "Recommended_Mitigation": ["", ""],
    },
}

# ── Flow tracking ────────────────────────────────────────────────────────
FLOW_INACTIVITY_TIMEOUT_SEC = 120  # CICFlowMeter convention

# ── LLM throttling (Part B, rule 7) ─────────────────────────────────────
LLM_MIN_INTERVAL_SEC = 2.5  # max 1 call per 2.5s
LLM_REQUEST_TIMEOUT_SEC = 10.0
