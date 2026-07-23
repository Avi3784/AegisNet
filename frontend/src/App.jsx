import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Server, Activity, Shield, FileText, BarChart2, LayoutDashboard, LogOut, Zap, Settings as SettingsIcon, Volume2, VolumeX } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import StatsOverview from './components/StatsOverview';
import MapWidget from './components/MapWidget';
import ThreatTimeline from './components/ThreatTimeline';
import CognitivePanel from './components/CognitivePanel';
import BlocklistTable from './components/BlocklistTable';
import AuthPage from './Auth';
import Analytics from './Analytics';
import Settings from './Settings';
import Endpoints from './Endpoints';
import Mascot from './components/Mascot';
import ChatbotModal from './components/ChatbotModal';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [flows, setFlows] = useState([]);
  const [threats, setThreats] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [endpoints, setEndpoints] = useState([
    { id: 'ATM-01', ip: '192.168.1.101', status: 'HEALTHY', events: [] },
    { id: 'ATM-02', ip: '192.168.1.102', status: 'HEALTHY', events: [] },
    { id: 'ATM-03', ip: '192.168.1.103', status: 'HEALTHY', events: [] },
    { id: 'ATM-04', ip: '192.168.1.104', status: 'HEALTHY', events: [] },
  ]);
  const [status, setStatus] = useState('connecting');
  const [stats, setStats] = useState({ totalFlows: 0, threatCount: 0, blockedCount: 0 });
  const wsRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const playThreatAlert = () => {
    if (isMutedRef.current) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) {
          setToken(null);
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (data.flows) {
          setFlows(data.flows);
          setStats(s => ({ ...s, totalFlows: data.flows.length }));
        }
        if (data.threats) {
          setThreats(data.threats);
          setStats(s => ({ ...s, threatCount: data.threats.length }));
        }
        if (data.blocklist) {
          setBlockedIPs(data.blocklist);
          setStats(s => ({ ...s, blockedCount: data.blocklist.length }));
        }
      })
      .catch(err => console.error("Failed to fetch history", err));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const connectWebSocket = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/live-feed";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => setStatus('connected');
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'flow') {
            setFlows((prev) => {
              const updated = [...prev, data];
              return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
            });
            setStats(s => ({ ...s, totalFlows: s.totalFlows + 1 }));
          } else if (data.type === 'threat') {
            setThreats((prev) => {
              const updated = [...prev, data];
              return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
            });
            setStats(s => ({ ...s, threatCount: s.threatCount + 1 }));
            if (data.attack_type && (data.attack_type.includes('APT') || data.attack_type.includes('OSINT'))) {
              playThreatAlert();
            }
          } else if (data.type === 'block') {
            setBlockedIPs((prev) => {
              const exists = prev.some(b => b.ip === data.ip);
              if (exists) return prev;
              const updated = [...prev, data];
              return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
            });
            setStats(s => ({ ...s, blockedCount: s.blockedCount + 1 }));
          } else if (data.type === 'endpoint_event') {
            setEndpoints((prev) => 
              prev.map(ep => {
                if (ep.id === data.endpointId || (!data.endpointId && ep.id === 'ATM-01')) {
                  return {
                    ...ep,
                    events: [...ep.events, data.command]
                  };
                }
                return ep;
              })
            );
          } else if (data.type === 'playbook_action' && data.action === 'isolate_host') {
            setEndpoints((prev) => 
              prev.map(ep => {
                if (ep.id === data.endpointId || (!data.endpointId && ep.id === 'ATM-01')) {
                  return { ...ep, status: 'ISOLATED' };
                }
                return ep;
              })
            );
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };
      
      ws.onclose = () => {
        setStatus('disconnected');
        setTimeout(connectWebSocket, 5000);
      };
    };
    
    connectWebSocket();
    
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [token]);

  const handleDownloadReport = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/reports/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AegisNet_Audit_Report.pdf';
      a.click();
    } catch (e) { alert(e.message); }
  };

  if (!token) {
    return <AuthPage onLogin={(t, r) => { 
      setToken(t); 
      setRole(r); 
      localStorage.setItem('token', t);
      localStorage.setItem('role', r);
    }} />;
  }

  const safeNumber = (val) => (typeof val === 'number' && !isNaN(val)) ? val : 0;
  
  const chartData = flows.map((f, i) => ({
    time: i,
    val: safeNumber(f.flow?.prediction) === 1 ? 1 : 0
  }));

  const latestThreat = threats.length > 0 ? threats[threats.length - 1] : null;
  const isAttack = flows.length > 0 && flows[flows.length - 1].flow?.prediction === 1;
  const hasApt = threats.some(t => JSON.stringify(t).includes('APT')) || flows.some(f => JSON.stringify(f).includes('APT'));

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-200 font-sans overflow-x-hidden relative">
      <Mascot isUnderAttack={isAttack} hasApt={hasApt} onOpenChat={() => setIsChatOpen(true)} />
      <ChatbotModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        token={token}
        initialContext={{
          threats: threats.slice(-5),
          endpoints: endpoints
        }}
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.25, 0.12], x: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-15%] left-[-5%] w-[45%] h-[45%] bg-violet-600/25 blur-[140px] rounded-full pointer-events-none z-0" 
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.2, 0.08], y: [0, -40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-[-15%] right-[-5%] w-[45%] h-[45%] bg-cyan-500/20 blur-[140px] rounded-full pointer-events-none z-0" 
      />
      <motion.div 
        animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[40%] left-[30%] w-[30%] h-[30%] bg-fuchsia-500/15 blur-[120px] rounded-full pointer-events-none z-0" 
      />

      <div className="max-w-[1600px] mx-auto p-6 relative z-10 space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-4">
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ rotate: -90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring" }}
              className="p-3 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.25)]"
            >
              <ShieldAlert className="w-8 h-8 text-violet-400" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 tracking-tight">
                AegisNet
              </h1>
              <p className="text-slate-400 text-sm font-medium tracking-wider uppercase">ATM Network Fraud Defense</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Connection status indicator */}
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-slate-700/40 bg-slate-900/50">
              <motion.span 
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-red-400'}`}
              />
              <span className="text-slate-400">{status === 'connected' ? 'Live' : 'Reconnecting...'}</span>
            </div>

            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="p-1.5 rounded-full bg-[#0d1424]/80 border border-slate-700/40 text-slate-400 hover:text-slate-200 transition-colors"
              title={isMuted ? "Unmute Threat Alerts" : "Mute Threat Alerts"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <div className="flex bg-[#0d1424]/80 rounded-xl p-1 border border-slate-700/30 backdrop-blur">
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(139,92,246,0.3)' }}
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/40 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LayoutDashboard size={16} /> Dashboard
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(6,182,212,0.3)' }}
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'analytics' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg shadow-cyan-900/40 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <BarChart2 size={16} /> Analytics
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}
                onClick={() => setActiveTab('endpoints')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'endpoints' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-900/40 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Server size={16} /> Endpoints
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(217,70,239,0.3)' }}
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'settings' ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 shadow-lg shadow-fuchsia-900/40 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <SettingsIcon size={16} /> Settings
              </motion.button>
            </div>
            
            {role === 'admin' && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadReport}
                className="flex items-center gap-2 bg-[#0d1424]/80 hover:bg-slate-800 backdrop-blur border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-emerald-900/30"
              >
                <FileText size={16} className="text-emerald-400" />
                Audit PDF
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { 
                setToken(null); 
                setRole(null); 
                localStorage.removeItem('token');
                localStorage.removeItem('role');
              }}
              className="flex items-center gap-2 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <LogOut size={16} />
            </motion.button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <StatsOverview 
                totalFlows={stats.totalFlows} 
                threatCount={stats.threatCount} 
                blockedCount={stats.blockedCount} 
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <MapWidget threats={threats} />

                  <div className="bg-[#0d1424]/80 backdrop-blur-xl glow-border rounded-2xl p-4 h-[250px] flex flex-col shadow-[0_0_25px_rgba(139,92,246,0.2)]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Zap className="text-amber-400" size={16} />
                        Live Threat Index
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isAttack ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                        {isAttack ? 'THREAT ACTIVE' : 'ALL CLEAR'}
                      </span>
                    </div>
                    <div className="flex-1 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" hide />
                          <YAxis domain={[-0.1, 1.1]} ticks={[0, 1]} tickFormatter={v => v===1 ? "ATTACK" : "NORMAL"} stroke="#475569" tick={{fill: '#94a3b8', fontSize: 10}} width={60} />
                          <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px'}} itemStyle={{color: '#a78bfa'}} />
                          <Line type="stepAfter" dataKey="val" stroke={isAttack ? "#f43f5e" : "#8b5cf6"} strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#0d1424]/80 backdrop-blur-xl glow-border rounded-2xl p-4 flex flex-col flex-1 min-h-[250px] shadow-[0_0_25px_rgba(6,182,212,0.2)]">
                    <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                      <Server className="text-cyan-400" size={16} />
                      Raw Flow Stream
                    </h3>
                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                      <table className="w-full text-xs text-left whitespace-nowrap">
                        <thead className="uppercase text-slate-500 sticky top-0 bg-[#0a0f1a] pb-2 z-10">
                          <tr>
                            <th className="px-2 py-2">Time</th>
                            <th className="px-2 py-2">Source</th>
                            <th className="px-2 py-2">Destination</th>
                            <th className="px-2 py-2">Verdict</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...flows].reverse().slice(0, 10).map((f, i) => {
                            const isAptDetected = f.flow?.src_ip?.includes('[OSINT: APT DETECTED]') || f.flow?.dst_ip?.includes('[OSINT: APT DETECTED]') || (f.flow?.tags && f.flow.tags.some(t => t.includes('APT DETECTED')));
                            const renderAptTag = (text) => {
                              if (!text) return text;
                              if (typeof text === 'string' && text.includes('[OSINT: APT DETECTED]')) {
                                return (
                                  <span>
                                    {text.replace('[OSINT: APT DETECTED]', '')}
                                    <span className="ml-1 px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                                      [OSINT: APT DETECTED]
                                    </span>
                                  </span>
                                );
                              }
                              return text;
                            };
                            return (
                              <motion.tr 
                                key={f.timestamp + "-" + i} 
                                whileHover={{ scale: 1.01, backgroundColor: 'rgba(139,92,246,0.1)' }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className={`border-b border-slate-800/50 transition-colors ${isAptDetected ? 'bg-rose-950/20' : ''}`}
                              >
                                <td className="px-2 py-2 font-mono text-slate-500">
                                  {new Date(f.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="px-2 py-2 text-slate-300">{renderAptTag(f.flow?.src_ip)}:{f.flow?.src_port}</td>
                                <td className="px-2 py-2 text-slate-400">{renderAptTag(f.flow?.dst_ip)}:{f.flow?.dst_port}</td>
                                <td className="px-2 py-2">
                                  {Number(f.flow?.prediction) === 1 ? 
                                    <span className="px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded font-bold border border-rose-500/30 text-[11px]">ATTACK</span> :
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-[11px]">NORMAL</span>
                                  }
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <CognitivePanel latestThreat={latestThreat} token={token} />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                    <ThreatTimeline threats={threats} token={token} />
                    <BlocklistTable blockedIPs={blockedIPs} />
                  </div>
                </div>

              </div>
            </motion.div>
          ) : activeTab === 'analytics' ? (
            <Analytics key="analytics" threats={threats} endpoints={endpoints} />
          ) : activeTab === 'endpoints' ? (
            <Endpoints 
              key="endpoints" 
              endpoints={endpoints} 
              onIsolate={(id) => setEndpoints(prev => prev.map(ep => ep.id === id ? { ...ep, status: 'ISOLATED' } : ep))}
              onReconnect={(id) => setEndpoints(prev => prev.map(ep => ep.id === id ? { ...ep, status: 'HEALTHY' } : ep))}
            />
          ) : (
            <Settings key="settings" token={token} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
