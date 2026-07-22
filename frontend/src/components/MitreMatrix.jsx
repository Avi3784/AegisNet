import React from 'react';

const TACTICS = [
  "Initial Access", "Execution", "Persistence", "Privilege Escalation",
  "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement",
  "Collection", "Command and Control", "Exfiltration", "Impact"
];

const MitreMatrix = ({ activeTechniques = [] }) => {
  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">MITRE ATT&CK Tactics</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {TACTICS.map((tactic, i) => {
          const isActive = activeTechniques.some(tech => 
            tech.toLowerCase() === tactic.toLowerCase() || 
            tactic.toLowerCase().includes(tech.toLowerCase()) || 
            tech.toLowerCase().includes(tactic.toLowerCase())
          );
          return (
            <div 
              key={i} 
              className={`text-[10px] sm:text-xs px-1.5 py-1.5 rounded border text-center font-medium transition-colors ${
                isActive 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-500'
              }`}
            >
              {tactic}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MitreMatrix;
