// src/components/AsciiPanel.tsx

import React from 'react';

interface AsciiPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  badge?: string;
}

export const AsciiPanel: React.FC<AsciiPanelProps> = ({ title, children, className = '', badge }) => {
  return (
    <div 
      className={`ascii-panel ${className}`} 
      style={{ 
        border: '2px solid var(--terminal-green)', 
        padding: '10px', 
        background: 'var(--panel-bg)', 
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      <div className="ascii-panel-header" style={{ position: 'absolute', top: '-12px', left: '15px', background: 'var(--bg-color)', padding: '0 8px', color: 'var(--terminal-green)', fontSize: '0.9rem', fontWeight: 'bold', zIndex: 10 }}>
        <span>[ {title} ]</span>
        {badge && <span style={{ marginLeft: '10px', color: 'var(--amber-warning)', fontSize: '0.8rem' }}>[{badge}]</span>}
      </div>
      <div className="ascii-panel-content" style={{ marginTop: '5px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
};
