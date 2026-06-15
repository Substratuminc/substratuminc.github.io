// src/components/ObjectiveBanner.tsx

import React from 'react';
import { useGameStore } from '../store/gameStore';

export const ObjectiveBanner: React.FC = () => {
  const state = useGameStore();
  const { phase, resources } = state;

  const gridWattsCap = resources.gridWatts.capacity;
  const staticNoiseCap = resources.staticNoise.capacity;
  const conduitLevel = Math.max(0, Math.round((gridWattsCap - 500) / 200));
  const ampLevel = Math.max(0, Math.round((staticNoiseCap - 250 - conduitLevel * 100) / 300));
  
  const voidEchoes = resources.voidEchoes.amount;

  let mainObjective = '';
  let subHint = '';
  let conditionMet = false;

  if (phase === 'TERMINAL') {
    if (ampLevel < 3) {
      mainObjective = 'Restore the Signal Amplifier';
      subHint = 'Harvest Static Noise and upgrade the Amplifier';
    } else if (ampLevel < 7) {
      mainObjective = 'Reach Amplifier Level 7';
      subHint = 'Keep upgrading — the Mainframe is close';
    } else {
      mainObjective = 'Connect to the Mainframe';
      subHint = 'Type compile_fragment bootloader.key in the terminal';
      conditionMet = true;
    }
  } else if (phase === 'MAINFRAME') {
    const scraperCount = state.automationUnits.find(u => u.id === 'scraper')?.count || 0;
    if (scraperCount === 0) {
      mainObjective = 'Activate Automation Processes';
      subHint = 'Unlock and buy automation units in the Mainframe';
    } else if (voidEchoes < 100) {
      mainObjective = 'Accumulate Void Echoes';
      subHint = 'Activate Lattice.net and Phantom.srv to generate Void Echoes';
    } else {
      mainObjective = 'Access the Substratum Grid';
      subHint = 'Type ping 10.0.0.7 in the terminal';
      conditionMet = true;
    }
  } else if (phase === 'GRID') {
    mainObjective = 'Explore the Substratum Grid';
    subHint = 'Navigate with WASD / Arrow keys, find exits, descend';
  } else if (phase === 'PARADIGM') {
    mainObjective = 'Reshape the Substrate';
    subHint = 'Use the Paradigm Injection terminal to alter the simulation';
  }

  const borderStyle = conditionMet 
    ? '3px solid var(--amber-warning)' 
    : '3px solid var(--terminal-green)';

  const objColor = conditionMet ? 'var(--amber-warning)' : 'var(--terminal-green)';

  return (
    <div 
      className={`objective-banner ${conditionMet ? 'pulse-amber-bg' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.65)',
        borderLeft: borderStyle,
        fontSize: '0.9rem',
        fontFamily: 'Share Tech Mono, monospace',
        marginBottom: '15px',
        boxSizing: 'border-box',
        transition: 'all 0.5s ease',
        boxShadow: conditionMet ? '0 0 10px rgba(255, 107, 53, 0.15)' : 'none',
      }}
    >
      <span 
        style={{ 
          color: objColor, 
          marginRight: '6px', 
          fontWeight: 'bold',
          animation: 'blink-arrow 1.2s step-end infinite',
        }}
      >
        ▶
      </span>
      <span style={{ color: objColor, fontWeight: 'bold', marginRight: '10px' }}>
        OBJECTIVE: {mainObjective}
      </span>
      <span style={{ color: '#888', marginRight: '6px' }}>&mdash;</span>
      <span style={{ color: '#aaa', flex: 1 }}>
        {subHint}
      </span>

      <style>{`
        @keyframes blink-arrow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @keyframes pulse-bg {
          0% { background-color: rgba(0, 0, 0, 0.65); }
          50% { background-color: rgba(255, 107, 53, 0.08); }
          100% { background-color: rgba(0, 0, 0, 0.65); }
        }
        .pulse-amber-bg {
          animation: pulse-bg 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ObjectiveBanner;
