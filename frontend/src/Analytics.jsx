import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'];

import { generateCSuiteReport } from './components/ReportGenerator';

const Analytics = ({ threats, endpoints }) => {
  const [isGenerating, setIsGenerating] = useState(false);

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
      <div className="flex justify-between items-center">
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
