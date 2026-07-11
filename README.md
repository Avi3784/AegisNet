# AegisNet — AI-Powered Network Intrusion Detection System

Real-time network intrusion detection combining deep packet inspection,
XGBoost classification, and LLM-powered cognitive threat analysis,
streamed to a live React dashboard.

## Architecture

```
Raw Packets → DPI Feature Extraction (19 features)
                    ↓
              XGBoost Classifier
                    ↓
         ┌─── Benign → log flow
         └─── Attack → Cognitive Engine (Groq / Gemini)
                              ↓
                     FastAPI WebSocket
                              ↓
                     React + Tailwind Dashboard
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Npcap (Windows) or libpcap-dev (Linux) — required by Scapy

### Setup

```bash
# Clone and enter
git clone <repo-url> aegisnet
cd aegisnet

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure API keys
copy .env.example .env       # Windows
# cp .env.example .env       # Linux/macOS
# Edit .env and add your Groq + Gemini API keys
```

### API Keys (free tier, no credit card)

1. **Groq**: Sign up at [console.groq.com](https://console.groq.com) → API Keys
2. **Gemini**: Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

## Project Structure

```
aegisnet/
├── data/
│   ├── raw/                  # Raw CICIDS2017 CSVs (not tracked)
│   └── processed/            # Extracted features (not tracked)
├── models/
│   └── artifact_bundle/      # Saved model + scaler + feature order
├── src/
│   ├── config.py             # Central configuration & feature schema
│   ├── dpi/                  # Deep Packet Inspection
│   ├── ml/                   # XGBoost training & preprocessing
│   ├── cognitive/            # LLM-based threat analysis
│   └── backend/              # FastAPI WebSocket server
├── frontend/                 # React + Tailwind dashboard
├── tests/                    # Pytest test suite
├── .env.example              # API key template
├── requirements.txt          # Python dependencies
└── README.md
```

## Feature Schema

The system extracts and classifies on 19 canonical flow features:

| # | Feature | Type |
|---|---------|------|
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

## Dataset

Training uses [CICIDS2017](https://www.unb.ca/cic/datasets/ids-2017.html),
a peer-reviewed academic benchmark for network intrusion detection.
Only the reduced three-attack-type subset (brute-force, DoS, PortScan) is
used — a deliberate simplification for a working, demoable prototype.

## License

MIT
