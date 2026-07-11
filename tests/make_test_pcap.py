from scapy.all import IP, TCP, wrpcap
import time

def make_pcap(filename):
    pkts = []
    
    base_time = 1600000000.0
    
    # Flow A: 6-packet TCP exchange (SYN, SYN-ACK, ACK, PSH-ACK x2, FIN)
    # Host pair: 10.0.0.1:10000 <-> 10.0.0.2:80
    ip_c = IP(src="10.0.0.1", dst="10.0.0.2")
    ip_s = IP(src="10.0.0.2", dst="10.0.0.1")
    
    # SYN (Client -> Server)
    p1 = ip_c / TCP(sport=10000, dport=80, flags="S", seq=100)
    p1.time = base_time
    pkts.append(p1)
    
    # SYN-ACK (Server -> Client)
    p2 = ip_s / TCP(sport=80, dport=10000, flags="SA", seq=200, ack=101)
    p2.time = base_time + 0.1
    pkts.append(p2)
    
    # ACK (Client -> Server)
    p3 = ip_c / TCP(sport=10000, dport=80, flags="A", seq=101, ack=201)
    p3.time = base_time + 0.2
    pkts.append(p3)
    
    # PSH-ACK 1 (Client -> Server)
    p4 = ip_c / TCP(sport=10000, dport=80, flags="PA", seq=101, ack=201) / b"GET / HTTP/1.1\r\n"
    p4.time = base_time + 0.3
    pkts.append(p4)
    
    # PSH-ACK 2 (Server -> Client)
    p5 = ip_s / TCP(sport=80, dport=10000, flags="PA", seq=201, ack=117) / b"HTTP/1.1 200 OK\r\n"
    p5.time = base_time + 0.4
    pkts.append(p5)
    
    # FIN (Client -> Server)
    p6 = ip_c / TCP(sport=10000, dport=80, flags="F", seq=117, ack=218)
    p6.time = base_time + 0.5
    pkts.append(p6)
    
    # Flow B: 40 SYN-only packets (10.0.0.3:20000 -> 10.0.0.4:443) within 1 sec
    for i in range(40):
        pb = IP(src="10.0.0.3", dst="10.0.0.4") / TCP(sport=20000, dport=443, flags="S", seq=300+i)
        pb.time = base_time + 1.0 + (i * 0.02)
        pkts.append(pb)
        
    # Flow C: 2 packets, same host pair, 130s apart
    # 10.0.0.5:30000 <-> 10.0.0.6:8080
    pc1 = IP(src="10.0.0.5", dst="10.0.0.6") / TCP(sport=30000, dport=8080, flags="A")
    pc1.time = base_time + 5.0
    pkts.append(pc1)
    
    pc2 = IP(src="10.0.0.6", dst="10.0.0.5") / TCP(sport=8080, dport=30000, flags="A")
    pc2.time = base_time + 5.0 + 130.0
    pkts.append(pc2)
    
    # Sort packets by time just in case
    pkts.sort(key=lambda x: x.time)
    
    wrpcap(filename, pkts)
    print(f"Test pcap written to {filename}")

if __name__ == "__main__":
    make_pcap("tests/test_traffic.pcap")
