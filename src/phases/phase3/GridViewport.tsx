// src/phases/phase3/GridViewport.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { generateMap } from './MapGenerator';
import { computeFogOfWar } from './FogOfWar';
import { createEnemy, type EnemyStats } from './enemies/EnemyFactory';
import { decideEnemyAction } from './enemies/AIBehaviorTree';
import { playerAttackEnemy, enemyAttackPlayer, getEquipmentStats } from './CombatEngine';
import { eventBus } from '../../engine/EventBus';
import type { InventoryItem, StatusEffect } from '../../store/types';
import { unlockAchievement } from '../../engine/AchievementChecker';

export const GridViewport: React.FC = () => {
  const state = useGameStore();
  const { currentMap, playerGrid, player } = state;

  const [combatLogs, setCombatLogs] = useState<string[]>(['>> Entered the Substratum Grid. System alert: proceed with caution.']);
  const [activeTab, setActiveTab] = useState<'STATS' | 'INVENTORY'>('STATS');
  const [enemyDatabase, setEnemyDatabase] = useState<Record<string, EnemyStats>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Map if null
  useEffect(() => {
    if (!currentMap) {
      // Generate Depth 1 map
      const initialSeed = Math.floor(Date.now() / 1000);
      const newMap = generateMap(1, initialSeed);
      const mapWithFov = computeFogOfWar(newMap.playerStart.x, newMap.playerStart.y, playerGrid.fovRadius, newMap);
      
      // Seed enemy database
      const db: Record<string, EnemyStats> = {};
      for (const key in mapWithFov.cells) {
        const cell = mapWithFov.cells[key];
        if (cell.entityId) {
          db[cell.entityId] = createEnemy(cell.entityId, 1);
        }
      }
      setEnemyDatabase(db);

      useGameStore.setState({
        currentMap: mapWithFov,
        playerGrid: {
          ...playerGrid,
          x: newMap.playerStart.x,
          y: newMap.playerStart.y,
        },
        visitedMapSeeds: [initialSeed],
      });
    }
  }, [currentMap]);

  // Handle key listeners for grid navigation
  useEffect(() => {
    if (state.phase !== 'GRID' || !currentMap) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let dx = 0;
      let dy = 0;
      let actionType: 'MOVE' | 'WAIT' | null = null;

      switch (e.key.toLowerCase()) {
        case 'w':
case 'arrowup':
          dy = -1;
          actionType = 'MOVE';
          break;
        case 's':
case 'arrowdown':
          dy = 1;
          actionType = 'MOVE';
          break;
        case 'a':
case 'arrowleft':
          dx = -1;
          actionType = 'MOVE';
          break;
        case 'd':
case 'arrowright':
          dx = 1;
          actionType = 'MOVE';
          break;
        case ' ':
          actionType = 'WAIT';
          break;
        default:
          return; // ignore other keys
      }

      e.preventDefault();
      if (actionType === 'MOVE') {
        attemptMove(dx, dy);
      } else if (actionType === 'WAIT') {
        addLog('>> Player waits a turn.');
        processEnemyTurns();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.phase, currentMap, playerGrid, player, enemyDatabase]);

  const addLog = (log: string) => {
    setCombatLogs(prev => [log, ...prev].slice(0, 50));
  };

  const attemptMove = (dx: number, dy: number) => {
    if (!currentMap) return;

    const targetX = playerGrid.x + dx;
    const targetY = playerGrid.y + dy;
    const targetKey = `${targetX},${targetY}`;
    const cell = currentMap.cells[targetKey];

    if (!cell) return;

    // 1. Check if occupied by enemy -> Trigger Combat
    if (cell.entityId) {
      const enemy = enemyDatabase[cell.entityId];
      if (enemy) {
        // Player attacks enemy
        const result = playerAttackEnemy(player, enemy);
        addLog(result.combatLog);

        if (result.hit) {
          const nextHp = Math.max(0, enemy.hp - result.damage);
          const nextDb = { ...enemyDatabase };
          
          if (nextHp <= 0) {
            // Defeated!
            addLog(`>> Defeated ${enemy.name}! Gain ${enemy.xpValue} XP.`);
            nextDb[cell.entityId] = { ...enemy, hp: 0 };
            
            // Unlock achievements
            unlockAchievement('first_kill');
            if (enemy.enemyType === 'ghost') {
              unlockAchievement('data_ghost');
            }
            
            // Trigger phase 4 unlock notification
            if (enemy.id === 'boss_10') {
              eventBus.emit('notification', { message: 'Paradigm Shift Unlocked! Hacking interface open.', type: 'success' });
            }

            // Remove from cell
            useGameStore.setState(s => {
              if (!s.currentMap) return {};
              const nextCells = { ...s.currentMap.cells };
              nextCells[targetKey] = { ...nextCells[targetKey], entityId: undefined };
              
              let phase = s.phase;
              let injectionTerminalUnlocked = s.injectionTerminalUnlocked;
              let terminalHistory = [...s.terminalHistory];

              if (enemy.id === 'boss_10') {
                phase = 'PARADIGM';
                injectionTerminalUnlocked = true;
                terminalHistory.push(
                  '>> [SYSTEM ALERT] NODE MONITOR ARCHIVIST OFFLINE.',
                  '>> RECOVERED ARCHIVIST KEY FILE.',
                  '>> PARADIGM COMPILATION PORT ACTIVE.',
                  '>> [PHASE 4 UNLOCKED: THE PARADIGM SHIFT]'
                );
              }

              // Handle drops
              const nextInv = [...s.player.inventory];
              enemy.drops.forEach(drop => {
                if (Math.random() < drop.chance && drop.item) {
                  const newItem = {
                    ...drop.item,
                    quantity: 1,
                  } as InventoryItem;
                  nextInv.push(newItem);
                  addLog(`>> Acquired item: ${newItem.name}`);
                }
              });

              // Process XP & Level Up
              let nextXp = s.player.experience + enemy.xpValue;
              let nextLvl = s.player.level;
              let nextMaxXp = s.player.experienceToNextLevel;
              let nextMaxHp = s.player.maxHp;
              let nextAtk = s.player.baseAttack;
              let nextDef = s.player.baseDefense;

              if (nextXp >= nextMaxXp) {
                nextLvl += 1;
                nextXp -= nextMaxXp;
                nextMaxXp = Math.floor(50 * Math.pow(nextLvl, 1.6));
                nextMaxHp += 5 + Math.floor(nextLvl / 2);
                nextAtk += 1;
                if (nextLvl % 2 === 0) nextDef += 1;
                
                eventBus.emit('notification', { message: `LEVEL UP! Reached Level ${nextLvl}!`, type: 'success' });
              }

              return {
                phase,
                injectionTerminalUnlocked,
                terminalHistory: terminalHistory.slice(-200),
                currentMap: { ...s.currentMap, cells: nextCells },
                player: {
                  ...s.player,
                  level: nextLvl,
                  experience: nextXp,
                  experienceToNextLevel: nextMaxXp,
                  maxHp: nextMaxHp,
                  hp: Math.min(nextMaxHp, s.player.hp + 5), // heal 5 on level up
                  baseAttack: nextAtk,
                  baseDefense: nextDef,
                  inventory: nextInv,
                }
              };
            });
          } else {
            // Keep alive
            nextDb[cell.entityId] = { ...enemy, hp: nextHp };
          }
          setEnemyDatabase(nextDb);
        }

        // Action spent, process enemy turns
        processEnemyTurns();
        return;
      }
    }

    // 2. Check if walkable
    if (cell.passable || cell.glyph === '<' || cell.glyph === '>') {
      // Move player
      useGameStore.setState(s => {
        if (!s.currentMap) return {};
        
        let nextMap = s.currentMap;
        let nextX = targetX;
        let nextY = targetY;
        let nextDepth = currentMap.depth;

        // Collect item if standing on it
        let nextInventory = [...s.player.inventory];
        const standingCell = nextMap.cells[targetKey];
        
        if (standingCell.itemId) {
          const itemKey = standingCell.itemId;
          
          if (itemKey.startsWith('lore_cache')) {
            // Discover a log
            const logId = `log_${nextDepth}`;
            const unlockedLogs = [...s.discoveredLore];
            if (!unlockedLogs.some(l => l.id === logId)) {
              // Retrieve log content from database (we'll implement this verbatim in lore databases!)
              unlockedLogs.push({
                id: logId,
                title: `LOG #${nextDepth} - DECODED RECORD`,
                body: `Substratum Node ${nextDepth} records. System details archived. [Full text available in Lore DB]`,
                discoveredAtPhase: 'GRID',
                discoveredTimestamp: Date.now(),
                isRead: false,
                narrativeWeight: 3,
              });
              eventBus.emit('notification', { message: `Recovered Lore Log #${nextDepth}!`, type: 'success' });
            }
            useGameStore.setState({ discoveredLore: unlockedLogs });
          } else if (itemKey === 'cactus_hypothesis') {
            nextInventory.push({
              id: 'hypothesis_cactus',
              name: 'Hypothesis (Cactus)',
              description: 'Consumable. Restores 100% HP and cures status effects.',
              category: 'consumable',
              quantity: 1,
              flags: ['LEGENDARY'],
            });
            addLog('>> Acquired cactus item: Hypothesis.');
          }

          // Clear item id from map
          const updatedCells = { ...nextMap.cells };
          updatedCells[targetKey] = { ...standingCell, itemId: undefined };
          nextMap = { ...nextMap, cells: updatedCells };
        }

        // Descend staircase
        if (standingCell.glyph === '>') {
          nextDepth += 1;
          const nextSeed = Math.floor(s.tickCount * 1.618) + nextDepth;
          addLog(`>> Descending to Depth ${nextDepth}...`);
          nextMap = generateMap(nextDepth, nextSeed);
          nextX = nextMap.playerStart.x;
          nextY = nextMap.playerStart.y;
          
          // Clear enemy DB for new floor
          const db: Record<string, EnemyStats> = {};
          for (const key in nextMap.cells) {
            const cell = nextMap.cells[key];
            if (cell.entityId) {
              db[cell.entityId] = createEnemy(cell.entityId, nextDepth);
            }
          }
          setEnemyDatabase(db);
        }

        // Ascend staircase
        if (standingCell.glyph === '<' && nextDepth > 1) {
          nextDepth -= 1;
          const nextSeed = Math.floor(s.tickCount * 1.618) + nextDepth;
          addLog(`>> Ascending to Depth ${nextDepth}...`);
          nextMap = generateMap(nextDepth, nextSeed);
          nextX = nextMap.playerStart.x;
          nextY = nextMap.playerStart.y;
          
          // Clear enemy DB
          const db: Record<string, EnemyStats> = {};
          for (const key in nextMap.cells) {
            const cell = nextMap.cells[key];
            if (cell.entityId) {
              db[cell.entityId] = createEnemy(cell.entityId, nextDepth);
            }
          }
          setEnemyDatabase(db);
        }

        // Exit True Floor (Secret 05)
        if (standingCell.glyph === '✦') {
          addLog('>> Returning to real Substratum layer...');
          nextDepth = 10; // return to depth 10
          nextMap = generateMap(10, Math.floor(Date.now() / 1000));
          nextX = nextMap.playerStart.x;
          nextY = nextMap.playerStart.y;
        }

        // Compute FOV
        const mapWithFov = computeFogOfWar(nextX, nextY, s.playerGrid.fovRadius, nextMap);

        return {
          currentMap: mapWithFov,
          playerGrid: {
            ...s.playerGrid,
            x: nextX,
            y: nextY,
          },
          player: {
            ...s.player,
            inventory: nextInventory,
          }
        };
      });

      // Actions spent, process enemy turns
      processEnemyTurns();
    }
  };

  const processEnemyTurns = () => {
    if (!currentMap) return;

    useGameStore.setState(s => {
      if (!s.currentMap) return {};
      
      const nextCells = { ...s.currentMap.cells };
      const nextDb = { ...enemyDatabase };
      let playerHp = s.player.hp;
      const nextEffects = [...s.player.activeStatusEffects];

      // Gather list of enemies currently alive on the map
      const enemyPositions: Array<{ id: string; x: number; y: number }> = [];
      for (const key in nextCells) {
        const cell = nextCells[key];
        if (cell.entityId) {
          enemyPositions.push({ id: cell.entityId, x: cell.x, y: cell.y });
        }
      }

      // Loop through each enemy and run their AI action
      enemyPositions.forEach(({ id, x, y }) => {
        const enemy = nextDb[id];
        if (!enemy || enemy.hp <= 0) return;

        const action = decideEnemyAction(enemy, x, y, s.playerGrid.x, s.playerGrid.y, s.currentMap!);

        if (action.type === 'MOVE' && action.x !== undefined && action.y !== undefined) {
          // Move enemy
          const oldKey = `${x},${y}`;
          const newKey = `${action.x},${action.y}`;
          
          nextCells[oldKey] = { ...nextCells[oldKey], entityId: undefined };
          nextCells[newKey] = { ...nextCells[newKey], entityId: id };
        } 
        else if (action.type === 'TELEPORT' && action.x !== undefined && action.y !== undefined) {
          const oldKey = `${x},${y}`;
          const newKey = `${action.x},${action.y}`;
          
          nextCells[oldKey] = { ...nextCells[oldKey], entityId: undefined };
          nextCells[newKey] = { ...nextCells[newKey], entityId: id };
          addLog(`>> ${enemy.name} glitched and teleported adjacent!`);
        }
        else if (action.type === 'ATTACK') {
          // Attack player
          const combatRes = enemyAttackPlayer(enemy, s.player);
          addLog(`>> ${combatRes.combatLog}`);

          if (combatRes.hit) {
            playerHp = Math.max(0, playerHp - combatRes.damage);
            
            // Check status effect application
            if (combatRes.statusApplied) {
              const effectName = combatRes.statusApplied as StatusEffect;
              if (!nextEffects.some(e => e.effect === effectName)) {
                nextEffects.push({
                  effect: effectName,
                  remainingTicks: 10,
                  magnitude: 1,
                });
                addLog(`>> Player infected with status: [${effectName}]!`);
              }
            }

            // Durability damage on hit received
            const equipSlots: (keyof typeof s.player.equipment)[] = ['head', 'torso', 'hands', 'feet'];
            equipSlots.forEach(slot => {
              const item = s.player.equipment[slot];
              if (item && item.durability !== undefined) {
                item.durability = Math.max(0, item.durability - 1);
              }
            });
          }
        }
        else if (action.type === 'HEAL' && action.amount !== undefined) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + action.amount);
          addLog(`>> ${enemy.name} repaired itself for +${action.amount} HP.`);
        }
      });

      return {
        currentMap: { ...s.currentMap, cells: nextCells },
        player: {
          ...s.player,
          hp: playerHp,
          activeStatusEffects: nextEffects,
        }
      };
    });
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
        } else if (item.id === 'null_syringe') {
          // Applies nullPoison to player? Syringes can be consumed for overclocking or used on self
          addLog('>> Syringe injected. Standard diagnostics processed.');
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

        // Unequip currently equipped
        const currentEquipped = nextEquip[targetSlot];
        if (currentEquipped) {
          nextInv.push(currentEquipped);
        }

        // Equip new
        nextEquip[targetSlot] = item;
        
        // Remove from inventory
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

        // Flicker glitch tile shimmer
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

  return (
    <div 
      className="grid-viewport-container" 
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
        }}
      >
        {renderMapGrid()}
      </div>

      {/* Sidebar stats/inventory */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px dashed var(--terminal-green)', paddingLeft: '10px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
          <button 
            onClick={() => setActiveTab('STATS')}
            style={{
              flex: 1,
              background: activeTab === 'STATS' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'STATS' ? '#000000' : 'var(--terminal-green)',
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
            }}
          >
            STATS
          </button>
          <button 
            onClick={() => setActiveTab('INVENTORY')}
            style={{
              flex: 1,
              background: activeTab === 'INVENTORY' ? 'var(--terminal-green)' : 'transparent',
              color: activeTab === 'INVENTORY' ? '#000000' : 'var(--terminal-green)',
              border: '1px solid var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
            }}
          >
            INVENTORY
          </button>
        </div>

        {/* STATS VIEW */}
        {activeTab === 'STATS' && (
          <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '5px' }}>
              OPERATOR LOGISTICS
            </div>
            <div>HP: {player.hp} / {player.maxHp}</div>
            <div>LEVEL: {player.level} &middot; XP: {player.experience}/{player.experienceToNextLevel}</div>
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
          <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '5px' }}>
              INVENTORY PACK ({player.inventory.length}/{player.maxInventorySlots})
            </div>
            {player.inventory.length === 0 ? (
              <div style={{ color: '#555555' }}>Pack is empty.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {player.inventory.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #224422', padding: '3px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{item.description}</div>
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

        {/* COMBAT LOGS STREAM */}
        <div style={{ height: '120px', borderTop: '1px solid var(--terminal-green)', paddingTop: '5px', marginTop: '8px', overflowY: 'auto', fontSize: '0.75rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px', opacity: 0.8 }}>COMBAT LOG</div>
          {combatLogs.map((log, idx) => (
            <div key={idx} style={{ color: log.startsWith('★') ? 'var(--amber-warning)' : log.includes('Defeated') ? '#00ff88' : '#cccccc', marginBottom: '2px' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default GridViewport;
