import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Lock, Unlock, Terminal } from 'lucide-react';

export default function Endpoints({ endpoints, onIsolate, onReconnect }) {

  const handleSandboxDetonate = async (base64) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/sandbox/detonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: base64 })
      });
      const data = await res.json();
      alert(`Sandbox Analysis:\n\nExtracted Strings:\n${data.extracted_strings?.join('\\n') || 'None'}`);
    } catch(e) {
      alert("Sandbox request failed.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <Monitor className="text-violet-400" size={24} />
          Endpoint Fleet Management
        </h2>
        <p className="text-slate-400 text-sm mt-1">Monitor ATM endpoints, process execution trees, and containment status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {endpoints.map((ep) => {
          const isHoneypot = ep.id === 'ATM-99-HONEYPOT';
          const isHoneypotTriggered = isHoneypot && (ep.status === 'ISOLATED' || ep.events.length > 0);
          
          return (
            <div key={ep.id} className={`relative bg-[#0d1424]/80 backdrop-blur-xl border rounded-2xl p-4 flex flex-col h-96 transition-colors ${
              isHoneypotTriggered ? 'animate-pulse border-rose-500 shadow-rose-900/50 bg-rose-950/20 shadow-lg' 
              : isHoneypot ? 'border-dashed border-slate-600/50 opacity-80 shadow-lg'
              : ep.status === 'ISOLATED' ? 'border-rose-500/50 shadow-rose-900/20 shadow-lg' : 'glow-border shadow-[0_0_25px_rgba(139,92,246,0.2)]'
            }`}>
              {isHoneypotTriggered && (
                <div className="absolute top-[-10px] right-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-bounce shadow-lg shadow-rose-900/50">
                  DECEPTION TRIGGERED
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Monitor size={18} className={ep.status === 'ISOLATED' ? 'text-rose-400' : 'text-emerald-400'} />
                    {ep.id}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">{ep.ip}</p>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  ep.status === 'ISOLATED' 
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  {ep.status}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 bg-slate-900/50 rounded-xl p-3 border border-slate-800 custom-scrollbar">
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Terminal size={12} />
                  Process Tree
                </h4>
                <div className="space-y-2">
                  {ep.events.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No suspicious processes detected.</p>
                  ) : (
                    ep.events.map((evt, idx) => {
                      const isEnc = evt.includes('powershell -enc');
                      const base64Match = evt.match(/powershell -enc\s+([A-Za-z0-9+/=]+)/);
                      const base64 = base64Match ? base64Match[1] : '';

                      return (
                        <div key={idx} className="flex items-start gap-2 text-xs font-mono">
                          <div className="text-slate-600 mt-0.5">{'->'}</div>
                          <div className="text-slate-300 break-all flex-1">
                            {evt}
                            {isEnc && base64 && (
                              <button 
                                onClick={() => handleSandboxDetonate(base64)}
                                className="ml-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-500/30 inline-block"
                              >
                                [Sandbox]
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button 
                  onClick={() => onIsolate(ep.id)}
                  disabled={ep.status === 'ISOLATED'}
                  className="flex justify-center items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-500/20 text-rose-400 text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  <Lock size={14} /> Isolate
                </button>
                <button 
                  onClick={() => onReconnect(ep.id)}
                  disabled={ep.status === 'HEALTHY'}
                  className="flex justify-center items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/20 text-emerald-400 text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  <Unlock size={14} /> Reconnect
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
