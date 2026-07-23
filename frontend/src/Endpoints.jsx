import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Lock, Unlock, Terminal, Activity } from 'lucide-react';

const ATMIllustration = ({ status }) => {
  return (
    <div className="relative w-12 h-16 bg-slate-800 rounded-t-lg border-2 border-slate-700 flex flex-col items-center pt-2 shadow-inner mx-auto mb-2 shrink-0">
      <div className={`w-8 h-6 rounded bg-black border border-slate-600 ${status === 'HEALTHY' ? 'shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''}`}>
        {status === 'HEALTHY' && (
          <div className="w-full h-full bg-emerald-500/20 flex flex-col justify-between p-[2px]">
            <div className="h-[1px] w-full bg-emerald-500/40"></div>
            <div className="h-[1px] w-full bg-emerald-500/40"></div>
            <div className="h-[1px] w-full bg-emerald-500/40"></div>
          </div>
        )}
      </div>
      <div className="w-6 h-1 bg-slate-600 mt-2 rounded-full"></div>
      <div className="w-8 h-2 flex justify-between mt-1">
        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
      </div>
      {status === 'ISOLATED' && (
        <div className="absolute inset-0 bg-rose-950/60 flex items-center justify-center rounded-t-lg backdrop-blur-[1px]">
          <Lock size={20} className="text-rose-500" />
        </div>
      )}
    </div>
  );
};

const EndpointCard = ({ ep, onIsolate, onReconnect, handleSandboxDetonate, isHoneypot, isHoneypotTriggered }) => {
  const [heartbeat, setHeartbeat] = useState(0);
  const [health, setHealth] = useState(ep.status === 'ISOLATED' ? 0 : Math.floor(Math.random() * (100 - 85 + 1) + 85));

  useEffect(() => {
    const interval = setInterval(() => {
      setHeartbeat(prev => prev + 10);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setHeartbeat(0);
  }, [ep.events]);

  useEffect(() => {
    if (ep.status === 'ISOLATED') {
      setHealth(0);
    } else {
      setHealth(Math.floor(Math.random() * (100 - 85 + 1) + 85));
    }
  }, [ep.status]);

  const treeVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className={`relative bg-[#0d1424]/80 backdrop-blur-xl border rounded-2xl p-4 flex flex-col h-[28rem] transition-colors ${
      isHoneypotTriggered ? 'animate-pulse border-rose-500 shadow-rose-900/50 bg-rose-950/20 shadow-lg' 
      : isHoneypot ? 'border-dashed border-slate-600/50 opacity-80 shadow-lg'
      : ep.status === 'ISOLATED' ? 'border-rose-500/50 shadow-rose-900/20 shadow-lg' : 'glow-border shadow-[0_0_25px_rgba(139,92,246,0.2)]'
    }`}>
      {isHoneypotTriggered && (
        <div className="absolute top-[-10px] right-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-bounce shadow-lg shadow-rose-900/50 z-10">
          DECEPTION TRIGGERED
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-3">
          <ATMIllustration status={ep.status} />
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              {ep.id}
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1">{ep.ip}</p>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Activity size={10} /> Last Heartbeat: {heartbeat}s ago
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {ep.status === 'HEALTHY' && (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          )}
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
            ep.status === 'ISOLATED' 
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          }`}>
            {ep.status}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 bg-slate-900/50 rounded-xl p-3 border border-slate-800 custom-scrollbar mt-2">
        <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
          <Terminal size={12} />
          Process Tree
        </h4>
        <motion.div variants={treeVariants} initial="hidden" animate="show" className="space-y-2">
          {ep.events.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No suspicious processes detected.</p>
          ) : (
            ep.events.map((evt, idx) => {
              const isEnc = evt.includes('powershell -enc');
              const base64Match = evt.match(/powershell -enc\s+([A-Za-z0-9+/=]+)/);
              const base64 = base64Match ? base64Match[1] : '';

              return (
                <motion.div variants={itemVariants} key={idx} className="flex items-start gap-2 text-xs font-mono">
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
                </motion.div>
              )
            })
          )}
        </motion.div>
      </div>

      <div className="mt-auto space-y-3">
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${ep.status === 'HEALTHY' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-rose-500'}`} 
            style={{ width: `${health}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Health</span>
          <span className={ep.status === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-400'}>{health}%</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
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
    </div>
  );
};

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
            <EndpointCard 
              key={ep.id} 
              ep={ep} 
              onIsolate={onIsolate} 
              onReconnect={onReconnect} 
              handleSandboxDetonate={handleSandboxDetonate}
              isHoneypot={isHoneypot}
              isHoneypotTriggered={isHoneypotTriggered}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
