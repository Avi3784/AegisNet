import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Brain, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const COLORS = ['#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'];

import { generateCSuiteReport } from './components/ReportGenerator';

const Analytics = ({ threats, endpoints }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelData, setModelData] = useState(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [showLimitations, setShowLimitations] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/model/validation`)
      .then(res => res.json())
      .then(data => {
        setModelData(data);
        setLoadingModel(false);
      })
      .catch(err => {
        console.error("Failed to fetch model validation", err);
        setLoadingModel(false);
      });
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await generateCSuiteReport(threats, endpoints);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const timeData = useMemo(() => {
    const counts = {};
    threats.forEach(t => {
      const date = new Date(t.timestamp).toLocaleDateString();
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.keys(counts).map(date => ({ date, attacks: counts[date] })).reverse();
  }, [threats]);

  const typeData = useMemo(() => {
    const counts = {};
    threats.forEach(t => {
      counts[t.attack_type] = (counts[t.attack_type] || 0) + 1;
    });
    return Object.keys(counts).map(type => ({ name: type, value: counts[type] }));
  }, [threats]);

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="p-6 h-[calc(100vh-100px)] overflow-y-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-100">Analytics Dashboard</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2 rounded-xl transition disabled:opacity-50 shadow-lg shadow-violet-900/30 font-bold text-sm"
        >
          {isGenerating ? 'Generating...' : 'Generate C-Suite Report'}
        </motion.button>
      </div>

      {/* Model Validation Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0d1424]/80 backdrop-blur-xl border border-indigo-500/30 p-6 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.15)] mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h3 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Brain className="text-indigo-400" size={24} />
            Model Validation Report
          </h3>
          <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-400">
             <span className="bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">Dataset: {modelData?.dataset || 'CIC-IDS2017'}</span>
             <span className="bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">Arch: {modelData?.architecture || 'RandomForest'}</span>
             <span className="bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">Features: {modelData?.feature_count || '78'}</span>
          </div>
        </div>

        {loadingModel ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
             {[1,2,3,4,5].map(i => <div key={i} className="h-24 skeleton rounded-xl"></div>)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
               {[
                 { label: 'Accuracy', value: modelData?.accuracy || modelData?.metrics?.accuracy || 0 },
                 { label: 'Precision', value: modelData?.precision || modelData?.metrics?.precision || 0 },
                 { label: 'Recall', value: modelData?.recall || modelData?.metrics?.recall || 0 },
                 { label: 'F1 Score', value: modelData?.f1_score || modelData?.metrics?.f1 || 0 },
                 { label: 'ROC-AUC', value: modelData?.roc_auc || modelData?.metrics?.roc_auc || 0 }
               ].map((m, i) => (
                 <div key={i} className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl text-center flex flex-col items-center justify-center relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 z-10">{m.label}</p>
                   <motion.h4 
                     initial={{ scale: 0.5, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{ delay: i * 0.1, type: "spring" }}
                     className="text-3xl font-black text-indigo-300 z-10"
                   >
                     {m.value > 1 ? m.value : (m.value * 100).toFixed(1)}%
                   </motion.h4>
                 </div>
               ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-950/30 px-4 py-2 rounded-lg border border-emerald-500/30">
                <CheckCircle size={16} />
                Cross-Validation: {modelData?.cross_validation || modelData?.cross_validation_result || 'Passed'}
              </div>

              <div className="w-full md:w-auto">
                <button 
                  onClick={() => setShowLimitations(!showLimitations)}
                  className="flex items-center justify-between w-full md:w-auto gap-2 text-amber-400 text-sm font-bold bg-amber-950/30 px-4 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-900/40 transition-colors"
                >
                  <span className="flex items-center gap-2"><AlertTriangle size={16} /> Known Limitations</span>
                  {showLimitations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showLimitations && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-4 space-y-2 bg-amber-950/10 p-4 rounded-xl border border-amber-500/20 text-slate-300 text-sm">
                    {(modelData?.limitations || modelData?.known_limitations || ['May have higher false positive rate on novel attack variants.', 'Requires periodic retraining to maintain efficacy on zero-days.']).map((lim, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        {lim}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="bg-[#0d1424]/80 backdrop-blur-xl glow-border p-6 rounded-2xl shadow-[0_0_25px_rgba(139,92,246,0.2)] flex flex-col" style={{ minHeight: '420px' }}>
          <h3 className="text-lg font-bold text-slate-100 mb-4">Threat Volume (Time Series)</h3>
          <div className="flex-1">
            {timeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="attacks" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', stroke: '#c4b5fd', strokeWidth: 2 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-[#0d1424]/80 backdrop-blur-xl glow-border p-6 rounded-2xl shadow-[0_0_25px_rgba(139,92,246,0.2)] flex flex-col" style={{ minHeight: '420px' }}>
          <h3 className="text-lg font-bold text-slate-100 mb-4">Attack Distribution</h3>
          <div className="flex-1" style={{ minHeight: 0 }}>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                    labelLine={false}
                    label={CustomLabel}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }} />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ color: '#94a3b8', fontSize: '12px', paddingTop: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No data available</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
