// src/phases/phase2/MainframeDashboard.tsx

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { AutomationNode } from './AutomationNode';
import { PipelineRenderer } from './PipelineRenderer';
import { parseCommand } from '../phase1/CommandParser';
import { eventBus } from '../../engine/EventBus';
import type { ResourceKey } from '../../store/types';

export const MainframeDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'SCHEMATICS' | 'FAILURES' | 'MARKET'>('PIPELINE');
  
  const automationUnits = useGameStore(state => state.automationUnits);
  const activeFailures = useGameStore(state => state.activeFailures);
  const resources = useGameStore(state => state.resources);
  const phase = useGameStore(state => state.phase);
  const voidEchoes = resources.voidEchoes.amount;

  const triggerReboot = (id: string) => {
    const results = parseCommand(`reboot_node ${id}`);
    useGameStore.setState(s => ({
      terminalHistory: [...s.terminalHistory, ...results].slice(-200)
    }));
    
    const resultText = results[0];
    if (resultText && !resultText.includes('Error')) {
      eventBus.emit('notification', { message: resultText.replace('>> ', ''), type: 'success' });
    } else if (resultText) {
      eventBus.emit('notification', { message: resultText.replace('>> ', ''), type: 'warn' });
    }
  };

  // Trade market logic
  const executeTrade = (fromRes: ResourceKey, toRes: ResourceKey, fromAmt: number, toAmt: number) => {
    if (resources[fromRes].amount < fromAmt) {
      eventBus.emit('notification', { message: 'Insufficient resources for trade.', type: 'warn' });
      return;
    }

    useGameStore.setState(state => {
      const nextResources = { ...state.resources };
      nextResources[fromRes] = {
        ...nextResources[fromRes],
        amount: Math.max(0, nextResources[fromRes].amount - fromAmt),
      };
      nextResources[toRes] = {
        ...nextResources[toRes],
        amount: Math.min(nextResources[toRes].capacity, nextResources[toRes].amount + toAmt),
      };
      return { resources: nextResources };
    });

    eventBus.emit('notification', { message: `Traded ${fromAmt} ${fromRes} for ${toAmt} ${toRes}`, type: 'success' });
  };

  return (
    <div 
      className="mainframe-dashboard" 
      style={{
        border: '2px solid var(--terminal-green)',
        background: 'var(--panel-bg)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'row',
        height: '420px',
        fontFamily: 'Share Tech Mono, monospace',
        color: 'var(--terminal-green)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        gap: '12px',
      }}
    >
      {/* Tabs and Roster list */}
      <div style={{ width: '150px', borderRight: '1px dashed var(--terminal-green)', paddingRight: '10px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', paddingBottom: '4px', marginBottom: '8px' }}>TABS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button 
            onClick={() => setActiveTab('PIPELINE')}
            style={{
              background: activeTab === 'PIPELINE' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'PIPELINE' ? '#000000' : 'var(--terminal-green)',
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              textAlign: 'left',
              padding: '4px 6px',
            }}
          >
            [PIPELINE]
          </button>
          <button 
            onClick={() => setActiveTab('SCHEMATICS')}
            style={{
              background: activeTab === 'SCHEMATICS' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'SCHEMATICS' ? '#000000' : 'var(--terminal-green)',
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              textAlign: 'left',
              padding: '4px 6px',
            }}
          >
            [SCHEMATICS]
          </button>
          <button 
            onClick={() => setActiveTab('FAILURES')}
            style={{
              background: activeTab === 'FAILURES' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'FAILURES' ? '#000000' : (activeFailures.length > 0 ? 'var(--amber-warning)' : 'var(--terminal-green)'),
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              textAlign: 'left',
              padding: '4px 6px',
              borderColor: activeFailures.length > 0 ? 'var(--amber-warning)' : 'var(--terminal-green)',

            }}
          >
            [FAILURES {activeFailures.length > 0 ? `(${activeFailures.length})` : ''}]
          </button>
          <button 
            onClick={() => setActiveTab('MARKET')}
            style={{
              background: activeTab === 'MARKET' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'MARKET' ? '#000000' : 'var(--terminal-green)',
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              textAlign: 'left',
              padding: '4px 6px',
            }}
          >
            [MARKET]
          </button>
        </div>

        {/* Mini Roster Status */}
        <div style={{ marginTop: '10px', fontSize: '0.8rem', opacity: 0.8 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>UNIT ROSTER</div>
          {automationUnits.filter(u => u.count > 0).map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', color: u.failureState ? 'var(--amber-warning)' : 'var(--terminal-green)' }}>
              <span>{u.name.split('.')[0]}</span>
              <span>x{u.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Tab Content View */}
      <div style={{ flex: 1, overflowY: 'auto', paddingLeft: '5px', height: '100%' }}>
        {voidEchoes >= 100 && phase === 'MAINFRAME' && (
          <div 
            className="pulse-amber" 
            style={{ 
              marginBottom: '12px', 
              border: '1px solid var(--amber-warning)', 
              padding: '10px', 
              fontSize: '0.85rem', 
              background: 'rgba(255, 107, 53, 0.05)',
              textAlign: 'center',
              lineHeight: '1.4',
              animation: 'flash-urgent 1.5s infinite',
            }}
          >
            ⚡ Mainframe stabilized. Connection to Substrate Grid established. Enter <code style={{ color: '#fff', background: '#222', padding: '2px 4px', borderRadius: '2px' }}>ping 10.0.0.7</code> in the terminal to initialize Phase 3 GRID.
          </div>
        )}

        {activeTab === 'PIPELINE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PipelineRenderer />
            
            {/* Failures Alert Box inside Pipeline view */}
            {activeFailures.length > 0 && (
              <div style={{ border: '1px solid var(--amber-warning)', padding: '8px', background: 'rgba(25, 10, 0, 0.4)' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--amber-warning)' }}>[!] ACTIVE CRITICAL FAILURES</span>
                <ul style={{ margin: '5px 0 0 0', paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--amber-warning)' }}>
                  {activeFailures.map((fail, idx) => (
                    <li key={idx}>{fail.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'SCHEMATICS' && (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>SCHEMATICS MODULES</div>
            {/* Show all 10 tiers, filter out Tier 10 if not unlocked in secrets */}
            {automationUnits
              .filter(u => u.id !== 'glitch_mother' || u.count > 0)
              .map(unit => (
                <AutomationNode key={unit.id} unit={unit} />
              ))}
          </div>
        )}

        {activeTab === 'FAILURES' && (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>FAILURE TRIAGE PORTAL</div>
            {activeFailures.length === 0 ? (
              <div style={{ color: '#88cc88', opacity: 0.8 }}>All mainframe automation systems nominal. No errors queued.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {automationUnits
                  .filter(u => u.failureState !== null)
                  .map(unit => (
                    <div 
                      key={unit.id} 
                      style={{ 
                        border: '1px solid var(--amber-warning)', 
                        padding: '8px', 
                        background: 'rgba(30,10,0,0.3)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--amber-warning)' }}>{unit.name} - {unit.failureState!.type}</span>
                        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{unit.failureState!.description}</div>
                      </div>
                      <button 
                        onClick={() => triggerReboot(unit.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--amber-warning)',
                          color: 'var(--amber-warning)',
                          cursor: 'pointer',
                          fontFamily: 'Share Tech Mono, monospace',
                          fontSize: '0.85rem',
                          padding: '3px 8px',
                        }}
                      >
                        [REBOOT (50W, 20°)]
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'MARKET' && (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>informational trading network</div>
            <div style={{ opacity: 0.8, fontSize: '0.85rem', marginBottom: '10px' }}>
              Re-route signals to transform database resources.
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Trade 1: Static to Logic */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--terminal-green)', padding: '6px' }}>
                <span>Exchange 100 Static Noise &rarr; 5 Structured Logic</span>
                <button 
                  onClick={() => executeTrade('staticNoise', 'structuredLogic', 100, 5)}
                  disabled={resources.staticNoise.amount < 100}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--terminal-green)',
                    color: 'var(--terminal-green)',
                    cursor: 'pointer',
                    fontFamily: 'Share Tech Mono, monospace',
                    opacity: resources.staticNoise.amount < 100 ? 0.5 : 1,
                  }}
                >
                  [EXECUTE]
                </button>
              </div>

              {/* Trade 2: Logic to Foam */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--terminal-green)', padding: '6px' }}>
                <span>Exchange 10 Structured Logic &rarr; 1 Quantum Foam</span>
                <button 
                  onClick={() => executeTrade('structuredLogic', 'quantumFoam', 10, 1)}
                  disabled={resources.structuredLogic.amount < 10}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--terminal-green)',
                    color: 'var(--terminal-green)',
                    cursor: 'pointer',
                    fontFamily: 'Share Tech Mono, monospace',
                    opacity: resources.structuredLogic.amount < 10 ? 0.5 : 1,
                  }}
                >
                  [EXECUTE]
                </button>
              </div>

              {/* Trade 3: Foam to Watts (Emergency power) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--terminal-green)', padding: '6px' }}>
                <span>Decompress 5 Quantum Foam &rarr; 100 Grid Watts</span>
                <button 
                  onClick={() => executeTrade('quantumFoam', 'gridWatts', 5, 100)}
                  disabled={resources.quantumFoam.amount < 5}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--terminal-green)',
                    color: 'var(--terminal-green)',
                    cursor: 'pointer',
                    fontFamily: 'Share Tech Mono, monospace',
                    opacity: resources.quantumFoam.amount < 5 ? 0.5 : 1,
                  }}
                >
                  [EXECUTE]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MainframeDashboard;
