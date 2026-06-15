// src/phases/phase3/GridViewport.tsx

import React, { useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getEquipmentStats } from './CombatEngine';
import type { InventoryItem } from '../../store/types';

export const GridViewport: React.FC = () => {
  const state = useGameStore();
  const { currentMap, playerGrid, player, enemyDatabase, standby, resources } = state;

  const [activeTab, setActiveTab] = useState<'STATS' | 'INVENTORY' | 'GOALS'>('STATS');
  const containerRef = useRef<HTMLDivElement>(null);

  const addLog = (log: string) => {
    useGameStore.setState(s => ({
      terminalHistory: [...s.terminalHistory, log].slice(-200)
    }));
  };

  // Pull Lever Deployment
  const pullLever = () => {
    useGameStore.setState({
      standby: false,
      autoExploreActive: true
    });
    addLog('>> [OPERATOR] Deployment lever pulled. Auto-exploration subroutines engaged.');
  };

  // Interactive Support Operations
  const triggerOvercharge = () => {
    if (resources.gridWatts.amount < 10) return;
    useGameStore.setState(s => {
      const nextWatts = Math.max(0, s.resources.gridWatts.amount - 10);
      const nextEffects = [...s.player.activeStatusEffects];
      const idx = nextEffects.findIndex(e => e.effect === 'overclockedI');
      if (idx >= 0) {
        nextEffects[idx].remainingTicks = 400; // refresh
      } else {
        nextEffects.push({ effect: 'overclockedI', remainingTicks: 400, magnitude: 1 });
      }
      return {
        resources: { ...s.resources, gridWatts: { ...s.resources.gridWatts, amount: nextWatts } },
        player: { ...s.player, activeStatusEffects: nextEffects }
      };
    });
    addLog('>> [SUPPORT] Watts routed to overcharger. ATK damage +20% for 20 seconds.');
  };

  const triggerShieldRecharge = () => {
    if (resources.gridWatts.amount < 15) return;
    useGameStore.setState(s => {
      const nextWatts = Math.max(0, s.resources.gridWatts.amount - 15);
      const nextHp = Math.min(s.player.maxHp, s.player.hp + 15);
      return {
        resources: { ...s.resources, gridWatts: { ...s.resources.gridWatts, amount: nextWatts } },
        player: { ...s.player, hp: nextHp }
      };
    });
    addLog('>> [SUPPORT] Nanite shields charged. Probe integrity restored by +15 HP.');
  };

  const triggerRadarScan = () => {
    if (resources.staticNoise.amount < 50 || !currentMap) return;
    useGameStore.setState(s => {
      if (!s.currentMap) return {};
      const nextStatic = Math.max(0, s.resources.staticNoise.amount - 50);
      const updatedCells = { ...s.currentMap.cells };
      for (const key in updatedCells) {
        updatedCells[key] = { ...updatedCells[key], explored: true };
      }
      return {
        resources: { ...s.resources, staticNoise: { ...s.resources.staticNoise, amount: nextStatic } },
        currentMap: { ...s.currentMap, cells: updatedCells }
      };
    });
    addLog('>> [SUPPORT] Radar scan active. Map layout fully decoded.');
  };

  const triggerRepairNanites = () => {
    if (resources.quantumFoam.amount < 20) return;
    useGameStore.setState(s => {
      const nextFoam = Math.max(0, s.resources.quantumFoam.amount - 20);
      const nextEquipment = { ...s.player.equipment };
      const slots = ['head', 'torso', 'hands', 'feet', 'mainHand', 'offHand', 'relic1', 'relic2'] as const;
      slots.forEach(slot => {
        const item = nextEquipment[slot];
        if (item && item.durability !== undefined && item.maxDurability !== undefined) {
          const restore = Math.round(item.maxDurability * 0.5);
          item.durability = Math.min(item.maxDurability, item.durability + restore);
        }
      });
      return {
        resources: { ...s.resources, quantumFoam: { ...s.resources.quantumFoam, amount: nextFoam } },
        player: { ...s.player, equipment: nextEquipment }
      };
    });
    addLog('>> [SUPPORT] Repair nanites injected. Equipment durability restored by 50%.');
  };

  const handleUseItem = (item: InventoryItem, idx: number) => {
    if (item.category === 'consumable') {
      useGameStore.setState(s => {
        let hp = s.player.hp;
        let effects = [...s.player.activeStatusEffects];

        if (item.id === 'hypothesis_cactus') {
          hp = s.player.maxHp;
          effects = []; // clear debuffs
          addLog('>> Consumed Hypothesis cactus. HP fully restored, debuffs cleared.');
        }

        const nextInv = s.player.inventory.filter((_, i) => i !== idx);
        return {
          player: {
            ...s.player,
            hp,
            activeStatusEffects: effects,
            inventory: nextInv,
          }
        };
      });
    } else {
      // Equip item
      useGameStore.setState(s => {
        const nextEquip = { ...s.player.equipment };
        const nextInv = [...s.player.inventory];

        let targetSlot: keyof typeof s.player.equipment = 'mainHand';
        if (item.category === 'weapon') targetSlot = 'mainHand';
        else if (item.category === 'armor') {
          if (item.id.includes('helm')) targetSlot = 'head';
          else if (item.id.includes('shield')) targetSlot = 'offHand';
          else if (item.id.includes('boots')) targetSlot = 'feet';
          else targetSlot = 'torso';
        } else if (item.category === 'relic') {
          targetSlot = nextEquip.relic1 === null ? 'relic1' : 'relic2';
        }

        const currentEquipped = nextEquip[targetSlot];
        if (currentEquipped) {
          nextInv.push(currentEquipped);
        }

        nextEquip[targetSlot] = item;
        const filteredInv = nextInv.filter((_, i) => i !== idx);

        return {
          player: {
            ...s.player,
            equipment: nextEquip,
            inventory: filteredInv,
          }
        };
      });

      addLog(`>> Equipped ${item.name}.`);
    }
  };

  const handleUnequip = (slot: keyof typeof player.equipment) => {
    const item = player.equipment[slot];
    if (!item) return;

    useGameStore.setState(s => {
      const nextEquip = { ...s.player.equipment };
      const nextInv = [...s.player.inventory];

      nextEquip[slot] = null;
      nextInv.push(item);

      return {
        player: {
          ...s.player,
          equipment: nextEquip,
          inventory: nextInv,
        }
      };
    });

    addLog(`>> Unequipped ${item.name}.`);
  };

  // Render the ASCII Grid Map character matrix
  const renderMapGrid = () => {
    if (!currentMap) return null;

    const rows: React.ReactNode[] = [];
    for (let y = 0; y < currentMap.height; y++) {
      const cols: React.ReactNode[] = [];
      for (let x = 0; x < currentMap.width; x++) {
        const key = `${x},${y}`;
        const cell = currentMap.cells[key];
        const isPlayer = playerGrid.x === x && playerGrid.y === y;

        if (isPlayer) {
          cols.push(
            <span key={key} style={{ color: '#00ff88', fontWeight: 'bold', background: '#222200' }}>
              @
            </span>
          );
          continue;
        }

        if (!cell || !cell.explored) {
          cols.push(<span key={key} style={{ color: '#1a1a1a' }}>░</span>);
          continue;
        }

        let fg = cell.fg;
        let bg = cell.bg;
        let glyph = cell.glyph;

        if (!cell.visible) {
          fg = '#3a3a3a'; // Explored but out of FOV
        }

        if (cell.isGlitchTile && cell.visible) {
          const pool = '!@#$%^&*()_+-=[]{}';
          const randIdx = Math.floor(Math.random() * pool.length);
          glyph = pool[randIdx];
        }

        cols.push(
          <span 
            key={key} 
            style={{ color: fg, background: bg, transition: 'color 0.15s ease' }}
            title={cell.entityId ? enemyDatabase[cell.entityId]?.name : undefined}
          >
            {glyph}
          </span>
        );
      }
      rows.push(<div key={y} style={{ lineHeight: '1', height: '1rem' }}>{cols}</div>);
    }

    return rows;
  };

  const eqStats = getEquipmentStats(player);

  const scraperCount = state.automationUnits.find(u => u.id === 'scraper')?.count || 0;
  const compilerCount = state.automationUnits.find(u => u.id === 'compiler')?.count || 0;
  const daemonCount = state.automationUnits.find(u => u.id === 'daemon')?.count || 0;
  const bufferCount = state.automationUnits.find(u => u.id === 'buffer')?.count || 0;
  const reaperCount = state.automationUnits.find(u => u.id === 'reaper')?.count || 0;
  const latticeCount = state.automationUnits.find(u => u.id === 'lattice')?.count || 0;

  const isLowHp = player.hp < player.maxHp * 0.25;

  return (
    <div 
      className="grid-viewport-container" 
      style={{
        padding: '0px',
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        fontFamily: 'Share Tech Mono, monospace',
        color: 'var(--terminal-green)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        gap: '12px',
        position: 'relative'
      }}
    >
      {/* Grid Canvas View */}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          border: '1px solid var(--terminal-green)',
          background: '#0a0a0a',
          padding: '8px',
          overflow: 'auto',
          fontSize: '0.85rem',
          whiteSpace: 'pre',
          lineHeight: '1',
          userSelect: 'none',
          position: 'relative'
        }}
      >
        {renderMapGrid()}

        {/* Standby Deployment Overlay Lever */}
        {standby && (
          <div 
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5, 5, 5, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 100,
              border: '2px dashed var(--terminal-green)'
            }}
          >
            <div style={{ color: 'var(--amber-warning)', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center', animation: 'blink-arrow 1s infinite' }}>
              [!] PROBE IN STANDBY DETECTED [!]
            </div>
            <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '25px', textAlign: 'center' }}>
              DEPLOYMENT PATH SECURED. CLICK LEVER TO CLEAR FOR LAUNCH.
            </div>
            <button
              onClick={pullLever}
              className="op-button"
              style={{
                fontSize: '1.1rem',
                padding: '12px 24px',
                border: '2px solid var(--terminal-green)',
                background: 'rgba(51, 255, 102, 0.15)',
                boxShadow: '0 0 15px rgba(51, 255, 102, 0.4)'
              }}
            >
              [ PULL LEVER TO DEPLOY PROBE ]
            </button>
          </div>
        )}

        {/* Low HP Warning Banner */}
        {isLowHp && !standby && (
          <div 
            style={{
              position: 'absolute',
              bottom: '10px', left: '10px', right: '10px',
              background: 'rgba(255, 0, 0, 0.85)',
              color: '#fff',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              textAlign: 'center',
              border: '1px solid #ff3333',
              boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)',
              zIndex: 90
            }}
          >
            ⚠️ [WARNING: PROBE INTEGRITY CRITICAL - RECHARGE HP IMMEDIATELY] ⚠️
          </div>
        )}
      </div>

      {/* Sidebar stats/inventory/goals */}
      <div style={{ width: '250px', display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px dashed var(--terminal-green)', paddingLeft: '10px', boxSizing: 'border-box' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '3px', marginBottom: '8px', flexShrink: 0 }}>
          {['STATS', 'INVENTORY', 'GOALS'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                flex: 1,
                background: activeTab === tab ? 'var(--terminal-green)' : 'transparent',
                color: activeTab === tab ? '#000000' : 'var(--terminal-green)',
                border: '1px solid var(--terminal-green)',
                cursor: 'pointer',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '0.75rem',
                padding: '4px 0px'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* STATS VIEW */}
          {activeTab === 'STATS' && (
            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '5px' }}>
                OPERATOR LOGISTICS
              </div>
              <div style={{ color: isLowHp ? 'var(--amber-warning)' : 'inherit', fontWeight: isLowHp ? 'bold' : 'normal' }}>
                HP: {player.hp} / {player.maxHp}
              </div>
              <div>LEVEL: {player.level}</div>
              <div>XP: {player.experience} / {player.experienceToNextLevel}</div>
              <div>ATK: {player.baseAttack} (+{eqStats.attack})</div>
              <div>DEF: {player.baseDefense} (+{eqStats.defense})</div>
              <div>SPD: {player.speed} (+{eqStats.speed})</div>
              
              <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', margin: '8px 0 5px 0' }}>
                LOADOUT
              </div>
              {Object.entries(player.equipment).map(([slot, item]) => (
                <div key={slot} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                  <span style={{ opacity: 0.8 }}>{slot}:</span>
                  {item ? (
                    <span 
                      onClick={() => handleUnequip(slot as keyof typeof player.equipment)}
                      style={{ textDecoration: 'underline', cursor: 'pointer', color: '#ffb997' }}
                    >
                      {item.name.substring(0, 15)} {item.durability !== undefined ? `(${item.durability})` : ''}
                    </span>
                  ) : (
                    <span style={{ color: '#555555' }}>[-]</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* INVENTORY VIEW */}
          {activeTab === 'INVENTORY' && (
            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '5px' }}>
                INVENTORY PACK ({player.inventory.length}/{player.maxInventorySlots})
              </div>
              {player.inventory.length === 0 ? (
                <div style={{ color: '#555555' }}>Pack is empty.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {player.inventory.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #224422', padding: '3px' }}>
                      <div style={{ minWidth: 0, flex: 1, marginRight: '4px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                      </div>
                      <button 
                        onClick={() => handleUseItem(item, idx)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--terminal-green)',
                          color: 'var(--terminal-green)',
                          cursor: 'pointer',
                          fontFamily: 'Share Tech Mono, monospace',
                          fontSize: '0.75rem',
                          alignSelf: 'center',
                          padding: '2px 4px',
                          flexShrink: 0
                        }}
                      >
                        {item.category === 'consumable' ? '[USE]' : '[EQ]'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GOALS & SUPPORT VIEW */}
          {activeTab === 'GOALS' && (
            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '3px' }}>GRID DEPTH</div>
                <div>FLOOR: <strong style={{ color: '#fff' }}>Depth {currentMap?.depth || 1}</strong></div>
              </div>

              <div>
                <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '3px' }}>MAINFRAME SUPPORT BUFFS</div>
                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>Scrapers ({scraperCount}): +{scraperCount}% Crit Rate</div>
                  <div>Compilers ({compilerCount}): +{compilerCount} ATK Damage</div>
                  <div>Daemons ({daemonCount}): +{daemonCount} DEF Penetration</div>
                  <div>Buffers ({bufferCount}): +{bufferCount * 5} Max HP</div>
                  <div>Reapers ({reaperCount}): +{reaperCount * 5}% Lifesteal</div>
                  <div>Lattices ({latticeCount}): +{latticeCount * 2}% Evasion</div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '5px' }}>TACTICAL SUPPORT OP</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={triggerOvercharge}
                    disabled={resources.gridWatts.amount < 10}
                    className="op-button"
                    style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', padding: '4px' }}
                    title="Route Watts to overcharge probe attack capacity."
                  >
                    ⚡ OVERCHARGE ATK (10W)
                  </button>
                  <button
                    onClick={triggerShieldRecharge}
                    disabled={resources.gridWatts.amount < 15}
                    className="op-button"
                    style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', padding: '4px' }}
                    title="Recharge shields to repair probe integrity."
                  >
                    🛡 RECHARGE SHIELD (15W)
                  </button>
                  <button
                    onClick={triggerRadarScan}
                    disabled={resources.staticNoise.amount < 50}
                    className="op-button"
                    style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', padding: '4px' }}
                    title="Scan sector electromagnetic echo to map floor layout."
                  >
                    📡 RADAR SCAN (50 Static)
                  </button>
                  <button
                    onClick={triggerRepairNanites}
                    disabled={resources.quantumFoam.amount < 20}
                    className="op-button"
                    style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', padding: '4px' }}
                    title="Inject repair nanites to restore gear durability by 50%."
                  >
                    🔧 REPAIR GEAR (20 Foam)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default GridViewport;
