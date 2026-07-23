import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Cpu, ShieldCheck, Save, RefreshCw, Check, Zap, Sliders, 
  Lock, Radio, CheckCircle2, AlertTriangle, Server, Activity,
  Power, Key, Database, Trash2
} from 'lucide-react';

export default function Settings({ token }) {
  const [activeTab, setActiveTab] = useState('alerts');

  // Alerts State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savedAlerts, setSavedAlerts] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState('critical');

  // Machine Learning State
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainProgress, setRetrainProgress] = useState(0);
  const [retrainCompleted, setRetrainCompleted] = useState(false);
  const [retrainStep, setRetrainStep] = useState('');

  // Firewall State
  const [strictMode, setStrictMode] = useState(false);
  
  // Playbooks State
  const [playbooks, setPlaybooks] = useState([
    { id: 'pb1', title: 'Auto-Isolate on PowerShell Execution', desc: 'Isolates endpoint immediately if suspicious PowerShell scripts are detected.', active: true },
    { id: 'pb2', title: 'Alert on Ransomware File Extensions', desc: 'Sends critical alert to webhook if known ransomware file extensions are created.', active: true },
    { id: 'pb3', title: 'Kill Unknown Processes in Temp', desc: 'Automatically terminates unverified executables launched from temporary directories.', active: false },
    { id: 'pb4', title: 'Suspend Suspicious Admin Logins', desc: 'Locks accounts exhibiting abnormal login behavior outside of business hours.', active: false },
  ]);

  // Advanced Controls State
  const [killSwitch, setKillSwitch] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.85);
  const [retentionDays, setRetentionDays] = useState(30);

  const togglePlaybook = (id) => {
    setPlaybooks(prev => prev.map(pb => pb.id === id ? { ...pb, active: !pb.active } : pb));
  };

  useEffect(() => {
    // Fetch settings on mount
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.webhook_url) setWebhookUrl(data.webhook_url);
        if (data.strict_firewall !== undefined) setStrictMode(data.strict_firewall);
      })
      .catch(err => console.error("Failed to load settings", err));
  }, [token]);

  // Handle Save Webhook
  const handleSaveAlerts = async (e) => {
    if (e) e.preventDefault();
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });
      setSavedAlerts(true);
      setTimeout(() => setSavedAlerts(false), 3000);
    } catch (err) {
      console.error("Failed to save webhook", err);
    }
  };

  const handleToggleStrictMode = async () => {
    const newVal = !strictMode;
    setStrictMode(newVal);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ strict_firewall: newVal })
      });
    } catch (err) {
      console.error("Failed to save strict mode", err);
    }
  };

  // Handle Force Retrain Model
  const handleRetrainModel = () => {
    if (isRetraining) return;
    setIsRetraining(true);
    setRetrainProgress(0);
    setRetrainCompleted(false);
    setRetrainStep('Loading packet capture telemetry...');

    const startTime = Date.now();
    const duration = 3000; // 3 seconds simulation

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setRetrainProgress(progress);

      if (progress < 35) {
        setRetrainStep('Loading packet capture telemetry & extracting feature vectors...');
      } else if (progress < 75) {
        setRetrainStep('Training ensemble neural classifier & tuning weights...');
      } else if (progress < 100) {
        setRetrainStep('Evaluating validation accuracy & compiling pipeline...');
      } else {
        clearInterval(interval);
        setIsRetraining(false);
        setRetrainCompleted(true);
        setRetrainStep('Model retrained & deployed to edge nodes (v2.4.9)');
        setTimeout(() => {
          setRetrainCompleted(false);
        }, 5000);
      }
    }, 50);
  };

  const tabs = [
    { id: 'alerts', label: 'Alerts', icon: Bell, color: 'from-violet-500 to-fuchsia-500' },
    { id: 'ml', label: 'Machine Learning', icon: Cpu, color: 'from-fuchsia-500 to-cyan-500' },
    { id: 'firewall', label: 'Firewall', icon: ShieldCheck, color: 'from-cyan-500 to-emerald-500' },
    { id: 'playbooks', label: 'Playbooks', icon: Zap, color: 'from-blue-500 to-indigo-500' },
    { id: 'advanced', label: 'Advanced', icon: Power, color: 'from-rose-500 to-orange-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-6 p-2 md:p-6"
    >
      {/* Settings Header banner */}
      <div className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.08)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-600/10 via-fuchsia-600/10 to-transparent blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-5 h-5 text-violet-400" />
              <span className="text-xs uppercase tracking-widest text-violet-400 font-bold">System Configuration</span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">Security & Intelligence Settings</h2>
            <p className="text-slate-400 text-sm mt-1">Manage webhooks, model retraining cycles, and automated firewall strictness.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-medium text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Policy Engine: Active</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 relative ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/40 hover:bg-slate-800/50 border border-slate-800/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.color} rounded-xl opacity-90 -z-10`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {activeTab === 'alerts' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(139,92,246,0.05)] space-y-6"
          >
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Bell className="text-violet-400" size={20} />
                Alert Notification Channels
              </h3>
              <p className="text-slate-400 text-xs mt-1">Configure automated webhook endpoints to receive real-time ATM fraud detections.</p>
            </div>

            <form onSubmit={handleSaveAlerts} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Webhook Dispatch URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/api/webhook"
                    className="w-full bg-[#060a13] border border-slate-700/60 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all font-mono"
                    required
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1.5">Payloads are dispatched via HTTP POST with HMAC-SHA256 signature.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-slate-300">Minimum Alert Threshold</span>
                  <select 
                    value={alertSeverity} 
                    onChange={(e) => setAlertSeverity(e.target.value)}
                    className="w-full bg-[#060a13] border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 mt-1 outline-none focus:border-violet-500"
                  >
                    <option value="all">All Events (Info, Warning, Critical)</option>
                    <option value="warning">Warning & Critical Only</option>
                    <option value="critical">Critical ATM Fraud Only (Recommended)</option>
                  </select>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-300">Live Socket Fallback</p>
                    <p className="text-[11px] text-slate-500">Retry failed webhooks up to 5 times</p>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                    Enabled
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-violet-900/30 transition-all"
                >
                  <Save size={16} />
                  Save Webhook URL
                </motion.button>

                <AnimatePresence>
                  {savedAlerts && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-bold"
                    >
                      <Check size={14} />
                      Webhook settings saved successfully!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'ml' && (
          <motion.div
            key="ml"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(236,72,153,0.05)] space-y-6"
          >
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Cpu className="text-fuchsia-400" size={20} />
                Machine Learning Model Operations
              </h3>
              <p className="text-slate-400 text-xs mt-1">Force retraining of the anomaly detection neural net using captured live traffic flows.</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Model Status: Active Classifier</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Current Model: <span className="font-mono text-fuchsia-400">Aegis-RF-v2.4.8</span> | Last Retrained: <span className="text-slate-300">2 hours ago</span></p>
                </div>
                
                <motion.button
                  whileHover={{ scale: isRetraining ? 1 : 1.03 }}
                  whileTap={{ scale: isRetraining ? 1 : 0.97 }}
                  onClick={handleRetrainModel}
                  disabled={isRetraining}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                    isRetraining
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white shadow-fuchsia-900/30'
                  }`}
                >
                  <RefreshCw size={16} className={isRetraining ? 'animate-spin' : ''} />
                  {isRetraining ? 'Retraining Model...' : 'Force Retrain Model'}
                </motion.button>
              </div>

              {/* Progress Bar & Status */}
              {(isRetraining || retrainProgress > 0 || retrainCompleted) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2 pt-2 border-t border-slate-800/80"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      {isRetraining && <Zap size={13} className="text-fuchsia-400 animate-bounce" />}
                      {retrainStep}
                    </span>
                    <span className="font-mono font-bold text-cyan-400">{retrainProgress}%</span>
                  </div>

                  {/* Outer Bar */}
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                      initial={{ width: '0%' }}
                      animate={{ width: `${retrainProgress}%` }}
                      transition={{ ease: 'linear' }}
                    />
                  </div>

                  {retrainCompleted && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl font-semibold mt-2"
                    >
                      <CheckCircle2 size={16} />
                      Retraining complete! New decision boundary parameters have been synchronized.
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Accuracy Score</span>
                <p className="text-2xl font-black text-slate-100 mt-1">99.4%</p>
                <p className="text-[11px] text-emerald-400 font-medium mt-0.5">+0.3% post-retrain</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Inference Latency</span>
                <p className="text-2xl font-black text-slate-100 mt-1">1.2 ms</p>
                <p className="text-[11px] text-cyan-400 font-medium mt-0.5">Real-time edge processing</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Training Samples</span>
                <p className="text-2xl font-black text-slate-100 mt-1">450,210</p>
                <p className="text-[11px] text-violet-400 font-medium mt-0.5">Synthetic & live flow mix</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'firewall' && (
          <motion.div
            key="firewall"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.05)] space-y-6"
          >
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="text-cyan-400" size={20} />
                Automated Firewall Rules & Strict Mode
              </h3>
              <p className="text-slate-400 text-xs mt-1">Configure automated active defense enforcement and IP filtering policies.</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-6">
              {/* Strict Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-100">Strict Enforcement Mode</h4>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      strictMode 
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {strictMode ? 'STRICT ACTIVE' : 'STANDARD'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Immediately block IPs sending flagged payload patterns upon first detection without human review.
                  </p>
                </div>

                {/* Animated Toggle Switch */}
                <button
                  type="button"
                  onClick={handleToggleStrictMode}
                  className={`w-16 h-9 rounded-full p-1 transition-colors duration-300 relative focus:outline-none border ${
                    strictMode 
                      ? 'bg-gradient-to-r from-rose-600 to-fuchsia-600 border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <motion.div
                    className="w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center"
                    animate={{ x: strictMode ? 28 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {strictMode ? (
                      <Lock size={14} className="text-rose-600" />
                    ) : (
                      <ShieldCheck size={14} className="text-slate-500" />
                    )}
                  </motion.div>
                </button>
              </div>

              {/* Status details when toggled */}
              <div className={`p-4 rounded-xl border transition-all ${
                strictMode 
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' 
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className={`w-5 h-5 shrink-0 ${strictMode ? 'text-rose-400' : 'text-slate-500'}`} />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">
                      {strictMode ? 'Strict Mode Policy Active' : 'Standard Protection Mode'}
                    </p>
                    <p className={strictMode ? 'text-rose-300/80' : 'text-slate-500'}>
                      {strictMode
                        ? 'All ingress ATM transactions with an anomaly score > 0.65 are automatically dropped at iptables layer. Automatic TCP RST sent to origin IP.'
                        : 'Traffic anomalies trigger cognitive warnings and real-time dashboard notifications. Automated blocking requires analyst confirmation.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'playbooks' && (
          <motion.div
            key="playbooks"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0d1424]/80 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(59,130,246,0.05)] space-y-6"
          >
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Zap className="text-blue-400" size={20} />
                SOAR Playbooks & Response Rules
              </h3>
              <p className="text-slate-400 text-xs mt-1">Configure automated incident response actions for detected threats.</p>
            </div>

            <div className="space-y-4">
              {playbooks.map((playbook) => (
                <div key={playbook.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{playbook.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{playbook.desc}</p>
                  </div>
                  <button 
                    onClick={() => togglePlaybook(playbook.id)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${playbook.active ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${playbook.active ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'advanced' && (
          <motion.div
            key="advanced"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0d1424]/80 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(244,63,94,0.1)] space-y-6"
          >
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-rose-500 flex items-center gap-2 uppercase tracking-wide">
                <Power className="text-rose-500" size={20} />
                God Mode Controls
              </h3>
              <p className="text-slate-400 text-xs mt-1">Extreme caution advised. These settings bypass normal operation.</p>
            </div>

            <div className="space-y-6">
              {/* Kill Switch */}
              <div className="bg-rose-950/20 border border-rose-900/50 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                <div>
                  <h4 className="text-base font-bold text-rose-400 flex items-center gap-2">
                    <AlertTriangle size={18} /> Global Network Kill Switch
                  </h4>
                  <p className="text-xs text-rose-300/70 mt-1 max-w-md">
                    Instantly block all ingress/egress traffic to the ATM fleet except management subnets. Triggers immediate DEFCON 1 protocol.
                  </p>
                </div>
                <button
                  onClick={() => setKillSwitch(!killSwitch)}
                  className={`relative px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl overflow-hidden ${
                    killSwitch 
                      ? 'bg-rose-600 text-white shadow-rose-900/50 border border-rose-400' 
                      : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-rose-500/50'
                  }`}
                >
                  {killSwitch && (
                    <motion.div 
                      className="absolute inset-0 bg-white opacity-20"
                      animate={{ opacity: [0, 0.3, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  )}
                  {killSwitch ? 'LOCKDOWN ACTIVE' : 'ENGAGE LOCKDOWN'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sensitivity Slider */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Activity size={16} className="text-amber-400" />
                    Threat Sensitivity Threshold
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 mb-4">Lower values flag more anomalies (higher false positives).</p>
                  
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0.1" max="0.99" step="0.01" 
                      value={sensitivity}
                      onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                      {sensitivity.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Data Retention */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Database size={16} className="text-cyan-400" />
                    Data Retention Policy
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 mb-4">Automatically purge PCAP and flow logs after X days.</p>
                  
                  <div className="flex items-center gap-3">
                    <select 
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                      className="bg-[#060a13] border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:border-cyan-500 outline-none"
                    >
                      <option value={7}>7 Days</option>
                      <option value={30}>30 Days</option>
                      <option value={90}>90 Days</option>
                      <option value={365}>1 Year</option>
                    </select>
                    <button className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 rounded-lg border border-rose-500/20 transition-colors">
                      <Trash2 size={12} /> Purge Now
                    </button>
                  </div>
                </div>
              </div>

              {/* RBAC */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
                  <Key size={16} className="text-violet-400" />
                  Access Control (RBAC)
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#060a13] border border-slate-800 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 text-violet-400 font-bold text-xs">S1</div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">System Admin</p>
                        <p className="text-[10px] text-emerald-400">Current Session</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400">Full Access</span>
                  </div>

                  <div className="flex items-center justify-between bg-[#060a13] border border-slate-800 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 font-bold text-xs">T1</div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">API Key: SIEM Integration</p>
                        <p className="text-[10px] text-slate-500">Last used: 2 mins ago</p>
                      </div>
                    </div>
                    <button className="text-[10px] px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded font-bold hover:bg-rose-500/20 transition-colors">Revoke</button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
