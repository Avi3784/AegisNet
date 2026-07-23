"""
This simulator generates synthetic ATM endpoint telemetry.
Based on real Windows Event Log structure from ATMs running Windows 10 IoT Enterprise.
Transaction messages follow ISO 8583 financial messaging standard.
XFS (eXtensions for Financial Services) is the real middleware standard used by all ATM vendors.
"""
import asyncio
import random
import time
import base64
from src.backend.connection_manager import manager
from src.backend.playbooks import evaluate_playbooks

async def run_endpoint_simulator():
    while True:
        await asyncio.sleep(random.uniform(3.0, 10.0))
        
        event_category = random.choices(["WindowsEvent", "ISO8583", "Attack"], weights=[0.5, 0.4, 0.1])[0]
        
        atm_id = random.choice(["ATM-01", "ATM-02", "ATM-03", "ATM-04", "ATM-99-HONEYPOT"])
        # Give honeypot a distinct IP, or use the last digit of regular ATM IDs
        host_ip = f"192.168.1.10{atm_id[-1]}" if atm_id != "ATM-99-HONEYPOT" else "192.168.1.109"
        event_data = {
            "timestamp": int(time.time() * 1000),
            "host_ip": host_ip
        }
        cmd = ""

        if event_category == "WindowsEvent":
            event_id = random.choice([4688, 4624, 7036, 1102])
            if event_id == 4688:
                cmds = [
                    "C:\\Program Files\\Diebold\\Agilis\\XFSManager.exe",
                    "C:\\Program Files\\NCR\\APTRA\\CashDispenser.exe",
                    "C:\\Wincor\\ProCash\\ProCash.exe",
                    "C:\\Windows\\System32\\svchost.exe -k XFSService"
                ]
                proc = random.choice(cmds)
                cmd = f"Process Creation: {proc}"
                event_data.update({
                    "event_id": 4688,
                    "process_name": proc.split("\\")[-1],
                    "command_line": proc
                })
            elif event_id == 4624:
                cmd = "Logon Event: Technician/Remote Admin"
                event_data.update({
                    "event_id": 4624,
                    "logon_type": random.choice([2, 10]),
                    "account_name": "ATM_Admin"
                })
            elif event_id == 7036:
                cmd = "Service Status Change: XFS Service"
                event_data.update({
                    "event_id": 7036,
                    "service_name": "XFSService",
                    "state": random.choice(["running", "stopped"])
                })
            elif event_id == 1102:
                cmd = "Audit Log Cleared"
                event_data.update({
                    "event_id": 1102,
                    "message": "The audit log was cleared"
                })
                
        elif event_category == "ISO8583":
            iso_type = random.choice(["0200", "0400", "0800", "0100"])
            iso_desc = {
                "0200": "Financial Transaction Request (cash withdrawal)",
                "0400": "Reversal Request",
                "0800": "Network Management (health check/keep-alive)",
                "0100": "Authorization Request"
            }
            cmd = f"ISO 8583: {iso_type} - {iso_desc[iso_type]}"
            event_data.update({
                "message_type": iso_type,
                "description": iso_desc[iso_type],
                "amount": random.choice([20, 50, 100, 200]) if iso_type in ["0200", "0100"] else 0
            })
            
        elif event_category == "Attack":
            attack_type = random.choice([
                "Jackpotting", 
                "Black Box Attack", 
                "Skimmer Detected", 
                "Man-in-the-Middle"
            ])
            cmd = f"ATTACK SIMULATION: {attack_type}"
            if attack_type == "Jackpotting":
                event_data.update({"attack": attack_type, "details": "Unauthorized cash dispensing via malicious XFS commands"})
            elif attack_type == "Black Box Attack":
                event_data.update({"attack": attack_type, "details": "External device sending raw XFS commands"})
            elif attack_type == "Skimmer Detected":
                event_data.update({"attack": attack_type, "details": "Unusual USB device enumeration"})
            elif attack_type == "Man-in-the-Middle":
                event_data.update({"attack": attack_type, "details": "TLS certificate mismatch on host-to-host connection"})

        payload = {
            "type": "endpoint_event",
            "endpointId": atm_id,
            "command": cmd,
            "event": event_data
        }
        
        # We evaluate playbooks on this simulated event directly here
        await evaluate_playbooks(payload)
        
        # Broadcast the simulated endpoint event
        await manager.broadcast(payload)
