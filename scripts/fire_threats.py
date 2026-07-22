"""
fire_threats.py — Fires 5 synthetic attack flows at AegisNet backend.
Each attack has crafted feature values that mimic real CICIDS2017 attack traffic.

Run from the aegis root:
    python scripts/fire_threats.py
"""

import time
import httpx

API_URL = "http://127.0.0.1:8000/api/inject"

ATTACKS = [
    {
        "attack_type": "ATM Service Disruption",
        "src_ip": "10.0.0.51", "dst_ip": "192.168.1.100",
        "src_port": 54321, "protocol": "TCP", "flags": "SA",
        "features": {
            "destination_port": 80,
            "flow_duration": 5000,
            "total_fwd_packets": 5000,
            "total_bwd_packets": 1,
            "total_fwd_bytes": 250000,
            "total_bwd_bytes": 40,
            "fwd_packet_length_max": 50,
            "fwd_packet_length_mean": 50.0,
            "bwd_packet_length_max": 40,
            "bwd_packet_length_mean": 40.0,
            "flow_bytes_per_sec": 50000000.0,
            "flow_packets_per_sec": 1000000.0,
            "flow_iat_mean": 1.0,
            "down_up_ratio": 0.0,
            "syn_flag_count": 5000,
            "ack_flag_count": 1,
            "fin_flag_count": 0,
            "rst_flag_count": 0,
            "psh_flag_count": 0,
        }
    },
    {
        "attack_type": "ATM Port Reconnaissance",
        "src_ip": "10.0.0.88", "dst_ip": "192.168.1.5",
        "src_port": 1337, "protocol": "TCP", "flags": "S",
        "features": {
            "destination_port": 22,
            "flow_duration": 200000,
            "total_fwd_packets": 1,
            "total_bwd_packets": 0,
            "total_fwd_bytes": 40,
            "total_bwd_bytes": 0,
            "fwd_packet_length_max": 40,
            "fwd_packet_length_mean": 40.0,
            "bwd_packet_length_max": 0,
            "bwd_packet_length_mean": 0.0,
            "flow_bytes_per_sec": 200.0,
            "flow_packets_per_sec": 5.0,
            "flow_iat_mean": 200000.0,
            "down_up_ratio": 0.0,
            "syn_flag_count": 1,
            "ack_flag_count": 0,
            "fin_flag_count": 0,
            "rst_flag_count": 0,
            "psh_flag_count": 0,
        }
    },
    {
        "attack_type": "PIN/Auth Brute Force",
        "src_ip": "172.16.0.10", "dst_ip": "192.168.1.20",
        "src_port": 50001, "protocol": "TCP", "flags": "PA",
        "features": {
            "destination_port": 21,
            "flow_duration": 300000,
            "total_fwd_packets": 100,
            "total_bwd_packets": 100,
            "total_fwd_bytes": 5000,
            "total_bwd_bytes": 8000,
            "fwd_packet_length_max": 50,
            "fwd_packet_length_mean": 50.0,
            "bwd_packet_length_max": 80,
            "bwd_packet_length_mean": 80.0,
            "flow_bytes_per_sec": 43333.0,
            "flow_packets_per_sec": 666.0,
            "flow_iat_mean": 3000.0,
            "down_up_ratio": 1.6,
            "syn_flag_count": 1,
            "ack_flag_count": 100,
            "fin_flag_count": 0,
            "rst_flag_count": 0,
            "psh_flag_count": 100,
        }
    },
    {
        "attack_type": "ATM Malware C2 Communication",
        "src_ip": "10.0.0.77", "dst_ip": "203.0.113.10",
        "src_port": 49999, "protocol": "TCP", "flags": "PA",
        "features": {
            "destination_port": 443,
            "flow_duration": 120000000,
            "total_fwd_packets": 20,
            "total_bwd_packets": 20,
            "total_fwd_bytes": 1200,
            "total_bwd_bytes": 1200,
            "fwd_packet_length_max": 60,
            "fwd_packet_length_mean": 60.0,
            "bwd_packet_length_max": 60,
            "bwd_packet_length_mean": 60.0,
            "flow_bytes_per_sec": 20.0,
            "flow_packets_per_sec": 0.33,
            "flow_iat_mean": 6000000.0,
            "down_up_ratio": 1.0,
            "syn_flag_count": 1,
            "ack_flag_count": 20,
            "fin_flag_count": 0,
            "rst_flag_count": 0,
            "psh_flag_count": 15,
        }
    },
    {
        "attack_type": "ATM Web Interface Attack",
        "src_ip": "192.168.1.199", "dst_ip": "10.0.0.1",
        "src_port": 55555, "protocol": "TCP", "flags": "PA",
        "features": {
            "destination_port": 80,
            "flow_duration": 450000,
            "total_fwd_packets": 10,
            "total_bwd_packets": 10,
            "total_fwd_bytes": 3000,
            "total_bwd_bytes": 15000,
            "fwd_packet_length_max": 300,
            "fwd_packet_length_mean": 300.0,
            "bwd_packet_length_max": 1500,
            "bwd_packet_length_mean": 1500.0,
            "flow_bytes_per_sec": 40000.0,
            "flow_packets_per_sec": 44.4,
            "flow_iat_mean": 45000.0,
            "down_up_ratio": 5.0,
            "syn_flag_count": 1,
            "ack_flag_count": 10,
            "fin_flag_count": 1,
            "rst_flag_count": 0,
            "psh_flag_count": 10,
        }
    },
]


def fire():
    print("\nAegisNet Threat Injector\n" + "="*40)
    for attack in ATTACKS:
        label = attack["attack_type"]
        print(f"\n[→] Firing: {label}  ({attack['src_ip']} → {attack['dst_ip']}:{int(attack['features']['destination_port'])})")
        try:
            resp = httpx.post(API_URL, json=attack, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
            verdict = "[ATTACK]" if data["prediction"] == 1 else "[NORMAL]"
            print(f"    Model Verdict : {verdict}")
            print(f"    LLM Engaged   : Yes -- check the dashboard!")
        except Exception as e:
            print(f"    ERROR: {e}")
        
        time.sleep(4)   # Wait 4s between attacks (respects LLM rate limit of 2.5s)

    print("\n" + "="*40)
    print("All attacks fired! Check http://localhost:5174")


if __name__ == "__main__":
    fire()
