// src/components/ProgressBar.tsx

import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
  amount: number;
  capacity: number;
  width?: number; // width in characters
  pulseOverheat?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ amount, capacity, width = 20, pulseOverheat = false }) => {
  const [flash, setFlash] = useState(false);
  const ratio = capacity > 0 ? Math.min(1, Math.max(0, amount / capacity)) : 0;
  const percentage = ratio * 100;

  // Flash state for 100% capacity
  useEffect(() => {
    if (amount >= capacity && capacity > 0) {
      const interval = setInterval(() => {
        setFlash(f => !f);
      }, 400);
      return () => clearInterval(interval);
    } else {
      setFlash(false);
    }
  }, [amount, capacity]);

  // Determine block character based on percentage
  let char = '░';
  if (percentage > 87) {
    char = '█';
  } else if (percentage > 62) {
    char = '█'; // full block
  } else if (percentage > 37) {
    char = '▓'; // dark shade
  } else if (percentage > 12) {
    char = '▒'; // medium shade
  }

  // Calculate filled blocks
  let filledCount = Math.round(ratio * width);
  if (amount > 0 && filledCount === 0) {
    filledCount = 1; // show at least one segment if there is some resource
  }

  // Overflow character for 88-99%
  const isOverfull = percentage >= 88 && percentage < 100;
  const displayFilledCount = isOverfull ? Math.min(width + 1, filledCount) : Math.min(width, filledCount);

  const filled = char.repeat(displayFilledCount);
  const empty = '░'.repeat(Math.max(0, width - displayFilledCount));

  // Determine styles/classes
  let barColor = 'var(--terminal-green)';
  let className = '';

  if (amount >= capacity && capacity > 0) {
    barColor = flash ? '#ff3333' : '#ff6b35';
    className = 'flash-urgent';
  } else if (isOverfull) {
    barColor = 'var(--amber-warning)';
    className = 'pulse-amber';
  } else if (pulseOverheat && percentage >= 80) {
    className = 'thermal-pulse';
  }

  return (
    <span 
      className={`ascii-progress-bar ${className}`} 
      style={{ 
        fontFamily: 'monospace', 
        color: barColor, 
        letterSpacing: '1px',
        transition: 'color 0.2s ease'
      }}
    >
      {filled}
      <span style={{ color: '#224422' }}>{empty}</span>
    </span>
  );
};
