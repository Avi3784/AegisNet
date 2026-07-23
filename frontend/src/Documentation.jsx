import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ShieldAlert, Cpu, Crosshair, Map, Activity, Power, Lock, CheckCircle2 } from 'lucide-react';

export default function Documentation() {
  const sections = [
    {
      id: 'overview',
      title: 'System Overview',
      icon: ShieldAlert,
      content: `AegisNet is an enterprise-grade Extended Detection and Response (XDR) platform specifically engineered for ATM network infrastructure. It utilizes a hybrid AI ensemble (LightGBM and XGBoost) to analyze raw network flows in real-time, detecting anomalies associated with jackpotting, malware C2 communication, and reconnaissance. Furthermore, it ingests endpoint telemetry via websockets to identify unauthorized process executions and file modifications.`
    },
    {
      id: 'dashboard',
      title: 'Dashboard & Analytics',
      icon: Activity,
      content: `The primary dashboard provides a centralized view of the network's health:
      • Live Threat Index: A dynamic area chart visualizing the rolling intensity of detected network anomalies.
      • Global Threat Map: Geolocation tracking of originating attack IPs.
      • Raw Flow Stream: A live feed of ingested packet metadata evaluated by the ML engine.`
    },
    {
      id: 'copilot',
      title: 'Aegis Sentinel & Copilot',
      icon: Cpu,
      content: `The Aegis Sentinel (bottom-left) acts as the visual status indicator for the network's current threat level. 
      Clicking the Sentinel launches the Aegis Copilot—an embedded Large Language Model (LLM) tuned for cybersecurity incident response. During an attack, the Copilot automatically generates a post-incident report detailing the MITRE ATT&CK techniques used and recommended mitigation strategies.`
    },
    {
      id: 'endpoints',
      title: 'Endpoint Management',
      icon: Map,
      content: `The Endpoints tab monitors the fleet of connected ATMs. It displays real-time Windows Event Logs (Event IDs 4688, 11, etc.) indicating process creations and file drops. If a host is compromised, technicians can execute a remote SOAR playbook to ISOLATE the host, dropping its network connection to prevent lateral movement.`
    },
    {
      id: 'simulation',
      title: 'Threat Simulation Engine',
      icon: Crosshair,
      content: `Located within the Settings menu, the Threat Simulation Engine allows administrators to inject synthetic, dataset-authentic payloads into the processing pipeline. These payloads strictly adhere to the CIC-IDS-2017 mathematical feature space, allowing for rigorous, unbiased validation of the machine learning inference engine.`
    },
    {
      id: 'admin',
      title: 'Administrative Overrides',
      icon: Power,
      content: `The Advanced tab within Settings provides "God Mode" controls for extreme scenarios:
      • Emergency Network Isolation: Drops all ingress/egress traffic to the ATM fleet (DEFCON 1).
      • Threat Sensitivity Threshold: Dynamically adjusts the strictness of the ML inference engine.
      • Data Retention Policy: Controls log lifecycle management to ensure compliance.`
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto pb-12"
    >
      <div className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-violet-500/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="border-b border-slate-800 pb-6 mb-8 relative z-10 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
            <BookOpen className="text-cyan-400" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">AegisNet User Manual</h1>
            <p className="text-sm text-slate-400 mt-1">Comprehensive documentation and operational guidelines.</p>
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          {sections.map((sec, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={sec.id} 
              className="group"
            >
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-3 mb-3">
                <sec.icon className="text-cyan-500 group-hover:text-cyan-400 transition-colors" size={20} />
                {sec.title}
              </h3>
              <div className="pl-8 text-sm text-slate-400 leading-relaxed space-y-2">
                {sec.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 size={18} />
          <p>You are currently operating on AegisNet Core Version 2.4.9 (Stable).</p>
        </div>
      </div>
    </motion.div>
  );
}
