import httpx
import logging
import asyncio

logger = logging.getLogger(__name__)

async def fire_webhook(threat_data, webhook_url):
    if not webhook_url:
        return
        
    payload = {
        "content": "🚨 **CRITICAL THREAT DETECTED** 🚨",
        "embeds": [
            {
                "title": f"Target Identified: {threat_data.get('attack_type', 'Unknown Threat')}",
                "color": 16711680, # Red
                "fields": [
                    {
                        "name": "Source IP",
                        "value": threat_data.get("flow", {}).get("src_ip", "Unknown"),
                        "inline": True
                    },
                    {
                        "name": "Destination Port",
                        "value": str(threat_data.get("flow", {}).get("dst_port", "Unknown")),
                        "inline": True
                    },
                    {
                        "name": "AI Analysis",
                        "value": threat_data.get("cognitive_report", {}).get("Threat_Analysis", "No analysis available.")[:1000]
                    }
                ],
                "footer": {
                    "text": "AegisNet Security Operations Center"
                }
            }
        ]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(webhook_url, json=payload, timeout=5.0)
            if resp.status_code >= 400:
                logger.error(f"Failed to fire webhook: {resp.status_code} {resp.text}")
            else:
                logger.info(f"Successfully fired webhook alert to {webhook_url}")
    except Exception as e:
        logger.error(f"Error firing webhook: {e}")
