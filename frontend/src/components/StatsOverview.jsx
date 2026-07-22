import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, ShieldAlert, Crosshair } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass, glowColor, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 150 }}
    whileHover={{ scale: 1.03, y: -4 }}
    className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 p-5 rounded-2xl flex items-center justify-between overflow-hidden relative group cursor-default"
    style={{ boxShadow: `0 0 20px ${glowColor}15, inset 0 1px 0 rgba(255,255,255,0.05)` }}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-700`} />
    <div className="absolute bottom-0 left-0 right-0 h-[2px]">
      <motion.div 
        className={`h-full bg-gradient-to-r ${colorClass}`}
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ delay: delay + 0.3, duration: 1.2, ease: 'easeOut' }}
      />
    </div>
    <div className="relative z-10">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-50 tracking-tight">{value}</h3>
    </div>
    <div className={`relative z-10 p-3 rounded-xl bg-gradient-to-br ${colorClass} shadow-lg`} style={{ boxShadow: `0 4px 15px ${glowColor}40` }}>
      <Icon size={22} className="text-white" />
    </div>
  </motion.div>
);

const StatsOverview = ({ totalFlows, threatCount, blockedCount }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard 
        title="Flows Scanned" 
        value={totalFlows.toLocaleString()} 
        icon={Activity} 
        colorClass="from-cyan-500 to-blue-600" 
        glowColor="#06b6d4"
        delay={0}
      />
      <StatCard 
        title="Threats Detected" 
        value={threatCount.toLocaleString()} 
        icon={ShieldAlert} 
        colorClass="from-rose-500 to-orange-500" 
        glowColor="#f43f5e"
        delay={0.1}
      />
      <StatCard 
        title="IPs Auto-Blocked" 
        value={blockedCount.toLocaleString()} 
        icon={Crosshair} 
        colorClass="from-violet-500 to-fuchsia-500" 
        glowColor="#8b5cf6"
        delay={0.2}
      />
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
        whileHover={{ scale: 1.03, y: -4 }}
        className="bg-[#0d1424]/80 backdrop-blur-xl border border-rose-500/50 p-5 rounded-2xl flex items-center justify-between overflow-hidden relative group cursor-default shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-amber-500 opacity-10" />
        <div className="relative z-10">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1 text-rose-300">UEBA Risk Score</p>
          <h3 className="text-3xl font-black text-rose-400 tracking-tight">98%</h3>
          <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">Insider Threat Active</p>
        </div>
        <div className="relative z-10 p-3 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 shadow-[0_4px_15px_rgba(244,63,94,0.4)]">
          <ShieldAlert size={22} className="text-white" />
        </div>
      </motion.div>
    </div>
  );
};

export default StatsOverview;
