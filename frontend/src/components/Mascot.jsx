import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MASCOT_STATES = {
  happy: {
    emoji: '🛡️',
    eyes: '◕‿◕',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.4)',
    message: ['All systems secure!', 'No threats detected ✨', 'Patrolling...', 'Everything looks good!', 'Network is clean 💪'],
  },
  alert: {
    emoji: '🛡️',
    eyes: '⊙△⊙',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.6)',
    message: ['THREAT DETECTED!', 'Taking cover! 😰', 'Red alert!!', 'Hostile activity! 🚨', 'Help me block this!'],
  },
  apt: {
    emoji: '🛡️',
    eyes: '✕‿✕',
    color: '#ff0000',
    glow: 'rgba(255, 0, 0, 0.8)',
    message: ['APT DETECTED!! 💀', 'Nation-state attack!', 'DEFCON 1!! 😱', 'Call reinforcements!'],
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

  return (
    <motion.div
      className="fixed bottom-4 z-50 select-none pointer-events-none"
      animate={{ 
        left: `${posX}%`,
        y: isJumping ? -20 : 0,
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
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
            style={{ transform: `scaleX(${direction}) translateX(-50%)` }}
          >
            <div 
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold border backdrop-blur-sm"
              style={{ 
                backgroundColor: `${mascot.color}15`,
                borderColor: `${mascot.color}40`,
                color: mascot.color,
                boxShadow: `0 0 15px ${mascot.glow}`,
              }}
            >
              {currentMessage}
            </div>
            <div 
              className="w-2 h-2 rotate-45 mx-auto -mt-1"
              style={{ backgroundColor: `${mascot.color}20`, borderRight: `1px solid ${mascot.color}40`, borderBottom: `1px solid ${mascot.color}40` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot body */}
      <motion.div
        animate={
          state === 'alert' 
            ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 0.9, 1.1, 0.95, 1] } 
            : state === 'apt'
            ? { rotate: [-10, 10, -10, 10, -10, 10, 0], scale: [0.8, 1.1, 0.8, 1.1, 0.8] }
            : { rotate: [0, -2, 0, 2, 0] }
        }
        transition={
          state === 'happy' 
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } 
            : { duration: 0.5, repeat: Infinity }
        }
        className="relative"
      >
        {/* Shield body */}
        <div 
          className="w-12 h-14 rounded-b-full rounded-t-lg flex flex-col items-center justify-center relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${mascot.color}30, ${mascot.color}10)`,
            border: `2px solid ${mascot.color}60`,
            boxShadow: `0 0 20px ${mascot.glow}, inset 0 0 15px ${mascot.color}10`,
          }}
        >
          {/* Scanning line effect when happy */}
          {state === 'happy' && (
            <div className="scan-line" style={{ position: 'absolute', zIndex: 1 }} />
          )}
          
          {/* Face */}
          <div className="text-[10px] font-mono tracking-tighter relative z-10" style={{ color: mascot.color }}>
            {mascot.eyes}
          </div>
          
          {/* Shield icon */}
          <div className="text-lg mt-0.5 relative z-10" style={{ filter: `drop-shadow(0 0 4px ${mascot.glow})` }}>
            {mascot.emoji}
          </div>
        </div>

        {/* Little feet */}
        <div className="flex justify-center gap-2 -mt-0.5">
          <motion.div
            animate={state === 'happy' ? { rotate: [-10, 10] } : { rotate: 0 }}
            transition={{ duration: 0.3, repeat: Infinity, repeatType: 'reverse' }}
            className="w-3 h-2 rounded-b-full"
            style={{ backgroundColor: `${mascot.color}50` }}
          />
          <motion.div
            animate={state === 'happy' ? { rotate: [10, -10] } : { rotate: 0 }}
            transition={{ duration: 0.3, repeat: Infinity, repeatType: 'reverse' }}
            className="w-3 h-2 rounded-b-full"
            style={{ backgroundColor: `${mascot.color}50` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
