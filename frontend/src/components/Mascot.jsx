import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MASCOT_STATES = {
  happy: {
    color: '#3b82f6', // Blue
    secondary: '#8b5cf6', // Violet
    glow: 'rgba(59, 130, 246, 0.5)',
    eyeStyle: 'happy', // ◕‿◕
    message: ['I\'m your trusty Shield! uwu', 'Vault is secure! ✨', 'Standing guard...', 'No baddies in sight! 🚀', 'All systems protected!'],
  },
  alert: {
    color: '#f97316', // Orange
    secondary: '#f59e0b', // Amber
    glow: 'rgba(249, 115, 22, 0.6)',
    eyeStyle: 'alert', // ⊙△⊙
    message: ['Shield taking damage! 😰', 'Bracing for impact...', 'Who goes there?! 🚨', 'Defending the perimeter!'],
  },
  apt: {
    color: '#ef4444', // Red
    secondary: '#b91c1c', // Dark red
    glow: 'rgba(239, 68, 68, 0.8)',
    eyeStyle: 'apt', // ✕‿✕
    message: ['CRITICAL BREACH!! 💀', 'SHIELDS FAILING! 😱', 'Intruder alert! Call backup!', 'MAXIMUM DEFENSE ACTIVATED!'],
  }
};

export default function Mascot({ isUnderAttack, hasApt, onOpenChat }) {
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
        <div className="flex justify-between w-full px-2 mt-2">
          <motion.div animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} className="w-2.5 h-3 bg-white rounded-full" />
          <motion.div animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} className="w-2.5 h-3 bg-white rounded-full" />
        </div>
      );
    } else if (mascot.eyeStyle === 'alert') {
      return (
        <div className="flex justify-between w-full px-1.5 mt-2">
          <div className="w-3 h-3 border-2 border-white rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full" /></div>
          <div className="w-3 h-3 border-2 border-white rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full" /></div>
        </div>
      );
    } else {
      // APT Xs
      return (
        <div className="flex justify-between w-full px-1.5 mt-2 text-white font-black text-xs leading-none drop-shadow-[0_0_5px_white]">
          <span>✕</span>
          <span>✕</span>
        </div>
      );
    }
  };

  return (
    <motion.div
      className="fixed bottom-6 z-50 select-none cursor-pointer group"
      onClick={onOpenChat}
      whileHover={{ scale: 1.1 }}
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
              className="px-4 py-2 rounded-2xl text-[12px] font-bold border backdrop-blur-md shadow-xl"
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

      {/* Shield Mascot SVG container */}
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
        className="relative w-16 h-20 flex flex-col items-center justify-center"
      >
        {/* Siren for APT */}
        <AnimatePresence>
          {state === 'apt' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute -top-3 w-4 h-3 bg-red-500 rounded-t-lg border-b-2 border-red-900 overflow-hidden z-20"
              style={{ boxShadow: '0 0 20px red' }}
            >
              <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }} className="w-full h-full bg-white opacity-80" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Shield Bits (like tech armor) */}
        <div className="absolute top-2 w-full flex justify-between px-0.5 z-0">
          <motion.div 
            animate={state === 'happy' ? { y: [-2, 2, -2] } : { y: 5, x: 2, rotate: -20 }} 
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-6 rounded-sm"
            style={{ backgroundColor: mascot.secondary, boxShadow: `0 0 10px ${mascot.secondary}` }}
          />
          <motion.div 
            animate={state === 'happy' ? { y: [-2, 2, -2] } : { y: 5, x: -2, rotate: 20 }} 
            transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-6 rounded-sm"
            style={{ backgroundColor: mascot.secondary, boxShadow: `0 0 10px ${mascot.secondary}` }}
          />
        </div>

        {/* Main Shield Body (SVG Path) */}
        <div className="relative z-10 w-14 h-16 drop-shadow-2xl flex flex-col items-center justify-start pt-3"
          style={{ filter: `drop-shadow(0 0 15px ${mascot.glow})` }}
        >
          <svg viewBox="0 0 100 120" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={mascot.color} />
                <stop offset="100%" stopColor={mascot.secondary} />
              </linearGradient>
              <linearGradient id="shieldInner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
              </linearGradient>
            </defs>
            {/* Outer metallic rim */}
            <path d="M50,0 L95,15 C95,55 80,95 50,120 C20,95 5,55 5,15 Z" fill="url(#shieldGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
            {/* Inner plate */}
            <path d="M50,8 L87,20 C87,55 75,87 50,108 C25,87 13,55 13,20 Z" fill="url(#shieldInner)" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
            {/* Glowing core line */}
            <path d="M50,8 L50,108" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          </svg>

          {/* Cute Shield Face */}
          <div className="relative z-20 w-8 h-8 flex flex-col items-center">
            <Eyes />
            {/* Cute blush for happy state */}
            {state === 'happy' && (
              <div className="w-full flex justify-between px-0.5 mt-0.5 opacity-80">
                <div className="w-2 h-1 bg-white/50 rounded-full blur-[1px]" />
                <div className="w-2 h-1 bg-white/50 rounded-full blur-[1px]" />
              </div>
            )}
          </div>
        </div>

        {/* Hover Shadow / Thruster beneath the shield */}
        <div className="absolute -bottom-3 w-8 flex justify-center -z-10">
          <motion.div 
            animate={{ 
              width: state === 'alert' ? [20, 30, 20] : state === 'apt' ? [25, 40, 25] : [15, 20, 15],
              opacity: [0.4, 0.8, 0.4]
            }} 
            transition={{ duration: state === 'happy' ? 1.5 : 0.2, repeat: Infinity }}
            className="h-2 rounded-[100%] blur-[3px]"
            style={{ backgroundColor: mascot.color, boxShadow: `0 0 15px ${mascot.color}` }}
          />
        </div>

      </motion.div>
    </motion.div>
  );
}
