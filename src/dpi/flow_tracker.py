import csv
import logging
from scapy.all import PcapReader, IP, IPv6, TCP, UDP, ICMP
from scapy.error import Scapy_Exception
from collections import defaultdict
import numpy as np
from src.config import FEATURE_COLUMNS, FLOW_INACTIVITY_TIMEOUT_SEC, DATA_PROCESSED

logger = logging.getLogger(__name__)

class FlowState:
    def __init__(self, pkt, timestamp):
        self.start_time = timestamp
        self.last_time = timestamp
        
        # Determine endpoints
        self.fwd_src_ip, self.fwd_dst_ip, self.proto = self._extract_ips(pkt)
        self.fwd_src_port, self.fwd_dst_port = self._extract_ports(pkt)
        
        self.fwd_packets = 0
        self.bwd_packets = 0
        self.fwd_bytes = 0
        self.bwd_bytes = 0
        self.fwd_lengths = []
        self.bwd_lengths = []
        self.iats = []
        
        self.syn = 0
        self.ack = 0
        self.fin = 0
        self.rst = 0
        self.psh = 0
        
        self.update(pkt, timestamp)
        
    def _extract_ips(self, pkt):
        if IP in pkt:
            return pkt[IP].src, pkt[IP].dst, pkt[IP].proto
        elif IPv6 in pkt:
            return pkt[IPv6].src, pkt[IPv6].dst, pkt[IPv6].nh
        return None, None, None
        
    def _extract_ports(self, pkt):
        if TCP in pkt:
            return pkt[TCP].sport, pkt[TCP].dport
        elif UDP in pkt:
            return pkt[UDP].sport, pkt[UDP].dport
        return 0, 0

    def update(self, pkt, timestamp):
        # Calculate IAT
        if self.fwd_packets + self.bwd_packets > 0:
            iat = float(timestamp - self.last_time)
            # Microseconds
            self.iats.append(iat * 1_000_000)
            
        self.last_time = timestamp
        
        src_ip, dst_ip, _ = self._extract_ips(pkt)
        src_port, dst_port = self._extract_ports(pkt)
        
        pkt_len = len(pkt)
        
        # Determine direction
        if src_ip == self.fwd_src_ip and src_port == self.fwd_src_port and dst_ip == self.fwd_dst_ip and dst_port == self.fwd_dst_port:
            is_fwd = True
        else:
            is_fwd = False
            
        if is_fwd:
            self.fwd_packets += 1
            self.fwd_bytes += pkt_len
            self.fwd_lengths.append(pkt_len)
        else:
            self.bwd_packets += 1
            self.bwd_bytes += pkt_len
            self.bwd_lengths.append(pkt_len)
            
        # Extract TCP flags
        if TCP in pkt:
            flags = pkt[TCP].flags
            if flags & 0x02: self.syn += 1
            if flags & 0x10: self.ack += 1
            if flags & 0x01: self.fin += 1
            if flags & 0x04: self.rst += 1
            if flags & 0x08: self.psh += 1

    def export_features(self):
        duration_us = float(self.last_time - self.start_time) * 1_000_000
        
        fwd_len_max = max(self.fwd_lengths) if self.fwd_lengths else 0
        fwd_len_mean = sum(self.fwd_lengths) / len(self.fwd_lengths) if self.fwd_lengths else 0.0
        
        bwd_len_max = max(self.bwd_lengths) if self.bwd_lengths else 0
        bwd_len_mean = sum(self.bwd_lengths) / len(self.bwd_lengths) if self.bwd_lengths else 0.0
        
        duration_sec = float(self.last_time - self.start_time)
        total_bytes = self.fwd_bytes + self.bwd_bytes
        total_packets = self.fwd_packets + self.bwd_packets
        
        if duration_sec > 0:
            bytes_per_sec = total_bytes / duration_sec
            packets_per_sec = total_packets / duration_sec
        else:
            bytes_per_sec = float('inf')
            packets_per_sec = float('inf')
            
        iat_mean = sum(self.iats) / len(self.iats) if self.iats else 0.0
        
        down_up_ratio = self.bwd_packets / self.fwd_packets if self.fwd_packets > 0 else 0.0
        
        # Canonical 19-feature schema mapping
        features = {
            "destination_port": self.fwd_dst_port,
            "flow_duration": duration_us,
            "total_fwd_packets": self.fwd_packets,
            "total_bwd_packets": self.bwd_packets,
            "total_fwd_bytes": self.fwd_bytes,
            "total_bwd_bytes": self.bwd_bytes,
            "fwd_packet_length_max": fwd_len_max,
            "fwd_packet_length_mean": fwd_len_mean,
            "bwd_packet_length_max": bwd_len_max,
            "bwd_packet_length_mean": bwd_len_mean,
            "flow_bytes_per_sec": bytes_per_sec,
            "flow_packets_per_sec": packets_per_sec,
            "flow_iat_mean": iat_mean,
            "down_up_ratio": down_up_ratio,
            "syn_flag_count": self.syn,
            "ack_flag_count": self.ack,
            "fin_flag_count": self.fin,
            "rst_flag_count": self.rst,
            "psh_flag_count": self.psh,
        }
        return features


class FlowTracker:
    def __init__(self, timeout_sec=FLOW_INACTIVITY_TIMEOUT_SEC):
        self.active_flows = {}
        self.timeout_sec = timeout_sec
        self.finished_flows = []
        
    def _get_flow_key(self, pkt):
        if IP in pkt:
            src_ip = pkt[IP].src
            dst_ip = pkt[IP].dst
            proto = pkt[IP].proto
        elif IPv6 in pkt:
            src_ip = pkt[IPv6].src
            dst_ip = pkt[IPv6].dst
            proto = pkt[IPv6].nh
        else:
            return None
            
        src_port = 0
        dst_port = 0
        if TCP in pkt:
            src_port = pkt[TCP].sport
            dst_port = pkt[TCP].dport
        elif UDP in pkt:
            src_port = pkt[UDP].sport
            dst_port = pkt[UDP].dport
            
        endpoint1 = (src_ip, src_port)
        endpoint2 = (dst_ip, dst_port)
        
        endpoints = sorted([endpoint1, endpoint2])
        return (endpoints[0], endpoints[1], proto)

    def process_packet(self, pkt, timestamp):
        key = self._get_flow_key(pkt)
        if not key:
            return
            
        # Check timeouts before updating
        self._check_timeouts(timestamp)
        
        if key in self.active_flows:
            self.active_flows[key].update(pkt, timestamp)
        else:
            self.active_flows[key] = FlowState(pkt, timestamp)
            
    def _check_timeouts(self, current_time):
        timed_out_keys = []
        for key, state in self.active_flows.items():
            if current_time - state.last_time > self.timeout_sec:
                timed_out_keys.append(key)
                
        for key in timed_out_keys:
            self.finished_flows.append(self.active_flows[key])
            del self.active_flows[key]
            
    def flush_all(self):
        for state in self.active_flows.values():
            self.finished_flows.append(state)
        self.active_flows.clear()

    def get_features(self):
        return [f.export_features() for f in self.finished_flows]
