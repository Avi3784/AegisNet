import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MASCOT_STATES = {
  happy: {
    color: '#06b6d4', // Cyan
    secondary: '#8b5cf6', // Violet
    glow: 'rgba(6, 182, 212, 0.4)',
    eyeStyle: 'happy', // ◕‿◕
    message: ['I\'ll protect your ATMs! uwu', 'Network is squeaky clean! ✨', 'Hovering around...', 'No baddies in sight! 🚀', 'All systems purring!'],
  },
  alert: {
    color: '#f97316', // Orange
    secondary: '#f59e0b', // Amber
    glow: 'rgba(249, 115, 22, 0.6)',
    eyeStyle: 'alert', // ⊙△⊙
    message: ['Uh oh! Something is wrong 😰', 'Investigating anomaly...', 'Who goes there?! 🚨', 'Protecting the vault!'],
  },
  apt: {
    color: '#ef4444', // Red
    secondary: '#b91c1c', // Dark red
    glow: 'rgba(239, 68, 68, 0.8)',
    eyeStyle: 'apt', // ✕‿✕
    message: ['APT DETECTED!! 💀', 'SHIELDS UP! DEFCON 1! 😱', 'Intruder alert! Call backup!', 'We are under heavy attack!'],
  }
};

export default function Mascot({ isUnderAttack, hasApt }) {
  const [posX, setPosX] = useState(80);
  const [direction, setDirection] = useState(1);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const intervalRef = useRef(null);
  const messageTimeoutRef = useRef(null);

  const state = hasApt ? 'apt' : isUnderAttack ? 'alert' : 'happy';
  const mascot = MASCOT_STATES[state];

  // Roaming movement
  useEffect(() => {
    if (state !== 'happy') return;
    
    intervalRef.current = setInterval(() => {
      setPosX(prev => {
        const newPos = prev + direction * (Math.random() * 3 + 1);
        if (newPos > 85) { setDirection(-1); return 84; }
        if (newPos < 5) { setDirection(1); return 6; }
        return newPos;
      });
    }, 100);
    
    return () => clearInterval(intervalRef.current);
  }, [direction, state]);

  // Scared - run to corner
  useEffect(() => {
    if (state === 'alert') {
      clearInterval(intervalRef.current);
      setPosX(92);
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 500);
    } else if (state === 'apt') {
      clearInterval(intervalRef.current);
      setPosX(5);
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 500);
    }
  }, [state]);

  // Periodic messages
  useEffect(() => {
    const showRandomMessage = () => {
      const msgs = mascot.message;
      setCurrentMessage(msgs[Math.floor(Math.random() * msgs.length)]);
      setShowMessage(true);
      messageTimeoutRef.current = setTimeout(() => setShowMessage(false), 3000);
    };

    showRandomMessage();
    const msgInterval = setInterval(showRandomMessage, state === 'happy' ? 8000 : 4000);
    
    return () => {
      clearInterval(msgInterval);
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, [state]);

  // Random jump when happy
  useEffect(() => {
    if (state !== 'happy') return;
    const jumpInterval = setInterval(() => {
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 400);
    }, 5000);
    return () => clearInterval(jumpInterval);
  }, [state]);

  // Eye component based on state
  const Eyes = () => {
    if (mascot.eyeStyle === 'happy') {
      return (
        <div className="flex justify-between w-full px-2">
          {/* Blink animation built into these */}
          <motion.div animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} className="w-2.5 h-3 bg-slate-900 rounded-full" />
          <motion.div animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} className="w-2.5 h-3 bg-slate-900 rounded-full" />
        </div>
      );
    } else if (mascot.eyeStyle === 'alert') {
      return (
        <div className="flex justify-between w-full px-1.5">
          <div className="w-3 h-3 border-2 border-slate-900 rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-slate-900 rounded-full" /></div>
          <div className="w-3 h-3 border-2 border-slate-900 rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-slate-900 rounded-full" /></div>
        </div>
      );
    } else {
      // APT Xs
      return (
        <div className="flex justify-between w-full px-1.5 text-slate-900 font-black text-[10px] leading-none">
          <span>✕</span>
          <span>✕</span>
        </div>
      );
    }
  };

  return (
    <motion.div
      className="fixed bottom-6 z-50 select-none pointer-events-none"
      animate={{ 
        left: `${posX}%`,
        y: isJumping ? -30 : 0,
      }}
      transition={{ 
        left: { type: 'spring', stiffness: 50, damping: 20 },
        y: { type: 'spring', stiffness: 300, damping: 10 },
      }}
      style={{ transform: `scaleX(${direction})` }}
    >
      {/* Speech bubble */}
      <AnimatePresence>
        {showMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-[110%] mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
            style={{ transform: `scaleX(${direction}) translateX(-50%)` }}
          >
            <div 
              className="px-4 py-2 rounded-2xl text-[12px] font-bold border backdrop-blur-md"
              style={{ 
                backgroundColor: `${mascot.color}15`,
                borderColor: `${mascot.color}50`,
                color: mascot.color,
                boxShadow: `0 0 20px ${mascot.glow}`,
              }}
            >
              {currentMessage}
            </div>
            <div 
              className="w-3 h-3 rotate-45 mx-auto -mt-1.5"
              style={{ backgroundColor: `${mascot.color}20`, borderRight: `1px solid ${mascot.color}50`, borderBottom: `1px solid ${mascot.color}50` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cyber-Pet Mascot SVG container */}
      <motion.div
        animate={
          state === 'alert' 
            ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 0.9, 1.1, 0.95, 1] } 
            : state === 'apt'
            ? { rotate: [-10, 10, -10, 10, -10, 10, 0], scale: [0.8, 1.1, 0.8, 1.1, 0.8] }
            : { y: [-3, 3, -3] }
        }
        transition={
          state === 'happy' 
            ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } 
            : { duration: 0.5, repeat: Infinity }
        }
        className="relative w-16 h-16 flex flex-col items-center justify-center"
      >
        {/* Siren for APT */}
        <AnimatePresence>
          {state === 'apt' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute -top-4 w-4 h-3 bg-red-600 rounded-t-lg border-b-2 border-red-900 overflow-hidden"
              style={{ boxShadow: '0 0 20px red' }}
            >
              <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }} className="w-full h-full bg-white opacity-80" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ears/Antennas */}
        <div className="absolute top-0 w-full flex justify-between px-1.5 z-0">
          <motion.div 
            animate={state === 'happy' ? { rotate: [-15, 15, -15] } : { rotate: -45, y: 5 }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-6 rounded-t-full origin-bottom border-2 border-slate-800"
            style={{ backgroundColor: mascot.secondary }}
          />
          <motion.div 
            animate={state === 'happy' ? { rotate: [15, -15, 15] } : { rotate: 45, y: 5 }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-6 rounded-t-full origin-bottom border-2 border-slate-800"
            style={{ backgroundColor: mascot.secondary }}
          />
        </div>

        {/* Main Body */}
        <div 
          className="w-14 h-12 rounded-3xl relative z-10 flex flex-col items-center justify-center border-2 border-slate-800 overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${mascot.color}, ${mascot.secondary})`,
            boxShadow: `0 0 25px ${mascot.glow}, inset -3px -3px 10px rgba(0,0,0,0.3), inset 3px 3px 10px rgba(255,255,255,0.4)`,
          }}
        >
          {/* Screen Face */}
          <div className="w-10 h-6 bg-cyan-50 border border-slate-800/20 rounded-xl mt-1 flex items-center justify-center px-1.5 overflow-hidden relative shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]">
            <div className="absolute inset-0 bg-slate-900 opacity-5 mix-blend-overlay" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #000 1px, #000 2px)', backgroundSize: '100% 2px' }} />
            <Eyes />
            {/* Cute blush for happy state */}
            {state === 'happy' && (
              <div className="absolute bottom-1 w-full flex justify-between px-0.5 opacity-60">
                <div className="w-1.5 h-1 bg-pink-500 rounded-full blur-[1px]" />
                <div className="w-1.5 h-1 bg-pink-500 rounded-full blur-[1px]" />
              </div>
            )}
          </div>
        </div>

        {/* Thruster Flame */}
        <div className="absolute -bottom-4 w-6 flex justify-center -z-10">
          <motion.div 
            animate={{ 
              height: state === 'alert' ? [15, 25, 15] : state === 'apt' ? [20, 35, 20] : [10, 15, 10],
              opacity: [0.6, 1, 0.6]
            }} 
            transition={{ duration: state === 'happy' ? 0.5 : 0.1, repeat: Infinity }}
            className="w-4 rounded-b-full blur-[2px]"
            style={{ 
              background: `linear-gradient(to bottom, ${mascot.color}, transparent)`,
              boxShadow: `0 0 15px ${mascot.color}`
            }}
          />
        </div>

      </motion.div>
    </motion.div>
  );
}
