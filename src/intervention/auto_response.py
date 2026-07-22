import time
import json
import logging
import subprocess
from pathlib import Path
from src.config import PROJECT_ROOT

logger = logging.getLogger(__name__)

BLOCKLIST_FILE = PROJECT_ROOT / "data" / "blocklist.txt"

class IPBlocker:
    def __init__(self):
        # Ensure blocklist file exists
        if not BLOCKLIST_FILE.exists():
            BLOCKLIST_FILE.touch()
        self.blocked_ips = set()
        self._load_blocklist()

    def _load_blocklist(self):
        try:
            with open(BLOCKLIST_FILE, "r") as f:
                for line in f:
                    if line.strip():
                        ip = line.split(",")[0]
                        self.blocked_ips.add(ip)
        except Exception as e:
            logger.error(f"Failed to load blocklist: {e}")

    def block_ip(self, ip_address: str, attack_type: str = "Unknown", confidence: str = "High") -> bool:
        """
        Adds the IP to the local blocklist.txt file and Windows Firewall if it isn't already blocked.
        Returns True if newly blocked, False if already blocked.
        """
        if ip_address in self.blocked_ips:
            return False

        self.blocked_ips.add(ip_address)
        timestamp = int(time.time() * 1000)
        
        try:
            with open(BLOCKLIST_FILE, "a") as f:
                f.write(f"{ip_address},{attack_type},{confidence},{timestamp}\n")
            logger.info(f"[INTERVENTION] Blocked IP: {ip_address} (Reason: {attack_type})")
        except Exception as e:
            logger.error(f"Failed to write to blocklist: {e}")

        try:
            cmd = f'New-NetFirewallRule -DisplayName "AegisNet Block {ip_address}" -Direction Inbound -Action Block -RemoteAddress {ip_address}'
            subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True, check=True)
            logger.info(f"[INTERVENTION] Windows Firewall rule added for IP: {ip_address}")
        except Exception:
            logger.warning("Failed to add firewall rule (requires admin)")

        return True

blocker = IPBlocker()
