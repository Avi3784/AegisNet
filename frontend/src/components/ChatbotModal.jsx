import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Loader2, Sparkles, BookOpen, ShieldAlert } from 'lucide-react';

const ChatbotModal = ({ isOpen, onClose, initialContext, token }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([{
        role: 'assistant',
        content: `AegisNet Security AI here. You're investigating a ${initialContext.attack_type || 'threat'}. Ask me anything about mitigation, impact, or next steps.`
      }]);
    } else {
      setMessages([]);
      setActiveTab('chat');
    }
  }, [isOpen, initialContext]);

  useEffect(() => {
    if (scrollRef.current && activeTab === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const fetchReply = async (history) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: history[history.length - 1].content })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const newMsg = { role: 'user', content: input };
    const newHistoryUI = [...messages, newMsg];
    setMessages(newHistoryUI);
    setInput('');
    
    let historyForAPI = newHistoryUI;
    if (messages.length === 1) {
      historyForAPI = [
        { role: 'assistant', content: messages[0].content },
        { role: 'user', content: `[SYSTEM CONTEXT - Threat: ${initialContext.attack_type || 'Unknown'}. Analysis: ${initialContext.analysis || 'None'}. Mitigation: ${initialContext.mitigation || 'None'}] \n\nUser Question: ${input}` }
      ];
    }
    
    fetchReply(historyForAPI);
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#060a13]/70 backdrop-blur-sm"
        />
        
        {/* Side Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 z-50 bg-[#0a0f1a] border-l border-violet-500/15 w-full max-w-md h-full shadow-[0_0_60px_rgba(139,92,246,0.1)] flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#0d1424] p-4 border-b border-slate-700/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-2 rounded-xl border border-violet-500/25">
                  <Sparkles className="text-violet-400" size={22} />
                </div>
                <div>
                  <h3 className="text-slate-100 font-bold text-base">Aegis Sentinel</h3>
                  <p className="text-slate-500 text-[11px]">AI Copilot & Manual</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="text-slate-500 hover:text-white transition p-1"
              >
                <X size={20} />
              </motion.button>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md flex justify-center items-center gap-2 transition-all ${activeTab === 'chat' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Bot size={14} /> AI Chat
              </button>
              <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md flex justify-center items-center gap-2 transition-all ${activeTab === 'manual' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <BookOpen size={14} /> System Manual
              </button>
            </div>
          </div>

          {activeTab === 'chat' ? (
            <>
              {/* Chat Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.map((m, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-br-md'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/30 rounded-bl-md'
                    }`}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800/80 text-slate-400 border border-slate-700/30 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm">
                      <Loader2 className="animate-spin text-violet-400" size={16} /> Analyzing...
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-[#0d1424] border-t border-slate-700/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about this threat..."
                    className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-500"
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2.5 rounded-xl transition disabled:opacity-40 shadow-lg shadow-violet-900/30"
                  >
                    <Send size={18} />
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            /* System Manual Area */
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-slate-300">
              
              <div className="border-l-2 border-cyan-500 pl-4 py-1">
                <h4 className="font-bold text-cyan-400 mb-1">What is AegisNet?</h4>
                <p className="text-sm leading-relaxed text-slate-400">
                  AegisNet is a smart security system that protects ATM networks. It uses Artificial Intelligence to check network traffic live and stops attackers immediately.
                </p>
              </div>

              <div className="border-l-2 border-fuchsia-500 pl-4 py-1">
                <h4 className="font-bold text-fuchsia-400 mb-1">Glossary of Terms</h4>
                <ul className="text-sm space-y-3 mt-3 text-slate-400">
                  <li>
                    <strong className="text-slate-200">DEFCON 1 (Emergency Network Isolation):</strong> 
                    <br/>This is the ultimate emergency button. If the entire network is under severe attack, clicking this completely disconnects all ATMs from the network to stop the hackers. No traffic goes in or out.
                  </li>
                  <li>
                    <strong className="text-slate-200">Normal (Safe Traffic):</strong> 
                    <br/>Regular, safe data flowing through the network. The system ignores this because it is not dangerous.
                  </li>
                  <li>
                    <strong className="text-slate-200">Stratified Cross-Validation (Model Proofs):</strong> 
                    <br/>This is mathematical proof that the AI is accurate. It means we tested the AI multiple times on different parts of the dataset to ensure it actually catches attacks, rather than just guessing.
                  </li>
                  <li>
                    <strong className="text-slate-200">MITRE ATT&CK:</strong> 
                    <br/>A global list of common hacker techniques. AegisNet maps endpoint events (like someone trying to open PowerShell on an ATM) to this list to prove the attack is real.
                  </li>
                  <li>
                    <strong className="text-slate-200">Endpoint Telemetry:</strong> 
                    <br/>Logs and data sent directly from the ATM computers themselves, showing exactly what files and programs are running.
                  </li>
                </ul>
              </div>

              <div className="border-l-2 border-emerald-500 pl-4 py-1">
                <h4 className="font-bold text-emerald-400 mb-1">Threat Simulator</h4>
                <p className="text-sm leading-relaxed text-slate-400">
                  You can safely test the system by going to Settings -{'>'} Simulation. This lets you fire fake attacks to see how AegisNet reacts and blocks them.
                </p>
              </div>

            </div>
          )}

        </motion.div>
      </>
      )}
    </AnimatePresence>
  );
};

export default ChatbotModal;
