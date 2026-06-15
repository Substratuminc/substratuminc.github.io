// src/App.tsx

import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import type { ResourceKey } from './store/types';
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
import { computeResourceProduction } from './store/selectors';

export const App: React.FC = () => {
  const phase = useGameStore(state => state.phase);
  const settings = useGameStore(state => state.settings);
  const resources = useGameStore(state => state.resources);
  const activeFailures = useGameStore(state => state.activeFailures);
  const automationUnlocked = useGameStore(state => state.automationUnlocked);
  const playerHp = useGameStore(state => state.player.hp);
  
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [playingEnding, setPlayingEnding] = useState<'PURGE' | 'ASCENSION' | 'LOOP' | 'COLLAPSE' | null>(null);
  
  // Modals state
  const [showAchievements, setShowAchievements] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Tabs layout state
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'MAINFRAME' | 'GRID' | 'PARADIGM'>('SYSTEM');
  const [unreadTabs, setUnreadTabs] = useState<Record<string, boolean>>({
    SYSTEM: false,
    MAINFRAME: false,
    GRID: false,
    PARADIGM: false,
  });

  const selectTab = (tab: 'SYSTEM' | 'MAINFRAME' | 'GRID' | 'PARADIGM') => {
    setActiveTab(tab);
    setUnreadTabs(prev => ({ ...prev, [tab]: false }));
  };

  // Refs to store previous values for background updates detection
  const prevFailuresCount = React.useRef(activeFailures.length);
  const prevHp = React.useRef(playerHp);
  const prevPhase = React.useRef(phase);
  const prevAutomationUnlocked = React.useRef(automationUnlocked);
  const prevThermalCyclesAmount = React.useRef(resources.thermalCycles.amount);

  useEffect(() => {
    const newUnread: Partial<Record<string, boolean>> = {};

    // 1. MAINFRAME tab triggers
    if (activeFailures.length > prevFailuresCount.current) {
      if (activeTab !== 'MAINFRAME') newUnread.MAINFRAME = true;
    }
    prevFailuresCount.current = activeFailures.length;

    if (automationUnlocked && !prevAutomationUnlocked.current) {
      if (activeTab !== 'MAINFRAME') newUnread.MAINFRAME = true;
    }
    prevAutomationUnlocked.current = automationUnlocked;

    if (resources.voidEchoes.amount >= 100 && phase === 'MAINFRAME' && activeTab !== 'MAINFRAME') {
      newUnread.MAINFRAME = true;
    }

    // 2. GRID tab triggers
    if (phase === 'GRID' && prevPhase.current !== 'GRID') {
      if (activeTab !== 'GRID') newUnread.GRID = true;
    }
    if (playerHp < prevHp.current) {
      if (activeTab !== 'GRID') newUnread.GRID = true;
    }
    prevHp.current = playerHp;

    // 3. PARADIGM tab triggers
    if (phase === 'PARADIGM' && prevPhase.current !== 'PARADIGM') {
      if (activeTab !== 'PARADIGM') newUnread.PARADIGM = true;
    }
    prevPhase.current = phase;

    // 4. SYSTEM tab triggers
    if (resources.thermalCycles.amount >= resources.thermalCycles.capacity * 0.85 && 
        prevThermalCyclesAmount.current < resources.thermalCycles.capacity * 0.85) {
      if (activeTab !== 'SYSTEM') newUnread.SYSTEM = true;
    }
    prevThermalCyclesAmount.current = resources.thermalCycles.amount;

    if (Object.keys(newUnread).length > 0) {
      setUnreadTabs(prev => {
        const next = { ...prev };
        for (const k in newUnread) {
          const key = k as 'SYSTEM' | 'MAINFRAME' | 'GRID' | 'PARADIGM';
          if (newUnread[key] !== undefined) {
            next[key] = newUnread[key]!;
          }
        }
        return next;
      });
    }
  }, [
    activeTab, 
    activeFailures.length, 
    automationUnlocked, 
    phase, 
    playerHp, 
    resources.voidEchoes.amount, 
    resources.thermalCycles.amount, 
    resources.thermalCycles.capacity
  ]);

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

  const state = useGameStore();
  const production = computeResourceProduction(state);

  const formatGlobalRate = (key: string) => {
    const prod = production[key as ResourceKey];
    if (!prod) return '';
    const net = prod.produced - prod.consumed;
    const sign = net >= 0 ? '+' : '';
    // Per tick is 50ms, so multiply by 20 for per second
    return `${sign}${(net * 20).toFixed(1)}/s`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box', overflow: 'hidden', padding: '10px' }}>
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

      {/* Dynamic Tab Switcher Menu */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '10px', 
          fontFamily: 'Share Tech Mono, monospace',
          padding: '0 5px',
          marginBottom: '5px',
          flexShrink: 0
        }}
      >
        <button
          onClick={() => selectTab('SYSTEM')}
          className={unreadTabs.SYSTEM ? 'tab-blinking' : ''}
          style={{
            background: activeTab === 'SYSTEM' ? 'var(--terminal-green)' : 'transparent',
            color: activeTab === 'SYSTEM' ? '#000000' : (unreadTabs.SYSTEM ? 'var(--amber-warning)' : 'var(--terminal-green)'),
            border: '1px solid ' + (activeTab === 'SYSTEM' ? 'var(--terminal-green)' : (unreadTabs.SYSTEM ? 'var(--amber-warning)' : 'var(--terminal-green)')),
            cursor: 'pointer',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '0.95rem',
            padding: '6px 12px',
          }}
        >
          [SYSTEM]
        </button>

        {automationUnlocked && (
          <button
            onClick={() => selectTab('MAINFRAME')}
            className={unreadTabs.MAINFRAME ? 'tab-blinking' : ''}
            style={{
              background: activeTab === 'MAINFRAME' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'MAINFRAME' ? '#000000' : (unreadTabs.MAINFRAME ? 'var(--amber-warning)' : 'var(--terminal-green)'),
              border: '1px solid ' + (activeTab === 'MAINFRAME' ? 'var(--terminal-green)' : (unreadTabs.MAINFRAME ? 'var(--amber-warning)' : 'var(--terminal-green)')),
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.95rem',
              padding: '6px 12px',
            }}
          >
            [MAINFRAME] {unreadTabs.MAINFRAME ? '(!)' : ''}
          </button>
        )}

        {(phase === 'GRID' || phase === 'PARADIGM') && (
          <button
            onClick={() => selectTab('GRID')}
            className={unreadTabs.GRID ? 'tab-blinking' : ''}
            style={{
              background: activeTab === 'GRID' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'GRID' ? '#000000' : (unreadTabs.GRID ? 'var(--amber-warning)' : 'var(--terminal-green)'),
              border: '1px solid ' + (activeTab === 'GRID' ? 'var(--terminal-green)' : (unreadTabs.GRID ? 'var(--amber-warning)' : 'var(--terminal-green)')),
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.95rem',
              padding: '6px 12px',
            }}
          >
            [GRID] {unreadTabs.GRID ? '(!)' : ''}
          </button>
        )}

        {phase === 'PARADIGM' && (
          <button
            onClick={() => selectTab('PARADIGM')}
            className={unreadTabs.PARADIGM ? 'tab-blinking' : ''}
            style={{
              background: activeTab === 'PARADIGM' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'PARADIGM' ? '#000000' : (unreadTabs.PARADIGM ? 'var(--amber-warning)' : 'var(--terminal-green)'),
              border: '1px solid ' + (activeTab === 'PARADIGM' ? 'var(--terminal-green)' : (unreadTabs.PARADIGM ? 'var(--amber-warning)' : 'var(--terminal-green)')),
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.95rem',
              padding: '6px 12px',
            }}
          >
            [PARADIGM] {unreadTabs.PARADIGM ? '(!)' : ''}
          </button>
        )}
      </div>

      {/* Global Resource Bar */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '6px 12px',
          background: 'rgba(0, 0, 0, 0.75)',
          border: '1px dashed rgba(51, 255, 102, 0.3)',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '0.85rem',
          color: 'var(--terminal-green)',
          marginBottom: '10px',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#888' }}>RESOURCES:</span>
        
        {/* Static Noise */}
        <span style={{ whiteSpace: 'nowrap' }}>
          STATIC: <strong style={{ color: '#fff' }}>{Math.floor(resources.staticNoise.amount)}</strong>/{resources.staticNoise.capacity} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatGlobalRate('staticNoise')})</span>
        </span>

        {/* Thermal Cycles */}
        {(() => {
          const isOverheated = resources.thermalCycles.amount >= resources.thermalCycles.capacity * 0.85;
          return (
            <span style={{ whiteSpace: 'nowrap', color: isOverheated ? 'var(--amber-warning)' : 'var(--terminal-green)' }}>
              THERMAL: <strong style={{ color: isOverheated ? 'var(--amber-warning)' : '#fff' }}>{Math.floor(resources.thermalCycles.amount)}</strong>/{resources.thermalCycles.capacity}° <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatGlobalRate('thermalCycles')})</span>
            </span>
          );
        })()}

        {/* Grid Watts */}
        <span style={{ whiteSpace: 'nowrap' }}>
          WATTS: <strong style={{ color: '#fff' }}>{Math.floor(resources.gridWatts.amount)}</strong>/{resources.gridWatts.capacity}W <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatGlobalRate('gridWatts')})</span>
        </span>

        {automationUnlocked && (
          <>
            <span style={{ color: '#555' }}>|</span>
            {/* Quantum Foam */}
            <span style={{ whiteSpace: 'nowrap' }}>
              FOAM: <strong style={{ color: '#fff' }}>{Math.floor(resources.quantumFoam.amount)}</strong> <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatGlobalRate('quantumFoam')})</span>
            </span>
            {/* Structured Logic */}
            <span style={{ whiteSpace: 'nowrap' }}>
              LOGIC: <strong style={{ color: '#fff' }}>{Math.floor(resources.structuredLogic.amount)}</strong> <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatGlobalRate('structuredLogic')})</span>
            </span>
            {/* Corrupted Data */}
            {(() => {
              const isCorrupt = resources.corruptedData.amount > 25;
              return (
                <span style={{ whiteSpace: 'nowrap', color: isCorrupt ? 'var(--amber-warning)' : 'var(--terminal-green)' }}>
                  CORRUPT: <strong style={{ color: isCorrupt ? 'var(--amber-warning)' : '#fff' }}>{Math.floor(resources.corruptedData.amount)}</strong> <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatGlobalRate('corruptedData')})</span>
                </span>
              );
            })()}
          </>
        )}

        {(resources.voidEchoes.amount > 0 || phase !== 'TERMINAL') && (
          <>
            <span style={{ color: '#555' }}>|</span>
            <span style={{ whiteSpace: 'nowrap' }}>
              ECHOES: <strong style={{ color: '#fff' }}>{Math.floor(resources.voidEchoes.amount)}</strong> <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatGlobalRate('voidEchoes')})</span>
            </span>
          </>
        )}

        {(resources.paradigmShards.amount > 0 || phase === 'PARADIGM') && (
          <>
            <span style={{ color: '#555' }}>|</span>
            <span style={{ whiteSpace: 'nowrap' }}>
              SHARDS: <strong style={{ color: '#fff' }}>{Math.floor(resources.paradigmShards.amount)}</strong> <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatGlobalRate('paradigmShards')})</span>
            </span>
          </>
        )}
      </div>

      {/* Grid of Dashboard Panels - Split 2/3 and 1/3 layout */}
      <main className="panels-grid" style={{ flex: 'none', display: 'flex', gap: '20px', overflow: 'hidden', paddingTop: '10px', height: '65vh', minHeight: 0 }}>
        {/* Left column (2/3 width) - active tab content */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '15px', height: '100%' }}>
          {activeTab === 'SYSTEM' && (
            <AsciiPanel title="SYSTEM RESOURCES & INFRASTRUCTURE">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <ResourceDisplay />
                <div style={{ borderTop: '1px dashed var(--terminal-green)', marginTop: '5px' }} />
                <InfrastructurePanel />
              </div>
            </AsciiPanel>
          )}

          {activeTab === 'MAINFRAME' && automationUnlocked && (
            <AsciiPanel title="MAINFRAME AUTONET FLOWS">
              <MainframeDashboard />
            </AsciiPanel>
          )}

          {activeTab === 'GRID' && (phase === 'GRID' || phase === 'PARADIGM') && (
            <AsciiPanel title="GRID INTERFACE LAYER">
              <GridViewport />
            </AsciiPanel>
          )}

          {activeTab === 'PARADIGM' && phase === 'PARADIGM' && (
            <AsciiPanel title="PARADIGM COMPILATION INTERFACE">
              <InjectionTerminal />
            </AsciiPanel>
          )}
        </div>

        {/* Right column (1/3 width) - operator terminal port (always visible) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
          <AsciiPanel title="OPERATOR TERMINAL PORT">
            <Terminal />
          </AsciiPanel>
        </div>
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
