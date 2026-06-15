// src/components/ObjectiveBanner.tsx

import React from 'react';
import { useGameStore } from '../store/gameStore';

export const ObjectiveBanner: React.FC = () => {
  const state = useGameStore();
  const { phase, resources } = state;
  const voidEchoes = resources.voidEchoes.amount;

  const gridWattsCap = resources.gridWatts.capacity;
  const staticNoiseCap = resources.staticNoise.capacity;
  const conduitLevel = Math.max(0, Math.round(Math.log(gridWattsCap / 500) / Math.log(1.5)));
  const ampLevel = Math.max(0, Math.round(Math.log(Math.max(1, (staticNoiseCap - conduitLevel * 200) / 250)) / Math.log(1.8)));

  let mainObjective = '';
  let subHint = '';
  let conditionMet = false;
  const subObjectives: { text: string; done: boolean }[] = [];

  if (phase === 'TERMINAL') {
    const isAmp3 = ampLevel >= 3;
    const isConduit1 = conduitLevel >= 1;
    const isAmp7 = ampLevel >= 7;
    const isWatts300 = resources.gridWatts.amount >= 300;

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

    subObjectives.push({ text: `Reach Signal Amplifier Level 3 (Current: Lv.${ampLevel})`, done: isAmp3 });
    subObjectives.push({ text: `Unlock Power Conduit (Current: ${isConduit1 ? 'Unlocked' : 'Locked'})`, done: isConduit1 });
    subObjectives.push({ text: `Reach Signal Amplifier Level 7 (Current: Lv.${ampLevel})`, done: isAmp7 });
    subObjectives.push({ text: `Accumulate 300 Watts of stored power (Current: ${Math.floor(resources.gridWatts.amount)} / 300W)`, done: isWatts300 || isAmp7 });
    if (isAmp7) {
      subObjectives.push({ text: "Compile fragment key (run 'compile_fragment bootloader.key')", done: false });
    }
  } else if (phase === 'MAINFRAME') {
    const scraperCount = state.automationUnits.find(u => u.id === 'scraper')?.count || 0;
    const compilerCount = state.automationUnits.find(u => u.id === 'compiler')?.count || 0;
    const daemonCount = state.automationUnits.find(u => u.id === 'daemon')?.count || 0;
    const latticeCount = state.automationUnits.find(u => u.id === 'lattice')?.count || 0;

    const hasScraper = scraperCount > 0;
    const hasCompiler = compilerCount > 0;
    const hasDaemon = daemonCount > 0;
    const hasLattice = latticeCount > 0;
    const hasEchoes = voidEchoes >= 100;

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

    subObjectives.push({ text: `Unlock & Purchase Scraper.exe (Owned: ${scraperCount})`, done: hasScraper });
    subObjectives.push({ text: `Unlock & Purchase Compiler.bat (Owned: ${compilerCount})`, done: hasCompiler });
    subObjectives.push({ text: `Unlock & Purchase Daemon.sys (Owned: ${daemonCount})`, done: hasDaemon });
    subObjectives.push({ text: `Unlock & Purchase Lattice.net (Owned: ${latticeCount})`, done: hasLattice });
    subObjectives.push({ text: `Accumulate 100 Void Echoes (Current: ${Math.floor(voidEchoes)} / 100)`, done: hasEchoes });
    if (hasEchoes) {
      subObjectives.push({ text: "Establish handshake (run 'ping 10.0.0.7')", done: false });
    }
  } else if (phase === 'GRID') {
    const currentDepth = state.currentMap?.depth || 1;
    const atDepth10 = currentDepth >= 10;

    mainObjective = 'Explore the Substratum Grid';
    subHint = 'Navigate with WASD / Arrow keys, find exits, descend';

    subObjectives.push({ text: `Reach Grid Depth 10 (Current Depth: ${currentDepth})`, done: atDepth10 });
    subObjectives.push({ text: 'Locate and defeat the Archivist Node Monitor (Depth 10)', done: false });
  } else if (phase === 'PARADIGM') {
    const currentDepth = state.currentMap?.depth || 10;
    const atDepth20 = currentDepth >= 20;
    const hasInjections = state.activeInjections.length >= 1;
    const hasPurgeKey = state.player.inventory.some(i => i.id === 'purge_key');

    mainObjective = 'Reshape the Substrate';
    subHint = 'Use the Paradigm Injection terminal to alter the simulation';

    subObjectives.push({ text: `Activate at least 1 Meta Injection (Current Active: ${state.activeInjections.length})`, done: hasInjections });
    subObjectives.push({ text: `Explore down to Grid Depth 20 (Current Depth: ${currentDepth})`, done: atDepth20 });
    subObjectives.push({ text: 'Defeat Master Core Archivist to extract PURGE_KEY', done: hasPurgeKey });
    if (hasPurgeKey) {
      subObjectives.push({ text: "Execute full system purge (run 'execute purge --confirm --all')", done: false });
    }
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
        flexDirection: 'column',
        gap: '4px',
        padding: '10px 12px',
        background: 'rgba(0, 0, 0, 0.65)',
        borderLeft: borderStyle,
        fontFamily: 'Share Tech Mono, monospace',
        marginBottom: '15px',
        boxSizing: 'border-box',
        transition: 'all 0.5s ease',
        boxShadow: conditionMet ? '0 0 10px rgba(255, 107, 53, 0.15)' : 'none',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <span 
          style={{ 
            color: objColor, 
            marginRight: '8px', 
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
        <span style={{ color: '#aaa', fontSize: '0.9rem' }}>
          {subHint}
        </span>
      </div>

      {/* Sub-objectives step checklist */}
      {subObjectives.length > 0 && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '3px', 
            paddingLeft: '18px', 
            marginTop: '6px', 
            fontSize: '0.85rem' 
          }}
        >
          {subObjectives.map((sub, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                color: sub.done ? 'var(--terminal-green)' : '#999999',
                textShadow: sub.done ? '0 0 2px rgba(51, 255, 102, 0.3)' : 'none'
              }}
            >
              <span 
                style={{ 
                  marginRight: '8px', 
                  fontFamily: 'monospace', 
                  color: sub.done ? 'var(--terminal-green)' : 'var(--amber-warning)',
                  fontWeight: 'bold'
                }}
              >
                {sub.done ? '[x]' : '[ ]'}
              </span>
              <span>{sub.text}</span>
            </div>
          ))}
        </div>
      )}

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
