import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldAlert, ShieldCheck, Server, AlertTriangle, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AegisNetDashboard() {
  const [flows, setFlows] = useState([]);
  const [threats, setThreats] = useState([]);
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    let reconnectAttempts = 0;

    const connectWebSocket = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/live-feed";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'flow') {
            setFlows((prev) => {
              const updated = [...prev, data];
              return updated.length > 40 ? updated.slice(updated.length - 40) : updated;
            });
          } else if (data.type === 'threat') {
            setThreats((prev) => {
              const updated = [data, ...prev];
              return updated.length > 24 ? updated.slice(0, 24) : updated;
            });
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        reconnectAttempts++;
        const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoff);
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const safeNumber = (val) => (typeof val === 'number' && !isNaN(val)) ? val : 0;
  
  // Chart data formatting
  const chartData = flows.map((f, i) => ({
    time: i,
    val: safeNumber(f.flow?.prediction) === 1 ? 1 : 0
  }));

  const latestThreat = threats[0] || null;
  const isAttack = flows.length > 0 && flows[flows.length - 1].flow?.prediction === 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-bold text-white tracking-wide">AegisNet <span className="text-indigo-400 font-light">NIDS</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">STATUS:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
              status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
              status === 'connecting' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {status.toUpperCase()}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Live Threat Index
                </h2>
                {isAttack && (
                  <span className="flex items-center gap-1 text-red-400 text-sm font-bold animate-pulse">
                    <AlertTriangle className="w-4 h-4" /> THREAT DETECTED
                  </span>
                )}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[-0.1, 1.1]} ticks={[0, 1]} tickFormatter={v => v===1 ? "ATTACK" : "BENIGN"} stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} width={70} />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} itemStyle={{color: '#818cf8'}} />
                    <Line type="stepAfter" dataKey="val" stroke={isAttack ? "#ef4444" : "#818cf8"} strokeWidth={3} dot={false} animationDuration={300} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                Raw Flow Stream
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Time</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Destination</th>
                      <th className="px-4 py-3">Proto</th>
                      <th className="px-4 py-3">Flags</th>
                      <th className="px-4 py-3 rounded-tr-lg">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...flows].reverse().slice(0, 10).map((f, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {new Date(f.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{f.flow?.src_ip}:{f.flow?.src_port}</td>
                        <td className="px-4 py-3 text-slate-300">{f.flow?.dst_ip}:{f.flow?.dst_port}</td>
                        <td className="px-4 py-3 text-slate-400">{f.flow?.protocol}</td>
                        <td className="px-4 py-3 text-slate-400">{f.flow?.flags}</td>
                        <td className="px-4 py-3">
                          {f.flow?.prediction === 1 ? 
                            <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-bold">ATTACK</span> :
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs font-bold">BENIGN</span>
                          }
                        </td>
                      </tr>
                    ))}
                    {flows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">Waiting for flows...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Sidebar: Cognitive Reports */}
          <div className="space-y-6">
            <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="w-32 h-32 text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Cognitive Engine
              </h2>
              
              {latestThreat ? (
                <div className="space-y-4 relative z-10">
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Threat Analysis</h3>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {latestThreat.cognitive_report?.Threat_Analysis || "No analysis provided."}
                    </p>
                  </div>
                  
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confidence</h3>
                    <p className="text-sm text-indigo-300 font-medium">
                      {latestThreat.cognitive_report?.Confidence_Validation || "N/A"}
                    </p>
                  </div>

                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Mitigation</h3>
                    <ul className="space-y-2 mt-2">
                      {latestThreat.cognitive_report?.Recommended_Mitigation?.map((step, idx) => (
                        <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-mono">
                      Ref: {new Date(latestThreat.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 relative z-10">
                  <ShieldCheck className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm text-center">Monitoring traffic.<br/>Cognitive reports will appear here when a threat is detected.</p>
                </div>
              )}
            </div>
            
            {threats.length > 1 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm h-64 overflow-y-auto">
                 <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Previous Alerts</h2>
                 <div className="space-y-3">
                    {threats.slice(1).map((t, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/50 rounded border border-slate-800 text-xs text-slate-400">
                        <div className="flex justify-between mb-1">
                          <span className="text-red-400 font-bold">{t.attack_type || "Threat"}</span>
                          <span className="font-mono">{new Date(t.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="line-clamp-2 text-slate-500">{t.cognitive_report?.Threat_Analysis}</p>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
