import time
import logging
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
        """Record a simulated block decision; never change host firewall rules.

        Returns True if newly recorded, False if already present.
        """
        if ip_address in self.blocked_ips:
            return False

        self.blocked_ips.add(ip_address)
        timestamp = int(time.time() * 1000)
        
        try:
            with open(BLOCKLIST_FILE, "a") as f:
                f.write(f"{ip_address},{attack_type},{confidence},{timestamp}\n")
            logger.info(f"[SIMULATION] Recorded block decision for {ip_address} (Reason: {attack_type})")
        except Exception as e:
            logger.error(f"Failed to write to blocklist: {e}")

        logger.info("[SIMULATION] No host firewall rule was changed for %s", ip_address)

        return True

blocker = IPBlocker()
