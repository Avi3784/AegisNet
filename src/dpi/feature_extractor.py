import csv
import logging
from scapy.all import PcapReader
from src.config import DATA_PROCESSED, FEATURE_COLUMNS
from src.dpi.flow_tracker import FlowTracker

logger = logging.getLogger(__name__)

def extract_features(pcap_path, output_csv=None):
    if output_csv is None:
        output_csv = DATA_PROCESSED / "custom_extracted_features.csv"
        
    tracker = FlowTracker()
    
    try:
        with PcapReader(str(pcap_path)) as reader:
            for pkt in reader:
                try:
                    timestamp = float(pkt.time)
                    tracker.process_packet(pkt, timestamp)
                except Exception as e:
                    logger.debug(f"Skipping packet due to error: {e}")
    except Exception as e:
        raise ValueError(f"Failed to process pcap {pcap_path}: file may be corrupt or missing. Original error: {e}")
        
    # Crucial step: flush all open flows at EOF
    tracker.flush_all()
    
    features = tracker.get_features()
    
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with open(output_csv, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FEATURE_COLUMNS)
        writer.writeheader()
        writer.writerows(features)
        
    return len(features)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        extract_features(sys.argv[1])
    else:
        print("Usage: python feature_extractor.py <pcap_file>")
