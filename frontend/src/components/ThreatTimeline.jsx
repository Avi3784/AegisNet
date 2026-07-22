import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, MessageSquareText, Download } from 'lucide-react';
import ChatbotModal from './ChatbotModal';

const ThreatTimeline = ({ threats, token }) => {
  const [selectedThreat, setSelectedThreat] = useState(null);

  // Group consecutive identical attacks for clutter reduction
  const groupedThreats = [];
  for (let i = 0; i < threats.length; i++) {
    const current = threats[i];
    if (groupedThreats.length > 0) {
      const last = groupedThreats[groupedThreats.length - 1];
      if (last.attack_type === current.attack_type) {
        last.count = (last.count || 1) + 1;
        last.timestamp = current.timestamp;
        continue;
      }
    }
    groupedThreats.push({ ...current, count: 1 });
  }

  return (
    <div className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 flex flex-col h-[400px]" style={{ boxShadow: '0 0 30px rgba(244,63,94,0.04)' }}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/30">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <AlertTriangle className="text-amber-400" size={20} />
          Threat Timeline
        </h3>
        <span className="flex items-center gap-2 text-xs bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 font-semibold">
          <motion.span 
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-rose-500"
          />
          Live Feed
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        <AnimatePresence initial={false}>
          {groupedThreats.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No threats detected yet.
            </div>
          ) : (
            groupedThreats.map((threat, idx) => (
              <motion.div
                key={threat.timestamp + idx}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                className="bg-slate-800/40 border-l-4 border-rose-500 rounded-r-xl p-3 shadow-lg flex flex-col gap-2 hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-400 text-sm">{threat.attack_type}</span>
                    {threat.count > 1 && (
                      <span className="bg-rose-500/15 text-rose-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-rose-500/20">
                        {threat.count}x
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(threat.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {threat.cognitive_report?.Threat_Analysis || "Analysis pending..."}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedThreat(threat)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-900/20 px-2.5 py-1 rounded-lg border border-cyan-500/15 transition-colors"
                  >
                    <MessageSquareText size={12} />
                    Learn More
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => window.open(`http://localhost:8000/api/pcap/${threat.timestamp}`, '_blank')}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 bg-violet-900/20 px-2.5 py-1 rounded-lg border border-violet-500/15 transition-colors"
                  >
                    <Download size={12} />
                    Download PCAP
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      
      <ChatbotModal 
        isOpen={selectedThreat !== null} 
        onClose={() => setSelectedThreat(null)} 
        initialContext={
          selectedThreat ? {
            attack_type: selectedThreat.attack_type,
            analysis: selectedThreat.cognitive_report?.Threat_Analysis || "No analysis available",
            mitigation: selectedThreat.cognitive_report?.Recommended_Mitigation || "No mitigation available"
          } : {}
        }
        token={token}
      />
    </div>
  );
};

export default ThreatTimeline;
