import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, ShieldOff, Clock } from 'lucide-react';

const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
};

const Sparkline = ({ color }) => (
  <svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none" className="opacity-40">
    <path 
      d="M0 24 L0 12 Q 10 24, 25 12 T 50 12 T 75 16 T 100 8 L100 24 Z" 
      fill={`url(#gradient-${color.replace('#','')})`} 
    />
    <path 
      d="M0 12 Q 10 24, 25 12 T 50 12 T 75 16 T 100 8" 
      fill="none" 
      stroke={color} 
      strokeWidth="2" 
    />
    <defs>
      <linearGradient id={`gradient-${color.replace('#','')}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient>
    </defs>
  </svg>
);

const StatCard = ({ title, value, icon: Icon, bgGradient, glowColor, delay, formatValue, sparklineColor }) => {
  const isZero = value === 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 150 }}
      whileHover={{ scale: 1.03, y: -4, boxShadow: `0 0 30px ${glowColor}60` }}
      className={`relative overflow-hidden p-5 rounded-2xl flex flex-col justify-between border border-slate-700/30 ${bgGradient} backdrop-blur-xl group cursor-default`}
      style={{ boxShadow: `0 0 15px ${glowColor}15` }}
    >
      <div className="scan-line"></div>
      
      <div className="flex items-center justify-between z-10 mb-4">
        <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest">{title}</p>
        <div className="p-2 rounded-xl bg-white/10 shadow-lg" style={{ boxShadow: `0 4px 15px ${glowColor}40` }}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      
      <div className="z-10 mb-6">
        {isZero ? (
          <div className="h-9 w-24 skeleton"></div>
        ) : (
          <h3 className="text-3xl font-black text-slate-50 tracking-tight">
            {formatValue ? formatValue(value) : <AnimatedCounter value={value} />}
          </h3>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-0 h-10 flex items-end">
        <Sparkline color={sparklineColor} />
      </div>
    </motion.div>
  );
};

const StatsOverview = ({ totalFlows, threatCount, blockedCount }) => {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard 
        title="Flows Scanned" 
        value={totalFlows} 
        icon={Activity} 
        bgGradient="bg-gradient-to-br from-[#0d1424] to-cyan-900/40" 
        glowColor="#06b6d4"
        sparklineColor="#06b6d4"
        delay={0}
      />
      <StatCard 
        title="Threats Detected" 
        value={threatCount} 
        icon={ShieldAlert} 
        bgGradient="bg-gradient-to-br from-[#0d1424] to-rose-900/40" 
        glowColor="#f43f5e"
        sparklineColor="#f43f5e"
        delay={0.1}
      />
      <StatCard 
        title="IPs Auto-Blocked" 
        value={blockedCount} 
        icon={ShieldOff} 
        bgGradient="bg-gradient-to-br from-[#0d1424] to-violet-900/40" 
        glowColor="#8b5cf6"
        sparklineColor="#8b5cf6"
        delay={0.2}
      />
      <StatCard 
        title="System Uptime" 
        value={uptime} 
        icon={Clock} 
        bgGradient="bg-gradient-to-br from-[#0d1424] to-amber-900/40" 
        glowColor="#f59e0b"
        sparklineColor="#f59e0b"
        formatValue={formatUptime}
        delay={0.3}
      />
    </div>
  );
};

export default StatsOverview;
