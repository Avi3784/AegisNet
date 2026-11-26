"""Prepare the selected CICIDS2017 flow subset for AegisNet experiments."""
import logging
import os
import subprocess
import sys

import numpy as np
import pandas as pd

from src.config import DATA_RAW, DATA_PROCESSED, FEATURE_COLUMNS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def download_dataset():
    """Download the documented Kaggle dataset using a locally configured token."""
    if not os.getenv("KAGGLE_API_TOKEN"):
        raise RuntimeError(
            "Set KAGGLE_API_TOKEN in your environment using a newly generated Kaggle token."
        )
    DATA_RAW.mkdir(parents=True, exist_ok=True)
    slug = "shadman1028/cicids2017-official-flow-feature-csv-files"
    subprocess.run(
        [sys.executable, "-m", "kaggle", "datasets", "download", "-d", slug, "-p", str(DATA_RAW), "--unzip"],
        check=True,
    )


def clean_column_names(df):
    df.columns = df.columns.str.strip()
    rename_map = {
        "Destination Port": "destination_port",
        "Flow Duration": "flow_duration",
        "Total Fwd Packets": "total_fwd_packets",
        "Total Backward Packets": "total_bwd_packets",
        "Total Length of Fwd Packets": "total_fwd_bytes",
        "Total Length of Bwd Packets": "total_bwd_bytes",
        "Fwd Packet Length Max": "fwd_packet_length_max",
        "Fwd Packet Length Mean": "fwd_packet_length_mean",
        "Bwd Packet Length Max": "bwd_packet_length_max",
        "Bwd Packet Length Mean": "bwd_packet_length_mean",
        "Flow Bytes/s": "flow_bytes_per_sec",
        "Flow Byts/s": "flow_bytes_per_sec",
        "Flow Packets/s": "flow_packets_per_sec",
        "Flow IAT Mean": "flow_iat_mean",
        "Down/Up Ratio": "down_up_ratio",
        "SYN Flag Count": "syn_flag_count",
        "ACK Flag Count": "ack_flag_count",
        "FIN Flag Count": "fin_flag_count",
        "RST Flag Count": "rst_flag_count",
        "PSH Flag Count": "psh_flag_count",
        "Label": "label",
        "Timestamp": "timestamp",
    }
    return df.rename(columns=rename_map)


def prepare_dataset():
    if not list(DATA_RAW.glob("*.csv")):
        download_dataset()

    file_configs = [
        {"pattern": "*Tuesday*", "keep": ["BENIGN", "FTP-Patator", "SSH-Patator"]},
        {"pattern": "*Wednesday*", "keep": ["BENIGN", "DoS Hulk", "DoS GoldenEye", "DoS slowloris", "DoS Slowhttptest"]},
        {"pattern": "*Friday*", "keep": ["BENIGN", "PortScan"]},
    ]
    processed_frames = []

    for config in file_configs:
        matches = sorted(DATA_RAW.glob(config["pattern"] + ".csv"))
        if not matches:
            logger.warning("No files matched %s", config["pattern"])
            continue

        # Process every matching file; taking only matches[0] can silently omit
        # Friday PortScan or one of the Tuesday attack subsets.
        for file_path in matches:
            logger.info("Processing %s", file_path.name)
            df = pd.read_csv(file_path, encoding="cp1252", low_memory=False)
            df = clean_column_names(df)
            required = FEATURE_COLUMNS + ["label", "timestamp"]
            missing = [column for column in required if column not in df.columns]
            if missing:
                raise ValueError(f"{file_path.name} is missing required columns: {missing}")

            df["label"] = df["label"].astype(str).str.strip().replace({"BEGIN": "BENIGN"})
            df = df[df["label"].isin(config["keep"])].copy()
            if df.empty:
                logger.warning("No selected labels found in %s", file_path.name)
                continue

            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", dayfirst=False)
            for column in FEATURE_COLUMNS:
                df[column] = pd.to_numeric(df[column], errors="coerce")
            df = df[["timestamp"] + FEATURE_COLUMNS + ["label"]]
            processed_frames.append(df)

    if not processed_frames:
        raise ValueError("No selected CICIDS2017 rows were processed. Check filenames and label values.")

    full_df = pd.concat(processed_frames, ignore_index=True)
    full_df = full_df.replace([np.inf, -np.inf], np.nan)
    full_df = full_df.dropna(subset=["timestamp"] + FEATURE_COLUMNS)
    full_df = full_df.drop_duplicates().sort_values("timestamp", kind="stable").reset_index(drop=True)
    full_df["binary_label"] = (full_df["label"] != "BENIGN").astype(int)

    if full_df["binary_label"].nunique() < 2:
        raise ValueError("Prepared dataset must contain both BENIGN and attack rows.")

    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    output_path = DATA_PROCESSED / "full_df.csv"
    full_df.to_csv(output_path, index=False)
    logger.info("Saved %s rows to %s", len(full_df), output_path)
    logger.info("Class counts: %s", full_df["binary_label"].value_counts().to_dict())


if __name__ == "__main__":
    prepare_dataset()