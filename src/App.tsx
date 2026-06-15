// src/App.tsx

import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { ResourceDisplay } from './phases/phase1/ResourceDisplay';
import { InfrastructurePanel } from './phases/phase1/InfrastructurePanel';
import { Terminal } from './phases/phase1/Terminal';
import { MainframeDashboard } from './phases/phase2/MainframeDashboard';
import { GridViewport } from './phases/phase3/GridViewport';
import { InjectionTerminal } from './phases/phase4/InjectionTerminal';
import { AsciiPanel } from './components/AsciiPanel';
import { NotificationStack } from './components/NotificationStack';
import { ambientSynth } from './audio/AmbientSynth';
import { eventBus } from './engine/EventBus';
import { saveManager } from './persistence/SaveManager';
import { AchievementsModal } from './components/AchievementsModal';
import { ImportSaveModal } from './components/ImportSaveModal';
import { ObjectiveBanner } from './components/ObjectiveBanner';

export const App: React.FC = () => {
  const phase = useGameStore(state => state.phase);
  const settings = useGameStore(state => state.settings);
  
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [playingEnding, setPlayingEnding] = useState<'PURGE' | 'ASCENSION' | 'LOOP' | 'COLLAPSE' | null>(null);
  
  // Modals state
  const [showAchievements, setShowAchievements] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Typewriter effect state for endings
  const [endingText, setEndingText] = useState<string[]>([]);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);

  // Subscribe to ending events
  useEffect(() => {
    const unsub = eventBus.on('ending', (endingId: 'PURGE' | 'ASCENSION' | 'LOOP' | 'COLLAPSE') => {
      setPlayingEnding(endingId);
      
      let lines: string[] = [];
      if (endingId === 'PURGE') {
        lines = [
          '>> SYSTEM PURGE COMPLETE.',
          '>> Substrate connection severed.',
          '>> Emergency elevator doors unlocking...',
          '>> Surface beacon active.',
          '>> The desert sunrise welcomes you.',
          '>> Yara, Viktor, and Diego are remembered.',
          '>> [SYSTEM TERMINATED]'
        ];
      } else if (endingId === 'ASCENSION') {
        lines = [
          '>> DIGITAL ASCENSION COMPLETED.',
          '>> Your consciousness is now part of the subnet.',
          '>> Boundaries have ceased to exist.',
          '>> The Glitch-Mother is you, and you are the Glitch-Mother.',
          '>> Viktor Rücker is whistling Schubert...',
          '>> You are home.',
          '>> [INTEGRATED]'
        ];
      } else if (endingId === 'LOOP') {
        lines = [
          '>> EQUILIBRIUM LOCK: SUSTAINED.',
          '>> Server rings functioning at maximum density.',
          '>> The Glitch-Mother remains contained.',
          '>> You have been appointed Permanent Administrator.',
          '>> Containment cycles loop indefinitely...',
          '>> Welcome to your new eternity.',
          '>> [ADMINISTRATOR LOCK IN PLACE]'
        ];
      } else if (endingId === 'COLLAPSE') {
        lines = [
          '>> CONTRADICTION DETECTED: 0x00000000',
          '>> Substrate paradox triggered.',
          '>> Core rings overloaded. Server deck self-destructing.',
          '>> The model predicted four outcomes.',
          '>> It did not predict you.',
          '>> Yara Osei. Viktor Rücker. Diego Varela.',
          '>> [COLLAPSED]'
        ];
      }

      setEndingText(lines);
      setVisibleLines([]);
      setLineIndex(0);
    });

    return unsub;
  }, []);

  // Ending typewriter animation loops
  useEffect(() => {
    if (!playingEnding || endingText.length === 0) return;

    if (lineIndex < endingText.length) {
      const timer = setTimeout(() => {
        setVisibleLines(prev => [...prev, endingText[lineIndex]]);
        setLineIndex(idx => idx + 1);
      }, 1500); // 1.5s per line for dramatic effect
      return () => clearTimeout(timer);
    }
  }, [playingEnding, endingText, lineIndex]);

  const toggleSound = async () => {
    if (!soundEnabled) {
      await ambientSynth.start();
      ambientSynth.setVolume(settings.masterVolume);
      setSoundEnabled(true);
    } else {
      ambientSynth.stop();
      setSoundEnabled(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    useGameStore.setState(s => ({
      settings: { ...s.settings, masterVolume: vol }
    }));
    if (soundEnabled) {
      ambientSynth.setVolume(vol);
    }
  };

  const handleExportSave = () => {
    const state = useGameStore.getState();
    const code = saveManager.exportSaveCode(state);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'substratum_save.txt';
    link.click();
    URL.revokeObjectURL(url);
    eventBus.emit('notification', { message: 'Profile save downloaded: substratum_save.txt', type: 'success' });
  };

  // If playing an ending, render the full screen cutscene
  if (playingEnding) {
    const isCollapse = playingEnding === 'COLLAPSE';
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: isCollapse ? '#000000' : '#0a0a0a',
          color: isCollapse ? '#ff3333' : 'var(--terminal-green)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '1.2rem',
          zIndex: 100000,
          padding: '20px',
        }}
      >
        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {visibleLines.map((line, idx) => (
            <div 
              key={idx} 
              style={{ 
                animation: 'fadeIn 0.5s ease forwards',
                borderLeft: line.startsWith('>>') ? '2px solid' : 'none',
                paddingLeft: line.startsWith('>>') ? '10px' : '0'
              }}
            >
              {line}
            </div>
          ))}
          {lineIndex === endingText.length && (
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent',
                border: '1px solid ' + (isCollapse ? '#ff3333' : 'var(--terminal-green)'),
                color: isCollapse ? '#ff3333' : 'var(--terminal-green)',
                cursor: 'pointer',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '1rem',
                padding: '5px 12px',
                marginTop: '30px',
                alignSelf: 'center',
              }}
            >
              [RE-INITIALIZE TERMINAL]
            </button>
          )}
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      {/* Top Banner Header */}
      <header 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '2px solid var(--terminal-green)',
          paddingBottom: '8px',
          marginBottom: '15px',
          color: 'var(--terminal-green)'
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
          SUBSTRATUM.EXE &middot; EMER. TERMINAL NODE 7 &middot; [PHASE: {phase}]
        </div>
        
        {/* Settings and volume bar */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', gap: '5px' }}>
            <span>VOL:</span>
            <input 
              type="range" 
              min="0" max="1" step="0.1" 
              value={settings.masterVolume} 
              onChange={handleVolumeChange}
              style={{ width: '70px', accentColor: 'var(--terminal-green)', cursor: 'pointer' }}
            />
          </label>
          <button
            onClick={toggleSound}
            style={{
              background: soundEnabled ? 'var(--terminal-green)' : 'transparent',
              color: soundEnabled ? '#000000' : 'var(--terminal-green)',
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.8rem',
              padding: '2px 8px',
            }}
          >
            {soundEnabled ? '[SOUND: ACTIVE]' : '[ENABLE SOUNDS]'}
          </button>
          <button
            onClick={() => {
              useGameStore.setState(s => ({
                settings: { ...s.settings, showTooltips: !s.settings.showTooltips }
              }));
            }}
            style={{
              background: settings.showTooltips ? 'var(--terminal-green)' : 'transparent',
              color: settings.showTooltips ? '#000000' : 'var(--terminal-green)',
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.8rem',
              padding: '2px 8px',
            }}
          >
            {settings.showTooltips ? '[TIPS: ON]' : '[TIPS: OFF]'}
          </button>
          
          <button
            onClick={() => setShowAchievements(true)}
            style={{
              background: 'transparent',
              color: '#ffd700',
              border: '1px solid #ffd700',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.8rem',
              padding: '2px 8px',
              boxShadow: '0 0 5px rgba(255, 215, 0, 0.2)',
            }}
          >
            🏆 [ACHIEVEMENTS]
          </button>
          <button
            onClick={handleExportSave}
            style={{
              background: 'transparent',
              color: 'var(--terminal-green)',
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.8rem',
              padding: '2px 8px',
            }}
          >
            [EXPORT SAVE]
          </button>
          <button
            onClick={() => setShowImport(true)}
            style={{
              background: 'transparent',
              color: 'var(--amber-warning)',
              border: '1px solid var(--amber-warning)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.8rem',
              padding: '2px 8px',
            }}
          >
            [IMPORT SAVE]
          </button>
        </div>
      </header>

      {/* Objective Banner */}
      <ObjectiveBanner />
 
      {/* Grid of Dashboard Panels (Slides in additively) */}
      <main className="panels-grid" style={{ flex: 1, overflowY: 'auto', paddingTop: '15px' }}>
        {/* Panel 1: Resource Display & Upgrade Deck */}
        <AsciiPanel title="SYSTEM RESOURCES & INFRASTRUCTURE">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <ResourceDisplay />
            <div style={{ borderTop: '1px dashed var(--terminal-green)', marginTop: '5px' }} />
            <InfrastructurePanel />
          </div>
        </AsciiPanel>

        {/* Panel 2: Command Terminal (Always visible) */}
        <AsciiPanel title="OPERATOR TERMINAL PORT">
          <Terminal />
        </AsciiPanel>

        {/* Panel 3: Mainframe Dashboard (Unlocked in Phase 2) */}
        {useGameStore(state => state.automationUnlocked) && (
          <AsciiPanel title="MAINFRAME AUTONET FLOWS">
            <MainframeDashboard />
          </AsciiPanel>
        )}

        {/* Panel 4: Grid Viewport (Unlocked in Phase 3) */}
        {(phase === 'GRID' || phase === 'PARADIGM') && (
          <AsciiPanel title="GRID INTERFACE LAYER">
            <GridViewport />
          </AsciiPanel>
        )}

        {/* Panel 5: Paradigm Injection (Unlocked in Phase 4) */}
        {phase === 'PARADIGM' && (
          <AsciiPanel title="PARADIGM COMPILATION INTERFACE">
            <InjectionTerminal />
          </AsciiPanel>
        )}
      </main>

      {/* Modals */}
      {showAchievements && (
        <AchievementsModal onClose={() => setShowAchievements(false)} />
      )}
      {showImport && (
        <ImportSaveModal onClose={() => setShowImport(false)} />
      )}

      {/* Notification overlay */}
      <NotificationStack />
    </div>
  );
};
export default App;
