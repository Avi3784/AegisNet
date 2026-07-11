import os
from pathlib import Path
from src.dpi.feature_extractor import extract_features
from src.config import DATA_PROCESSED
import csv

def test_feature_extraction():
    pcap_path = Path("tests/test_traffic.pcap")
    output_csv = DATA_PROCESSED / "test_features.csv"
    
    # Run extraction
    num_flows = extract_features(pcap_path, output_csv)
    
    # Assert exactly 4 flows produced
    assert num_flows == 4, f"Expected 4 flows, got {num_flows}"
    
    # Read the features
    flows = []
    with open(output_csv, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            flows.append(row)
            
    assert len(flows) == 4, "CSV should contain exactly 4 rows"
    
    # Find Flow B (40 SYN packets)
    # destination_port is 443
    flow_b = next(f for f in flows if f['destination_port'] == '443')
    assert int(flow_b['total_fwd_packets']) == 40
    assert int(flow_b['syn_flag_count']) == 40
    
    # Cleanup
    if output_csv.exists():
        output_csv.unlink()
