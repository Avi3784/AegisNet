import time
import httpx
import random
import copy

API_URL = "http://127.0.0.1:8000/api/inject"

# Global IP ranges to simulate worldwide attacks
COUNTRY_IP_POOLS = {
    "Russia": ["46.17.40.", "46.45.132.", "94.25.128.", "176.59.0.", "188.134.0."],
    "China": ["114.114.114.", "1.1.1.", "1.2.3.", "42.120.0.", "61.128.0.", "106.120.0."],
    "Brazil": ["177.100.0.", "189.10.0.", "200.20.0.", "138.118.0."],
    "USA": ["198.51.100.", "203.0.113.", "104.16.0.", "74.125.0.", "172.217.0."],
    "North Korea": ["175.45.176.", "175.45.177.", "175.45.178.", "175.45.179."],
    "Germany": ["85.214.0.", "88.198.0.", "144.76.0.", "195.201.0."]
}

# Base profiles for the 5 ATM attack types
BASE_ATTACKS = [
    {
        "attack_type": "ATM Service Disruption",
        "src_port": 54321, "protocol": "TCP", "flags": "SA",
        "features": {
            "destination_port": 80, "flow_duration": 5000, "total_fwd_packets": 5000,
            "total_bwd_packets": 1, "total_fwd_bytes": 250000, "total_bwd_bytes": 40,
            "fwd_packet_length_max": 50, "fwd_packet_length_mean": 50.0,
            "bwd_packet_length_max": 40, "bwd_packet_length_mean": 40.0,
            "flow_bytes_per_sec": 50000000.0, "flow_packets_per_sec": 1000000.0,
            "flow_iat_mean": 1.0, "down_up_ratio": 0.0, "syn_flag_count": 5000,
            "ack_flag_count": 1, "fin_flag_count": 0, "rst_flag_count": 0, "psh_flag_count": 0,
        }
    },
    {
        "attack_type": "ATM Port Reconnaissance",
        "src_port": 1337, "protocol": "TCP", "flags": "S",
        "features": {
            "destination_port": 22, "flow_duration": 200000, "total_fwd_packets": 1,
            "total_bwd_packets": 0, "total_fwd_bytes": 40, "total_bwd_bytes": 0,
            "fwd_packet_length_max": 40, "fwd_packet_length_mean": 40.0,
            "bwd_packet_length_max": 0, "bwd_packet_length_mean": 0.0,
            "flow_bytes_per_sec": 200.0, "flow_packets_per_sec": 5.0,
            "flow_iat_mean": 200000.0, "down_up_ratio": 0.0, "syn_flag_count": 1,
            "ack_flag_count": 0, "fin_flag_count": 0, "rst_flag_count": 0, "psh_flag_count": 0,
        }
    },
    {
        "attack_type": "PIN/Auth Brute Force",
        "src_port": 50001, "protocol": "TCP", "flags": "PA",
        "features": {
            "destination_port": 21, "flow_duration": 300000, "total_fwd_packets": 100,
            "total_bwd_packets": 100, "total_fwd_bytes": 5000, "total_bwd_bytes": 8000,
            "fwd_packet_length_max": 50, "fwd_packet_length_mean": 50.0,
            "bwd_packet_length_max": 80, "bwd_packet_length_mean": 80.0,
            "flow_bytes_per_sec": 43333.0, "flow_packets_per_sec": 666.0,
            "flow_iat_mean": 3000.0, "down_up_ratio": 1.6, "syn_flag_count": 1,
            "ack_flag_count": 100, "fin_flag_count": 0, "rst_flag_count": 0, "psh_flag_count": 100,
        }
    },
    {
        "attack_type": "ATM Malware C2 Communication",
        "src_port": 49999, "protocol": "TCP", "flags": "PA",
        "features": {
            "destination_port": 443, "flow_duration": 120000000, "total_fwd_packets": 20,
            "total_bwd_packets": 20, "total_fwd_bytes": 1200, "total_bwd_bytes": 1200,
            "fwd_packet_length_max": 60, "fwd_packet_length_mean": 60.0,
            "bwd_packet_length_max": 60, "bwd_packet_length_mean": 60.0,
            "flow_bytes_per_sec": 20.0, "flow_packets_per_sec": 0.33,
            "flow_iat_mean": 6000000.0, "down_up_ratio": 1.0, "syn_flag_count": 1,
            "ack_flag_count": 20, "fin_flag_count": 0, "rst_flag_count": 0, "psh_flag_count": 15,
        }
    },
    {
        "attack_type": "ATM Web Interface Attack",
        "src_port": 55555, "protocol": "TCP", "flags": "PA",
        "features": {
            "destination_port": 80, "flow_duration": 450000, "total_fwd_packets": 10,
            "total_bwd_packets": 10, "total_fwd_bytes": 3000, "total_bwd_bytes": 15000,
            "fwd_packet_length_max": 300, "fwd_packet_length_mean": 300.0,
            "bwd_packet_length_max": 1500, "bwd_packet_length_mean": 1500.0,
            "flow_bytes_per_sec": 40000.0, "flow_packets_per_sec": 44.4,
            "flow_iat_mean": 45000.0, "down_up_ratio": 5.0, "syn_flag_count": 1,
            "ack_flag_count": 10, "fin_flag_count": 1, "rst_flag_count": 0, "psh_flag_count": 10,
        }
    }
]

def generate_random_ip():
    country = random.choice(list(COUNTRY_IP_POOLS.keys()))
    prefix = random.choice(COUNTRY_IP_POOLS[country])
    ip = prefix + str(random.randint(1, 254))
    return ip, country

def generate_threat():
    base = copy.deepcopy(random.choice(BASE_ATTACKS))
    src_ip, country = generate_random_ip()
    base["src_ip"] = src_ip
    base["dst_ip"] = f"192.168.1.{random.randint(10, 50)}"  # Internal ATM network
    
    # Slight randomization so they aren't completely identical
    base["features"]["flow_duration"] += random.randint(-1000, 1000)
    base["src_port"] = random.randint(1024, 65535)
    
    return base, country

def fire_continuous(count=30, delay=1.0):
    print(f"\n[GLOBAL THREAT INJECTOR] Firing {count} randomized global threats...\n" + "="*50)
    
    with httpx.Client() as client:
        for i in range(count):
            attack, country = generate_threat()
            label = attack["attack_type"]
            
            print(f"[{i+1}/{count}] Firing {label}")
            print(f"      Source : {attack['src_ip']} ({country})")
            print(f"      Target : {attack['dst_ip']}:{attack['features']['destination_port']}")
            
            try:
                resp = client.post(API_URL, json=attack, timeout=10.0)
                resp.raise_for_status()
                data = resp.json()
                verdict = "[ATTACK]" if data["prediction"] == 1 else "[NORMAL]"
                print(f"      Verdict: {verdict}\n")
            except Exception as e:
                print(f"      ERROR: {e}\n")
            
            # Delay between shots. If delay < 2.5s, the LLM will get throttled for some, 
            # which perfectly simulates a real flood overriding the cognitive engine.
            time.sleep(delay)
            
    print("="*50 + "\nBarrage complete! Check http://localhost:5174")

if __name__ == "__main__":
    # Fire 40 threats from around the world, 1.5 seconds apart
    fire_continuous(count=40, delay=1.5)
