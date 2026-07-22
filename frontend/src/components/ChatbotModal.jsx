import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react';

const ChatbotModal = ({ isOpen, onClose, initialContext, token }) => {
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
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        { role: 'user', content: `[SYSTEM CONTEXT - Threat: ${initialContext.attack_type}. Analysis: ${initialContext.analysis}. Mitigation: ${initialContext.mitigation}] \n\nUser Question: ${input}` }
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
          <div className="bg-[#0d1424] p-4 border-b border-slate-700/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-2 rounded-xl border border-violet-500/25">
                <Sparkles className="text-violet-400" size={22} />
              </div>
              <div>
                <h3 className="text-slate-100 font-bold text-base">AegisNet AI</h3>
                <p className="text-slate-500 text-[11px]">Security Operations Assistant</p>
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
        </motion.div>
      </>
      )}
    </AnimatePresence>
  );
};

export default ChatbotModal;
