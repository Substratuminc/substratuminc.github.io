// src/components/Tooltip.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const showTooltips = useGameStore(state => state.settings.showTooltips);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!showTooltips || !text) {
    return <>{children}</>;
  }

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div 
      className="tooltip-container" 
      ref={containerRef}
      onClick={toggleTooltip}
      style={{ position: 'relative', display: 'inline-block', cursor: 'help' }}
    >
      {children}
      <div 
        className={`tooltip-box tooltip-${position} ${isOpen ? 'visible' : ''}`} 
        style={{
          visibility: isOpen ? 'visible' : 'hidden',
          opacity: isOpen ? 1 : 0,
          width: '220px',
          backgroundColor: '#0a0a0a',
          border: '1px solid var(--terminal-green)',
          color: '#cccccc',
          textAlign: 'center',
          padding: '8px',
          borderRadius: '2px',
          position: 'absolute',
          zIndex: 9999,
          fontSize: '0.8rem',
          transition: 'opacity 0.15s, visibility 0.15s',
          pointerEvents: 'auto',
          whiteSpace: 'normal',
          boxShadow: '0 0 10px rgba(51, 255, 102, 0.3)',
        }}
      >
        {text}
      </div>
      <style>{`
        .tooltip-top {
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
        }
        .tooltip-bottom {
          top: 125%;
          left: 50%;
          transform: translateX(-50%);
        }
        .tooltip-left {
          top: 50%;
          right: 125%;
          transform: translateY(-50%);
        }
        .tooltip-right {
          top: 50%;
          left: 125%;
          transform: translateY(-50%);
        }
      `}</style>
    </div>
  );
};
