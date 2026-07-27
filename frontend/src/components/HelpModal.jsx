import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ShieldAlert, Activity, Server, Settings, CheckCircle2 } from 'lucide-react';

export default function HelpModal({ isOpen, onClose, activeTab }) {
  const getHelpContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: "Dashboard Help",
          icon: ShieldAlert,
          color: "text-rose-400",
          sections: [
            {
              title: "Live Threat Index",
              desc: "A live area chart showing the intensity of incoming threats. Spikes indicate an active attack."
            },
            {
              title: "Global Threat Map",
              desc: "Tracks the physical geolocation of attacker IP addresses worldwide."
            },
            {
              title: "Raw Flow Stream",
              desc: "Real-time feed of all network traffic (Normal and Threat). The AI analyzes these flows instantly."
            }
          ]
        };
      case 'analytics':
        return {
          title: "Analytics Help",
          icon: Activity,
          color: "text-cyan-400",
          sections: [
            {
              title: "Threat Intelligence",
              desc: "A chronological timeline of all detected threats. Click 'Learn More' to see detailed analysis."
            },
            {
              title: "MITRE ATT&CK Mapping",
              desc: "Displays exactly what hacking techniques the attacker is using based on global cybersecurity standards."
            },
            {
              title: "AI Analysis",
              desc: "The AI automatically investigates threats and provides human-readable explanations and mitigation steps."
            }
          ]
        };
      case 'endpoints':
        return {
          title: "Endpoints Help",
          icon: Server,
          color: "text-emerald-400",
          sections: [
            {
              title: "ATM Monitoring",
              desc: "View all connected ATMs and their live health status."
            },
            {
              title: "Process Tree",
              desc: "Real-time log of the programs and commands running on the ATM (e.g., cmd.exe -> powershell.exe)."
            },
            {
              title: "Isolate Host",
              desc: "If an ATM is hacked, click 'Isolate Host' to instantly disconnect it from the network and stop the attack."
            }
          ]
        };
      case 'settings':
        return {
          title: "Settings Help",
          icon: Settings,
          color: "text-fuchsia-400",
          sections: [
            {
              title: "Threat Simulation",
              desc: "Safely inject fake attacks into the system to test how AegisNet detects and blocks them."
            },
            {
              title: "Model Proofs",
              desc: "Mathematical proof and architectural details confirming the AI's accuracy and reliability."
            },
            {
              title: "Administrative Overrides",
              desc: "Advanced 'God Mode' settings, including the DEFCON 1 Emergency Network Isolation switch."
            }
          ]
        };
      default:
        return {
          title: "Help Center",
          icon: HelpCircle,
          color: "text-violet-400",
          sections: [
            {
              title: "General Navigation",
              desc: "Use the top tabs to switch between the Dashboard, Analytics, Endpoints, and Settings."
            }
          ]
        };
    }
  };

  const content = getHelpContent();
  const Icon = content.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#060a13]/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[#0d1424] border border-slate-700/50 shadow-2xl shadow-violet-900/20 rounded-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-slate-800/80 border border-slate-700`}>
                  <Icon className={content.color} size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">{content.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Understanding the current page</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {content.sections.map((sec, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="mt-1">
                    <CheckCircle2 size={16} className={content.color} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 mb-1">{sec.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{sec.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-900/80 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500">Need more help? Click the Aegis Mascot in the bottom left.</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
