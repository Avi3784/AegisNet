import React from 'react';
import { motion } from 'framer-motion';

export default function DefconBanner({ hasApt }) {
  if (hasApt) {
    return (
      <motion.div
        animate={{ backgroundColor: ['#9f1239', '#e11d48', '#9f1239'] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="w-full text-center py-1 text-xs font-black uppercase tracking-widest text-white z-50 relative shadow-[0_0_15px_rgba(225,29,72,0.5)]"
      >
        DEFCON 2 - ADVANCED PERSISTENT THREAT DETECTED
      </motion.div>
    );
  }

  return (
    <div className="w-full text-center py-1 text-xs font-black uppercase tracking-widest text-emerald-100 bg-emerald-900/40 border-b border-emerald-500/20 z-50 relative shadow-[0_0_10px_rgba(16,185,129,0.2)]">
      DEFCON 5 - NORMAL OPERATIONS
    </div>
  );
}
