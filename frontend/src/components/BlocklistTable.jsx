import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldBan } from 'lucide-react';

const BlocklistTable = ({ blockedIPs }) => {
  return (
    <div className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 flex flex-col h-[400px]" style={{ boxShadow: '0 0 30px rgba(244,63,94,0.04)' }}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/30">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <ShieldBan className="text-rose-400" size={20} />
          Active IP Blocklist
        </h3>
        <span className="text-xs font-bold bg-rose-500/15 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20">
          {blockedIPs.length} Blocked
        </span>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/30 text-xs uppercase text-slate-500 sticky top-0 bg-[#0a0f1a]/95 backdrop-blur">
              <th className="py-2 px-3 font-medium">IP Address</th>
              <th className="py-2 px-3 font-medium">Reason</th>
              <th className="py-2 px-3 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {blockedIPs.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-8 text-slate-500 text-sm">
                    No IPs blocked yet.
                  </td>
                </tr>
              ) : (
                blockedIPs.map((block, idx) => (
                  <motion.tr 
                    key={block.ip + block.timestamp}
                    initial={{ opacity: 0, backgroundColor: 'rgba(244,63,94,0.15)' }}
                    animate={{ opacity: 1, backgroundColor: 'transparent' }}
                    transition={{ duration: 1.5 }}
                    className="border-b border-slate-800/30 hover:bg-violet-500/5 transition-colors"
                  >
                    <td className="py-3 px-3 text-sm font-mono text-slate-300">
                      {block.ip}
                    </td>
                    <td className="py-3 px-3 text-sm text-rose-400">
                      {block.reason}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 text-right">
                      {new Date(block.timestamp).toLocaleTimeString()}
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlocklistTable;
