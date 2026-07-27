import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function AnimeBackground({ isAttack, hasApt }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous elements
    container.innerHTML = '';
    
    // Create grid elements
    const gridEl = document.createElement('div');
    gridEl.style.display = 'grid';
    const cols = Math.floor(window.innerWidth / 50);
    const rows = Math.floor(window.innerHeight / 50);
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    gridEl.style.width = '100vw';
    gridEl.style.height = '100vh';
    gridEl.style.position = 'absolute';
    gridEl.style.top = '0';
    gridEl.style.left = '0';
    
    for (let i = 0; i < cols * rows; i++) {
      const el = document.createElement('div');
      el.classList.add('anime-grid-item');
      el.style.width = '2px';
      el.style.height = '2px';
      el.style.backgroundColor = isAttack ? '#f43f5e' : (hasApt ? '#d946ef' : '#38bdf8');
      el.style.margin = 'auto';
      el.style.opacity = '0.1';
      el.style.borderRadius = '50%';
      el.style.boxShadow = `0 0 10px ${isAttack ? '#f43f5e' : '#38bdf8'}`;
      gridEl.appendChild(el);
    }
    
    container.appendChild(gridEl);

    // Staggered grid animation
    animationRef.current = anime({
      targets: '.anime-grid-item',
      scale: [
        { value: .1, easing: 'easeOutSine', duration: 500 },
        { value: 1.5, easing: 'easeInOutQuad', duration: 1200 },
        { value: .1, easing: 'easeOutSine', duration: 500 }
      ],
      opacity: [
        { value: 0.1, duration: 500 },
        { value: isAttack ? 0.8 : 0.3, duration: 1200 },
        { value: 0.1, duration: 500 }
      ],
      delay: anime.stagger(200, { grid: [cols, rows], from: 'center' }),
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutQuad'
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, [isAttack, hasApt]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden" 
      style={{ opacity: 0.6 }}
    />
  );
}
