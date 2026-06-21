// src/phases/phase3/GridViewport.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { 
  getEquipmentStats, 
  getEffectiveMaxHp, 
  SPECIAL_ATTACKS, 
  executeSpecialAttack 
} from './CombatEngine';
import type { InventoryItem } from '../../store/types';
import { eventBus } from '../../engine/EventBus';

const PLAYER_ASCII = `      .---.
     /     \\
    \\\\  ^  //
     \\\\___//
    /       \\
   /|   |   |\\
  / |   |   | \\
 |  |   |   |  |
 |  |___|___|  |
 |  (   |   )  |
  \\  \\  |  /  /
   '--'-'-'--'`;

export const GridViewport: React.FC = () => {
  const state = useGameStore();
  const { 
    player, 
    activeCombatEnemy, 
    combatHistory, 
    playerAttackCooldowns, 
    standby, 
    resources, 
    automationUnits, 
    highestDepthReached 
  } = state;

  const [activeTab, setActiveTab] = useState<'STATS' | 'INVENTORY' | 'GOALS'>('STATS');
  const containerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll combat log to bottom on updates
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [combatHistory]);

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

  // Clickable player special attacks
  const handleSpecialAttack = (attackId: string) => {
    if (!activeCombatEnemy) return;
    const res = executeSpecialAttack(attackId, player, activeCombatEnemy, state);
    if (!res.success) {
      eventBus.emit('notification', { message: res.error || 'Cannot use ability', type: 'warn' });
      return;
    }

    const combatResult = res.result!;
    const nextEnemyHp = Math.max(0, activeCombatEnemy.hp - combatResult.damage);
    const updatedEnemy = { ...activeCombatEnemy, hp: nextEnemyHp };
    
    if (combatResult.statusApplied) {
      updatedEnemy.activeStatusEffects = updatedEnemy.activeStatusEffects || [];
      updatedEnemy.activeStatusEffects.push({ effect: combatResult.statusApplied, remainingTicks: 6, magnitude: 1 });
    }

    const nextHistory = [...state.combatHistory, combatResult.combatLog];
    const terminalHistory = [...state.terminalHistory, combatResult.combatLog];

    // Set cooldown in ticks (cooldown seconds * 20 ticks/sec)
    const attack = SPECIAL_ATTACKS.find(a => a.id === attackId);
    const cooldownTicks = attack ? attack.cooldownSec * 20 : 80;
    const nextCooldowns = {
      ...state.playerAttackCooldowns,
      [attackId]: cooldownTicks
    };

    useGameStore.setState(s => {
      let nextHp = s.player.hp;
      let nextExp = s.player.experience;
      let nextLvl = s.player.level;
      let nextMaxXp = s.player.experienceToNextLevel;
      let nextMaxHp = s.player.maxHp;
      let nextBaseAtk = s.player.baseAttack;
      let nextBaseDef = s.player.baseDefense;
      let nextDepth = s.highestDepthReached || 1;
      let standbyMode = s.standby;
      let autoActive = s.autoExploreActive;
      let currentPhase = s.phase;
      let injectionUnlocked = s.injectionTerminalUnlocked;
      const playerInventory = [...s.player.inventory];
      let activeEnemy: any = updatedEnemy;
      let defeatCount = s.combatDefeatCount;

      if (nextEnemyHp <= 0) {
        // Enemy defeated!
        terminalHistory.push(`>> Defeated ${activeEnemy.name}! Gain ${activeEnemy.xpValue} XP.`);
        nextHistory.push(`>> Defeated ${activeEnemy.name}! Gain ${activeEnemy.xpValue} XP.`);

        nextExp += activeEnemy.xpValue;
        if (nextExp >= nextMaxXp) {
          nextLvl += 1;
          nextExp -= nextMaxXp;
          nextMaxXp = Math.floor(50 * Math.pow(nextLvl, 1.6));
          nextMaxHp += 5 + Math.floor(nextLvl / 2);
          nextBaseAtk += 1;
          if (nextLvl % 2 === 0) nextBaseDef += 1;
          nextHp = Math.min(nextMaxHp, nextHp + 5);
          eventBus.emit('notification', { message: `LEVEL UP! Reached Level ${nextLvl}!`, type: 'success' });
        }

        // Drops
        activeEnemy.drops.forEach((drop: any) => {
          if (Math.random() < drop.chance && drop.item) {
            const newItem = { ...drop.item, quantity: 1 } as InventoryItem;
            if (playerInventory.length < s.player.maxInventorySlots) {
              playerInventory.push(newItem);
              nextHistory.push(`>> Acquired item: ${newItem.name}`);
              terminalHistory.push(`>> Acquired item: ${newItem.name}`);
            }
          }
        });

        // Boss checks
        if (activeEnemy.enemyType === 'boss') {
          nextDepth += 1;
          defeatCount = 0;
          standbyMode = true;
          autoActive = false;
          terminalHistory.push(`>> [SUCCESS] Descended to Depth ${nextDepth}.`);
          nextHistory.push(`>> [SUCCESS] Descended to Depth ${nextDepth}.`);

          if (nextDepth === 11 && currentPhase === 'GRID') {
            currentPhase = 'PARADIGM';
            injectionUnlocked = true;
            terminalHistory.push(
              '>> [SYSTEM ALERT] NODE MONITOR ARCHIVIST OFFLINE.',
              '>> RECOVERED ARCHIVIST KEY FILE.',
              '>> PARADIGM COMPILATION PORT ACTIVE.'
            );
            eventBus.emit('notification', { message: 'Paradigm Shift Unlocked! Hacking interface open.', type: 'success' });
          }
        } else {
          defeatCount += 1;
        }

        activeEnemy = null;
      }

      return {
        player: {
          ...s.player,
          hp: nextHp,
          maxHp: nextMaxHp,
          experience: nextExp,
          level: nextLvl,
          experienceToNextLevel: nextMaxXp,
          baseAttack: nextBaseAtk,
          baseDefense: nextBaseDef,
          inventory: playerInventory,
        },
        activeCombatEnemy: activeEnemy,
        combatDefeatCount: defeatCount,
        highestDepthReached: nextDepth,
        standby: standbyMode,
        autoExploreActive: autoActive,
        phase: currentPhase,
        injectionTerminalUnlocked: injectionUnlocked,
        combatHistory: nextHistory.slice(-100),
        terminalHistory: terminalHistory.slice(-200),
        playerAttackCooldowns: nextCooldowns,
      };
    });
  };

  // Support Actions (Synergized with getEffectiveMaxHp)
  const triggerOvercharge = () => {
    if (resources.gridWatts.amount < 10) return;
    useGameStore.setState(s => {
      const nextWatts = Math.max(0, s.resources.gridWatts.amount - 10);
      const nextEffects = [...s.player.activeStatusEffects];
      const idx = nextEffects.findIndex(e => e.effect === 'overclockedI');
      if (idx >= 0) {
        nextEffects[idx].remainingTicks = 400;
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
      const effectiveMaxHp = getEffectiveMaxHp(s.player, s);
      const nextHp = Math.min(effectiveMaxHp, s.player.hp + 15);
      return {
        resources: { ...s.resources, gridWatts: { ...s.resources.gridWatts, amount: nextWatts } },
        player: { ...s.player, hp: nextHp }
      };
    });
    addLog('>> [SUPPORT] Nanite shields charged. Probe integrity restored by +15 HP.');
  };

  const triggerRadarScan = () => {
    if (resources.staticNoise.amount < 50) return;
    useGameStore.setState(s => {
      const nextStatic = Math.max(0, s.resources.staticNoise.amount - 50);
      // Radar scans are lore-integrated in auto-battler: exposes enemy layout details
      return {
        resources: { ...s.resources, staticNoise: { ...s.resources.staticNoise, amount: nextStatic } }
      };
    });
    addLog('>> [SUPPORT] Radar scan active. Area electromagnetic echo decoded.');
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
        const effectiveMaxHp = getEffectiveMaxHp(s.player, s);
        let hp = s.player.hp;
        let effects = [...s.player.activeStatusEffects];

        if (item.id === 'hypothesis_cactus' || item.id === 'cactus_hypothesis') {
          hp = effectiveMaxHp;
          effects = []; // clear debuffs
          addLog('>> Consumed Hypothesis cactus. HP fully restored, debuffs cleared.');
        } else if (item.id === 'null_syringe') {
          hp = Math.min(effectiveMaxHp, hp + 30);
          effects.push({ effect: 'nullPoison', remainingTicks: 60, magnitude: 1 });
          addLog('>> Consumed Null-Syringe. HP +30. Injected Null Poison.');
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
          if (item.id.includes('visor') || item.id.includes('mask') || item.id.includes('helm')) targetSlot = 'head';
          else if (item.id.includes('shield')) targetSlot = 'offHand';
          else if (item.id.includes('boots') || item.id.includes('greaves') || item.id.includes('thrusters')) targetSlot = 'feet';
          else if (item.id.includes('gloves') || item.id.includes('gauntlets') || item.id.includes('claws')) targetSlot = 'hands';
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

  const drawBar = (current: number, max: number, chars = 20) => {
    const filled = Math.min(chars, Math.max(0, Math.round((current / max) * chars)));
    const empty = chars - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  };

  const eqStats = getEquipmentStats(player);
  const effectiveMaxHp = getEffectiveMaxHp(player, state);

  const scraperCount = automationUnits.find(u => u.id === 'scraper')?.count || 0;
  const compilerCount = automationUnits.find(u => u.id === 'compiler')?.count || 0;
  const daemonCount = automationUnits.find(u => u.id === 'daemon')?.count || 0;
  const bufferCount = automationUnits.find(u => u.id === 'buffer')?.count || 0;
  const reaperCount = automationUnits.find(u => u.id === 'reaper')?.count || 0;
  const latticeCount = automationUnits.find(u => u.id === 'lattice')?.count || 0;

  const isLowHp = player.hp < effectiveMaxHp * 0.25;

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
      {/* Auto-Battler Arena View */}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          border: '1px solid var(--terminal-green)',
          background: '#050505',
          padding: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          userSelect: 'none',
          position: 'relative'
        }}
      >
        {/* Standby Deployment Overlay Lever */}
        {standby && (
          <div 
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5, 5, 5, 0.92)',
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
              DEPTH {highestDepthReached} SECURED. CLICK LEVER TO DEPLOY COMBAT PROBE.
            </div>
            <button
              onClick={pullLever}
              className="op-button"
              style={{
                fontSize: '1.1rem',
                padding: '12px 24px',
                border: '2px solid var(--terminal-green)',
                background: 'rgba(51, 255, 102, 0.15)',
                boxShadow: '0 0 15px rgba(51, 255, 102, 0.4)',
                cursor: 'pointer',
                color: 'var(--terminal-green)',
                fontFamily: 'Share Tech Mono, monospace'
              }}
            >
              [ PULL LEVER TO DEPLOY PROBE ]
            </button>
          </div>
        )}

        {/* Combat Screen (if not standby) */}
        {!standby && (
          <>
            {/* Top row: HP bars */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px dashed #224422', paddingBottom: '6px' }}>
              {/* Player HP */}
              <div>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>PROBE: </span>
                <span style={{ color: isLowHp ? 'var(--amber-warning)' : '#00ff88' }}>
                  {drawBar(player.hp, effectiveMaxHp, 15)} {player.hp}/{effectiveMaxHp} HP
                </span>
              </div>
              
              {/* Enemy HP */}
              {activeCombatEnemy ? (
                <div>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{activeCombatEnemy.name}: </span>
                  <span style={{ color: '#ff3333' }}>
                    {drawBar(activeCombatEnemy.hp, activeCombatEnemy.maxHp, 15)} {activeCombatEnemy.hp}/{activeCombatEnemy.maxHp} HP
                  </span>
                </div>
              ) : (
                <div style={{ color: '#555555' }}>SCANNING SENSOR ECHOES...</div>
              )}
            </div>

            {/* Middle row: ASCII Arena */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px 0' }}>
              {/* Opponent top right */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', height: '110px', paddingRight: '20px' }}>
                {activeCombatEnemy && (
                  <pre style={{ margin: 0, color: activeCombatEnemy.fg, background: activeCombatEnemy.bg, fontFamily: 'Share Tech Mono, monospace', fontSize: '0.85rem', lineHeight: '1.2' }}>
                    {activeCombatEnemy.visual}
                  </pre>
                )}
              </div>

              {/* Player bottom left */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', height: '110px', paddingLeft: '20px' }}>
                <pre style={{ margin: 0, color: '#00ff88', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.85rem', lineHeight: '1.2' }}>
                  {PLAYER_ASCII}
                </pre>
              </div>
            </div>

            {/* Special clickable attacks */}
            <div style={{ borderTop: '1px dashed #224422', paddingTop: '8px', paddingBottom: '4px' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px', textTransform: 'uppercase' }}>Click to override autopilot attack vectors:</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {SPECIAL_ATTACKS.map((attack) => {
                  const currentCd = playerAttackCooldowns[attack.id] || 0;
                  const isCooldownActive = currentCd > 0;
                  const costWatts = attack.id === 'overclock_pierce' ? 5 : 0;
                  const hasInsufficientWatts = costWatts > 0 && resources.gridWatts.amount < costWatts;
                  
                  return (
                    <button
                      key={attack.id}
                      disabled={isCooldownActive || hasInsufficientWatts || !activeCombatEnemy}
                      onClick={() => handleSpecialAttack(attack.id)}
                      className="op-button"
                      style={{
                        flex: 1,
                        fontSize: '0.75rem',
                        padding: '4px 6px',
                        border: '1px solid ' + (isCooldownActive || hasInsufficientWatts ? '#444' : 'var(--terminal-green)'),
                        color: isCooldownActive ? '#666' : hasInsufficientWatts ? 'var(--amber-warning)' : 'var(--terminal-green)',
                        background: 'transparent',
                        cursor: (isCooldownActive || hasInsufficientWatts || !activeCombatEnemy) ? 'not-allowed' : 'pointer',
                        fontFamily: 'Share Tech Mono, monospace',
                        textAlign: 'left'
                      }}
                      title={attack.description}
                    >
                      <div>[{isCooldownActive ? `CD: ${(currentCd / 20).toFixed(1)}s` : attack.name}]</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{attack.costDesc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable logs */}
            <div 
              style={{
                height: '75px',
                border: '1px solid #1a331a',
                background: '#020202',
                padding: '6px',
                fontSize: '0.75rem',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                marginTop: '6px'
              }}
            >
              {combatHistory.length === 0 ? (
                <div style={{ color: '#444' }}>AUTOPILOT DIAGNOSTIC SUBROUTINES INITIALIZED...</div>
              ) : (
                combatHistory.map((log, idx) => (
                  <div key={idx} style={{ color: log.startsWith('★') ? '#ffd700' : log.startsWith('>>') ? '#00ff88' : 'inherit' }}>
                    {log}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </>
        )}

        {/* Low HP Warning Banner */}
        {isLowHp && !standby && (
          <div 
            style={{
              position: 'absolute',
              top: '40px', left: '10px', right: '10px',
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
                HP: {player.hp} / {effectiveMaxHp}
              </div>
              <div>LEVEL: {player.level}</div>
              <div>XP: {player.experience} / {player.experienceToNextLevel}</div>
              <div>ATK: {player.baseAttack} (+{eqStats.attack})</div>
              <div>DEF: {player.baseDefense} (+{eqStats.defense})</div>
              <div>SPD: {player.speed} (+{eqStats.speed})</div>
              
              {/* Set Bonuses */}
              <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', margin: '8px 0 5px 0' }}>
                ACTIVE SET SYNERGIES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                {eqStats.mainframeCount >= 2 ? (
                  <div style={{ color: '#00ff88' }}>🛡️ Mainframe (2/4): +15 Max HP</div>
                ) : (
                  <div style={{ color: '#555' }}>🛡️ Mainframe: {eqStats.mainframeCount}/4 equipped</div>
                )}
                {eqStats.mainframeCount >= 4 && (
                  <div style={{ color: '#00ff88' }}>⚡ Mainframe (4/4): +5 DEF, ATK +2% Watts, Overclock pierce CD -50%</div>
                )}

                {eqStats.glitchCount >= 2 ? (
                  <div style={{ color: '#00ff88' }}>🔮 Glitch (2/4): +8% Crit Chance</div>
                ) : (
                  <div style={{ color: '#555' }}>🔮 Glitch: {eqStats.glitchCount}/4 equipped</div>
                )}
                {eqStats.glitchCount >= 4 && (
                  <div style={{ color: '#00ff88' }}>🌀 Glitch (4/4): 25% loop chance, Crit siphons Static & Echo</div>
                )}

                {eqStats.quantumCount >= 2 ? (
                  <div style={{ color: '#00ff88' }}>⚛️ Quantum (2/4): +5 ATK</div>
                ) : (
                  <div style={{ color: '#555' }}>⚛️ Quantum: {eqStats.quantumCount}/4 equipped</div>
                )}
                {eqStats.quantumCount >= 4 && (
                  <div style={{ color: '#00ff88' }}>💫 Quantum (4/4): +4 Speed, 30% Foam extract, Buffer Overrun x2 dmg</div>
                )}
              </div>

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
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #224422', padding: '4px', background: '#0a0d0a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: item.set ? '#ffd700' : '#00ff88' }}>
                          {item.name}
                        </div>
                        <button 
                          onClick={() => handleUseItem(item, idx)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--terminal-green)',
                            color: 'var(--terminal-green)',
                            cursor: 'pointer',
                            fontFamily: 'Share Tech Mono, monospace',
                            fontSize: '0.7rem',
                            padding: '1px 3px',
                            flexShrink: 0
                          }}
                        >
                          {item.category === 'consumable' ? '[USE]' : '[EQ]'}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>{item.description}</div>
                      {item.set && (
                        <div style={{ fontSize: '0.7rem', color: '#ffb997', fontStyle: 'italic', marginTop: '1px' }}>
                          Set Piece: {item.set}
                        </div>
                      )}
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
                <div>FLOOR: <strong style={{ color: '#fff' }}>Depth {highestDepthReached}</strong></div>
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
                    style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', padding: '4px', cursor: 'pointer', fontFamily: 'Share Tech Mono, monospace', color: 'var(--terminal-green)', border: '1px solid var(--terminal-green)', background: 'transparent' }}
                    title="Route Watts to overcharge probe attack capacity."
                  >
                    ⚡ OVERCHARGE ATK (10W)
                  </button>
                  <button
                    onClick={triggerShieldRecharge}
                    disabled={resources.gridWatts.amount < 15}
                    className="op-button"
                    style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', padding: '4px', cursor: 'pointer', fontFamily: 'Share Tech Mono, monospace', color: 'var(--terminal-green)', border: '1px solid var(--terminal-green)', background: 'transparent' }}
                    title="Recharge shields to repair probe integrity."
                  >
                    🛡 RECHARGE SHIELD (15W)
                  </button>
                  <button
                    onClick={triggerRadarScan}
                    disabled={resources.staticNoise.amount < 50}
                    className="op-button"
                    style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', padding: '4px', cursor: 'pointer', fontFamily: 'Share Tech Mono, monospace', color: 'var(--terminal-green)', border: '1px solid var(--terminal-green)', background: 'transparent' }}
                    title="Scan sector electromagnetic echo to map floor layout."
                  >
                    📡 RADAR SCAN (50 Static)
                  </button>
                  <button
                    onClick={triggerRepairNanites}
                    disabled={resources.quantumFoam.amount < 20}
                    className="op-button"
                    style={{ width: '100%', fontSize: '0.75rem', textAlign: 'left', padding: '4px', cursor: 'pointer', fontFamily: 'Share Tech Mono, monospace', color: 'var(--terminal-green)', border: '1px solid var(--terminal-green)', background: 'transparent' }}
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
