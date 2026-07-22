import asyncio
from src.backend.connection_manager import manager
from src.backend.db import get_setting
from src.backend.alerts import fire_webhook

async def evaluate_playbooks(event_data: dict):
    """
    Checks rules and triggers actions based on event data.
    """
    # Look at the root or the nested event dict
    event = event_data.get("event", event_data)
    command_line = event.get("command_line", "").lower()
    
    if "powershell.exe" in command_line:
        target_ip = event.get("host_ip", "Unknown")
        endpoint_id = event_data.get("endpointId", "ATM-01")
        action_payload = {
            "type": "playbook_action",
            "action": "isolate_host",
            "target": target_ip,
            "endpointId": endpoint_id
        }
        await manager.broadcast(action_payload)
        
        # Send Discord Alert
        webhook_url = get_setting("webhook_url")
        if webhook_url:
            threat_data = {
                "attack_type": "Endpoint SOAR Isolation",
                "flow": {"src_ip": endpoint_id, "dst_port": target_ip},
                "cognitive_report": {"Threat_Analysis": f"Malicious process detected: {command_line[:200]}"}
            }
            asyncio.create_task(fire_webhook(threat_data, webhook_url))
