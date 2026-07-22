import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, CheckCircle2, ShieldAlert, Copy, Check, HelpCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import ChatbotModal from './ChatbotModal';
import MitreMatrix from './MitreMatrix';

const CognitivePanel = ({ latestThreat, token }) => {
  const [copied, setCopied] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState(null); // null | 'submitting' | 'thankyou'
  
  const report = latestThreat?.cognitive_report;
  
  useEffect(() => {
    setFeedbackState(null);
    if (!report?.Threat_Analysis) {
      setTypedText("");
      return;
    }
    setTypedText(report.Threat_Analysis);
  }, [latestThreat?.timestamp, report]);

  const handleFeedback = async (isTruePositive) => {
    if (!latestThreat?.timestamp) return;
    setFeedbackState('submitting');
    try {
      await fetch('http://localhost:8000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          threat_id: latestThreat.timestamp,
          is_true_positive: isTruePositive,
          features: latestThreat?.flow || {}
        })
      });
    } catch (e) {
      console.error('Failed to send feedback', e);
    } finally {
      setFeedbackState('thankyou');
      setTimeout(() => {
        setFeedbackState(null);
      }, 4000);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    const text = `THREAT REPORT: ${latestThreat.attack_type}\n\nANALYSIS: ${report.Threat_Analysis}\n\nCONFIDENCE: ${report.Confidence_Validation}\n\nMITIGATION:\n- ${report.Recommended_Mitigation.join('\n- ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 flex flex-col h-[400px]" style={{ boxShadow: '0 0 30px rgba(139,92,246,0.06)' }}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/30 flex-wrap gap-2">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BrainCircuit className="text-violet-400" size={20} />
          Cognitive AI Analysis
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(true)}
            disabled={!report}
            className="text-xs bg-gradient-to-r from-violet-600/40 to-fuchsia-600/40 hover:from-violet-500/50 hover:to-fuchsia-500/50 text-violet-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 border border-violet-500/20 font-medium"
          >
            <HelpCircle size={14} />
            Need Help?
          </motion.button>

          {feedbackState === 'thankyou' ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-500/30 font-bold flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
              Thank you!
            </motion.div>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFeedback(true)}
                disabled={!report || feedbackState === 'submitting'}
                className="text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 border border-emerald-500/30 font-medium"
              >
                <ThumbsUp size={13} className="text-emerald-400" />
                True Positive
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFeedback(false)}
                disabled={!report || feedbackState === 'submitting'}
                className="text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 border border-rose-500/30 font-medium"
              >
                <ThumbsDown size={13} className="text-rose-400" />
                False Positive
              </motion.button>
            </>
          )}

          <button 
            onClick={handleCopy}
            disabled={!report}
            className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-40 border border-slate-700/30"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {!report ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm flex-col gap-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <BrainCircuit size={48} className="text-slate-700" />
            </motion.div>
            <p>Waiting for threat detection...</p>
          </div>
        ) : (
          <motion.div 
            key={latestThreat.timestamp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Target Identified</h4>
              <p className="text-rose-400 font-bold text-base">{latestThreat.attack_type}</p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <ShieldAlert size={14} className="text-amber-400" /> Threat Analysis
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-violet-500/40 pl-3 py-1">
                {typedText.split('[OSINT: APT DETECTED]').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="text-rose-500 font-bold bg-rose-950/40 px-1 rounded mx-1">
                        [OSINT: APT DETECTED]
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <CheckCircle2 size={14} className="text-emerald-400" /> Confidence
              </h4>
              <p className="text-emerald-300 text-sm bg-emerald-900/20 inline-block px-3 py-1 rounded-lg border border-emerald-500/20">
                {report.Confidence_Validation}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Recommended Mitigation</h4>
              <ul className="space-y-2">
                {report.Recommended_Mitigation.map((step, i) => (
                  <motion.li 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    key={i} 
                    className="text-sm text-slate-300 flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/30"
                  >
                    <span className="text-violet-400 font-bold mt-0.5 text-xs">{i + 1}.</span>
                    <span>{step}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            
            <MitreMatrix activeTechniques={report.MITRE_Techniques || []} />
          </motion.div>
        )}
      </div>
      
      {report && (
        <ChatbotModal 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          token={token}
          initialContext={{
            attack_type: latestThreat.attack_type,
            analysis: report.Threat_Analysis,
            mitigation: report.Recommended_Mitigation.join(', ')
          }} 
        />
      )}
    </div>
  );
};

export default CognitivePanel;
