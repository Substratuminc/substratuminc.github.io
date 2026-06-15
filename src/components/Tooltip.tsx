// src/components/Tooltip.tsx

import React from 'react';
import { useGameStore } from '../store/gameStore';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const showTooltips = useGameStore(state => state.settings.showTooltips);

  if (!showTooltips || !text) {
    return <>{children}</>;
  }

  return (
    <div className="tooltip-container" style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <div className={`tooltip-box tooltip-${position}`} style={{
        visibility: 'hidden',
        width: '200px',
        backgroundColor: '#0a0a0a',
        border: '1px solid var(--terminal-green)',
        color: '#cccccc',
        textAlign: 'center',
        padding: '5px',
        borderRadius: '2px',
        position: 'absolute',
        zIndex: 999,
        fontSize: '0.8rem',
        opacity: 0,
        transition: 'opacity 0.2s',
        pointerEvents: 'none',
        whiteSpace: 'normal',
      }}>
        {text}
      </div>
      <style>{`
        .tooltip-container:hover .tooltip-box {
          visibility: visible;
          opacity: 1;
        }
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
