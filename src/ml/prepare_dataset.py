import os
import subprocess
import glob
import pandas as pd
import numpy as np
from pathlib import Path
from src.config import DATA_RAW, DATA_PROCESSED, FEATURE_COLUMNS
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_dataset():
    logger.info("Searching Kaggle for cicids2017...")
    os.environ['KAGGLE_API_TOKEN'] = "KGAT_48ac2e2d7008dec21a5ff7a8d0f3237c" # Temporary just to be safe
    import sys
    try:
        slug = 'shadman1028/cicids2017-official-flow-feature-csv-files'
            
        logger.info(f"Selected dataset: {slug}")
        logger.info("Downloading dataset (this may take a while)...")
        subprocess.run([sys.executable, "-m", "kaggle", "datasets", "download", "-d", slug, "-p", str(DATA_RAW), "--unzip"], check=True)
        logger.info("Download and unzip complete.")
    except Exception as e:
        logger.error("Kaggle download failed. If you downloaded manually, place files in data/raw/")
        raise e

def clean_column_names(df):
    # Strip whitespace
    df.columns = df.columns.str.strip()
    
    # Rename known variants to canonical schema
    rename_map = {
        'Destination Port': 'destination_port',
        'Flow Duration': 'flow_duration',
        'Total Fwd Packets': 'total_fwd_packets',
        'Total Backward Packets': 'total_bwd_packets',
        'Total Length of Fwd Packets': 'total_fwd_bytes',
        'Total Length of Bwd Packets': 'total_bwd_bytes',
        'Fwd Packet Length Max': 'fwd_packet_length_max',
        'Fwd Packet Length Mean': 'fwd_packet_length_mean',
        'Bwd Packet Length Max': 'bwd_packet_length_max',
        'Bwd Packet Length Mean': 'bwd_packet_length_mean',
        'Flow Bytes/s': 'flow_bytes_per_sec',
        'Flow Byts/s': 'flow_bytes_per_sec',
        'Flow Packets/s': 'flow_packets_per_sec',
        'Flow IAT Mean': 'flow_iat_mean',
        'Down/Up Ratio': 'down_up_ratio',
        'SYN Flag Count': 'syn_flag_count',
        'ACK Flag Count': 'ack_flag_count',
        'FIN Flag Count': 'fin_flag_count',
        'RST Flag Count': 'rst_flag_count',
        'PSH Flag Count': 'psh_flag_count',
        'Label': 'label'
    }
    df = df.rename(columns=rename_map)
    return df

def prepare_dataset():
    if not list(DATA_RAW.glob("*.csv")):
        download_dataset()

    dfs = []
    
    # Process files
    file_configs = [
        {"pattern": "*Tuesday*", "keep": ["BEGIN", "FTP-Patator", "SSH-Patator"]},
        {"pattern": "*Wednesday*", "keep": ["BEGIN", "DoS Hulk", "DoS GoldenEye", "DoS slowloris", "DoS Slowhttptest"]},
        {"pattern": "*Friday*", "keep": ["BEGIN", "PortScan"]}
    ]
    
    for config in file_configs:
        matches = list(DATA_RAW.glob(config["pattern"] + ".csv"))
        if not matches:
            logger.warning(f"No files matching {config['pattern']} found.")
            continue
            
        file_path = matches[0]
        logger.info(f"Processing {file_path.name}...")
        try:
            df = pd.read_csv(file_path, encoding="cp1252", low_memory=False)
        except Exception as e:
            logger.error(f"Failed to read {file_path.name}: {e}")
            continue
            
        df = clean_column_names(df)
        
        # Check if all required columns are present
        missing = [c for c in FEATURE_COLUMNS + ['label'] if c not in df.columns]
        if missing:
            raise ValueError(f"File {file_path.name} is missing expected columns: {missing}. Available columns: {list(df.columns)}")
            
        # Filter labels
        df = df[df['label'].isin(config["keep"])]
        
        if len(df) == 0:
            logger.error(f"File {file_path.name} produced 0 rows after label filtering.")
            return
            
        # Select features + label
        df = df[FEATURE_COLUMNS + ['label']]
        dfs.append(df)
        
    if not dfs:
        raise ValueError("No data processed successfully.")
        
    full_df = pd.concat(dfs, ignore_index=True)
    
    # Replace Inf with finite max per column
    for col in ['flow_bytes_per_sec', 'flow_packets_per_sec']:
        if col in full_df.columns:
            m = full_df.loc[full_df[col] != np.inf, col].max()
            full_df[col] = full_df[col].replace(np.inf, m)
            
    # Drop true NaNs and exact duplicates
    full_df = full_df.dropna()
    full_df = full_df.drop_duplicates()
    
    # Create binary label (0=BEGIN, 1=Attack)
    full_df['binary_label'] = (full_df['label'] != 'BEGIN').astype(int)
    
    print(f"full_df.shape: {full_df.shape}")
    print("full_df['binary_label'].value_counts():")
    print(full_df['binary_label'].value_counts())
    
    # Save processed dataframe for Module 3
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    output_path = DATA_PROCESSED / "full_df.csv"
    full_df.to_csv(output_path, index=False)
    logger.info(f"Saved cleaned dataset to {output_path}")

if __name__ == "__main__":
    prepare_dataset()
