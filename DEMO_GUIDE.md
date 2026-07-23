# AegisNet Demonstration Guide

This guide is designed to help you run a flawless presentation of the AegisNet XDR platform to your panel.

## What is "Benign" Traffic?
In the context of the `/api/model/validation` report, you might have seen the term **"benign"**. 
* **Benign** means safe, normal, non-malicious traffic.
* **Class Imbalance (~80% benign)** means that out of all the data the AI learned from, 80% was normal traffic and 20% was actual attacks. The model uses "stratified splits" to ensure it learns how to detect the 20% without just guessing "safe" every time.

## 🚀 How to Run the Demo

### 1. Start the System
Ensure both servers are running:
* **Backend:** `.\venv\Scripts\uvicorn.exe src.backend.main:app --port 8000`
* **Frontend:** `npm run dev` in the `frontend` folder.
* **Access:** `http://localhost:5173`

### 2. Showcase the "Normal" State
* **The Dashboard:** Point out the sleek dark-mode UI, the glassmorphism panels, and the live System Uptime clock.
* **The Mascot (Aegis Shield):** Show them the floating Shield Mascot at the bottom of the screen. Point out that it represents the active AI sentry. It's currently "Happy" (blue) because the network is safe. (Try clicking it!)
* **Endpoint Health:** Go to the "Endpoints" tab and show that all ATMs are currently "HEALTHY" with no malicious process trees.

### 3. Fire the Attacks (The "Wow" Moment)
To demonstrate the platform's detection capabilities, open a new terminal window and run:
```bash
python scripts/fire_threats.py
```
This script fires 5 synthetic attacks at the backend (DoS, Port Scans, Brute Force, Malware C2, and Web Attacks).

### 4. What to Highlight During the Attack
As the attacks hit the dashboard, immediately point out:
* **The Mascot Reaction:** The Shield Mascot will instantly turn Orange (Alert) or Red (APT) and start panicking! Click on the mascot to open the **Aegis Copilot** (the LLM chat) to ask for advice.
* **Threat Timeline:** The table will populate with red "ATTACK" badges.
* **Cognitive Engine (LLM):** The AI will generate a real-time English report explaining *what* the attack is and *how* to stop it, alongside the MITRE ATT&CK techniques used.
* **Sound Alerts:** If unmuted, the system will play a high-pitched threat alert for Advanced Persistent Threats (APTs).

### 5. Showcase Admin "God Mode"
Go to the **Settings -> Advanced** tab to show off Enterprise capabilities:
* **Global Network Kill Switch:** Explain that in a worst-case scenario (like a fast-spreading ransomware worm), the admin can instantly lock down the entire ATM network.
* **Threat Sensitivity:** Show that the ML engine's strictness can be adjusted dynamically.
* **Role-Based Access Control (RBAC):** Show that API keys and technician sessions can be monitored and revoked instantly.

## Key Talking Points for the Panel
* *"Our AI is an ensemble of XGBoost and LightGBM, achieving 99.6% accuracy on the CIC-IDS-2017 dataset."*
* *"We simulate authentic ATM endpoints, mirroring real Windows 10 IoT events and XFS middleware logic."*
* *"AegisNet isn't just passive monitoring; it features a SOAR (Security Orchestration, Automation, and Response) engine that can isolate compromised ATMs automatically."*
