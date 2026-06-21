// src/engine/Tick.ts

import { gameLoop } from './GameLoop';
import { useGameStore } from '../store/gameStore';
import { computeResourceProduction } from '../store/selectors';
import type { ResourceKey, ActiveStatusEffect, AutomationFailureState, AutomationUnit, InventoryItem } from '../store/types';
import { TICK_RATE_MS } from '../store/constants';
import { checkAchievements } from './AchievementChecker';
import { eventBus } from './EventBus';
import { createEnemy } from '../phases/phase3/enemies/EnemyFactory';
import { playerAttackEnemy, enemyAttackPlayer } from '../phases/phase3/CombatEngine';

let tickInitialized = false;

export function initializeTick(): void {
  if (tickInitialized) return;
  tickInitialized = true;

  gameLoop.onTick((_delta: number) => {
    useGameStore.setState(state => {
      // 1. Calculate production rates
      const production = computeResourceProduction(state);

      // 2. Apply resource production/consumption
      const nextResources = { ...state.resources };
      for (const key in production) {
        const k = key as ResourceKey;
        const current = nextResources[k];
        const net = production[k].produced - production[k].consumed;
        nextResources[k] = {
          ...current,
          amount: Math.max(0, Math.min(current.capacity, current.amount + net)),
          productionPerTick: production[k].produced,
          consumptionPerTick: production[k].consumed,
        };
      }

      // 3. Process status effect durations
      const nextEffects: ActiveStatusEffect[] = [];
      let hpDrain = 0;

      for (const eff of state.player.activeStatusEffects) {
        const remaining = eff.remainingTicks - 1;
        if (remaining > 0) {
          nextEffects.push({ ...eff, remainingTicks: remaining });
        }
        // HP drains from active status effects
        if (eff.effect === 'overclockedIII') {
          hpDrain += 2;
        } else if (eff.effect === 'nullPoison') {
          hpDrain += 1;
        }
      }

      // Overheat tracking for SECRET_02 & overheat HP drain (1 HP per 5 ticks)
      const isOverheated = nextResources.thermalCycles.amount >= nextResources.thermalCycles.capacity;
      const nextOverheatTimer = isOverheated
        ? state.secrets.overheatTimer + (TICK_RATE_MS / 1000)
        : 0;

      if (isOverheated && state.tickCount % 5 === 0) {
        hpDrain += 1;
      }

      // Apply HP changes
      let nextHp = state.player.hp;
      let playerGrid = { ...state.playerGrid };
      let playerInventory = [...state.player.inventory];
      let playerEquipment = { ...state.player.equipment };
      let terminalHistory = [...state.terminalHistory];

      if (hpDrain > 0) {
        nextHp = Math.max(0, nextHp - hpDrain);
        if (nextHp <= 0) {
          // Trigger Respawn Logic!
          // Player respawns at starting coordinates [0, 0] (or map playerStart) with 1 HP,
          // active status effects cleared, and equipped gear losing 50% durability.
          nextHp = 1;
          nextEffects.length = 0; // clear status effects

          if (state.currentMap) {
            playerGrid.x = state.currentMap.playerStart.x;
            playerGrid.y = state.currentMap.playerStart.y;
          } else {
            playerGrid.x = 0;
            playerGrid.y = 0;
          }

          // Reduce durability of equipped gear by 50%
          const slots: (keyof typeof playerEquipment)[] = ['head', 'torso', 'hands', 'feet', 'mainHand', 'offHand', 'relic1', 'relic2'];
          for (const slot of slots) {
            const item = playerEquipment[slot];
            if (item && item.durability !== undefined && item.maxDurability !== undefined) {
              item.durability = Math.max(0, Math.round(item.durability * 0.5));
            }
          }

          terminalHistory.push('>> [SYSTEM ALERT] OPERATOR INTEGRITY COMPROMISED. RE-MATERIALIZING AT NODE ENTRANCE...');
        }
      }

      // 4. Automation unit failure states and cooldown updates
      const nextAutomationUnits = state.automationUnits.map((unit): AutomationUnit => {
        let failureState = unit.failureState;
        let cooldown = unit.failureCooldownTicks;

        if (cooldown > 0) {
          cooldown--;
          if (cooldown === 0 && failureState) {
            // Auto recovery or failure end (for temporary failures)
            failureState = null;
          }
        }

        // Only trigger failures if count > 0 and not already failed
        if (unit.count > 0 && !failureState) {
          if (unit.id === 'scraper') {
            // NULL_EXCEPTION: Static > 90% capacity
            if (nextResources.staticNoise.amount >= nextResources.staticNoise.capacity * 0.9) {
              failureState = {
                type: 'NULL_EXCEPTION',
                description: 'SCRAPER-EXE: NULL_EXCEPTION. Static buffer saturated. Run scan_subsystem.',
                effectOnProduction: 0,
                recoveryAction: 'REBOOT',
                recoveryThreshold: 0,
              };
              terminalHistory.push('>> [ALERT] Scraper.exe encountered NULL_EXCEPTION. Static capacity high.');
            }
          } else if (unit.id === 'compiler') {
            // THERMAL_OVERLOAD: Thermal > 85% capacity
            if (nextResources.thermalCycles.amount >= nextResources.thermalCycles.capacity * 0.85) {
              failureState = {
                type: 'THERMAL_OVERLOAD',
                description: 'COMPILER-BAT: THERMAL_OVERLOAD. Overheat halted compile cycles. Run vent_heat.',
                effectOnProduction: 0,
                recoveryAction: 'VENT_HEAT',
                recoveryThreshold: 0,
              };
              terminalHistory.push('>> [ALERT] Compiler.bat thermal overload! Run vent_heat immediately.');
            }
          } else if (unit.id === 'daemon') {
            // LOGIC_LOOP: 0.02% chance per tick when corruptedData > 15
            if (nextResources.corruptedData.amount > 15 && Math.random() < 0.0002) {
              failureState = {
                type: 'LOGIC_LOOP',
                description: 'DAEMON-SYS: LOGIC_LOOP. Processing cycle corrupted. Run reboot_node daemon.',
                effectOnProduction: 0,
                recoveryAction: 'REBOOT',
                recoveryThreshold: 0,
              };
              terminalHistory.push('>> [ALERT] Daemon.sys stuck in infinite LOGIC_LOOP.');
            }
          } else if (unit.id === 'buffer') {
            // POWER_SURGE: if watts hits 100% capacity, overloads and destroys 20% Quantum Foam
            if (nextResources.gridWatts.amount >= nextResources.gridWatts.capacity) {
              failureState = {
                type: 'POWER_SURGE',
                description: 'BUFFER-DLL: POWER_SURGE. Grid power maxed. 20% Quantum Foam lost.',
                effectOnProduction: 0.5,
                recoveryAction: 'REBOOT',
                recoveryThreshold: 0,
              };
              nextResources.quantumFoam.amount = Math.max(0, Math.round(nextResources.quantumFoam.amount * 0.8));
              terminalHistory.push('>> [ALERT] Buffer.dll power surge detected! Quantum Foam storage purged.');
            }
          } else if (unit.id === 'reaper') {
            // CORRUPTION: 0.03% chance per tick when corruptedData > 50
            if (nextResources.corruptedData.amount > 50 && Math.random() < 0.0003) {
              failureState = {
                type: 'CORRUPTION',
                description: 'REAPER-EXE: CORRUPTION. System files infected. Run data_scrub.',
                effectOnProduction: 0, // makes it produce +1 CD per tick (handled in selectors)
                recoveryAction: 'DATA_SCRUB',
                recoveryThreshold: 30, // QF cost
              };
              terminalHistory.push('>> [ALERT] Reaper.exe corrupted! System infection spreading.');
            }
          } else if (unit.id === 'lattice') {
            // NULL_EXCEPTION: random chance (0.8%) when Lattice count > 3
            if (unit.count > 3 && Math.random() < 0.008) {
              failureState = {
                type: 'NULL_EXCEPTION',
                description: 'LATTICE-NET: CASCADE EXCEPTION. Halting for 60 ticks.',
                effectOnProduction: 0,
                recoveryAction: 'REBOOT',
                recoveryThreshold: 0,
              };
              cooldown = 60; // Auto resets in 60 ticks
              terminalHistory.push('>> [ALERT] Lattice.net grid collision! Automatic reboot in 60 ticks.');
            }
          }

          if (failureState) {
            const msg = `ALERT: ${unit.name} encountered ${failureState.type}!`;
            setTimeout(() => {
              eventBus.emit('notification', { message: msg, type: 'warn' });
            }, 0);
          }
        }

        return { ...unit, failureState, failureCooldownTicks: cooldown };
      });

      // Synchronize state.activeFailures from the unit status
      const activeFailures: AutomationFailureState[] = [];
      nextAutomationUnits.forEach(u => {
        if (u.failureState) {
          activeFailures.push(u.failureState);
        }
      });

      // Increment playtime
      const nextSeconds = state.totalRealTimeSeconds + TICK_RATE_MS / 1000;

      // 5. Update player special attack cooldowns (every tick)
      const nextCooldowns = { ...state.playerAttackCooldowns };
      for (const key in nextCooldowns) {
        if (nextCooldowns[key] > 0) {
          nextCooldowns[key]--;
        }
      }

      // 6. Process auto-battler combat step (every 30 ticks ~ 1.5 seconds)
      let activeEnemy = state.activeCombatEnemy ? { ...state.activeCombatEnemy } : null;
      let defeatCount = state.combatDefeatCount;
      let depth = state.highestDepthReached || 1;
      let standbyMode = state.standby;
      let autoActive = state.autoExploreActive;
      let currentPhase = state.phase;
      let injectionUnlocked = state.injectionTerminalUnlocked;
      const combatHistory = [...state.combatHistory];

      if (state.tickCount % 30 === 0 && (currentPhase === 'GRID' || currentPhase === 'PARADIGM') && autoActive && !standbyMode && nextHp > 0) {
        if (!activeEnemy) {
          // Spawn a new enemy!
          const isBossFight = (defeatCount === 2);
          const normalTypes = ['drone', 'apparition', 'hydra', 'ghost'];
          const randomType = normalTypes[Math.floor(Math.random() * normalTypes.length)];
          const enemyId = isBossFight 
            ? `boss_${depth}` 
            : `enemy_${depth}_${defeatCount}_${Math.floor(Math.random() * 1000)}_${randomType}`;
          
          activeEnemy = createEnemy(enemyId, depth);
          terminalHistory.push(`>> [ALARM] Hostile signature detected: ${activeEnemy.name}`);
          combatHistory.push(`>> Hostile signature detected: ${activeEnemy.name}`);
        } else {
          // Combat round!
          // Player attacks enemy
          const playerRes = playerAttackEnemy(state.player, activeEnemy, state);
          combatHistory.push(playerRes.combatLog);
          terminalHistory.push(`>> ${playerRes.combatLog}`);

          if (playerRes.statusApplied) {
            activeEnemy.activeStatusEffects = activeEnemy.activeStatusEffects || [];
            activeEnemy.activeStatusEffects.push({ effect: playerRes.statusApplied, remainingTicks: 6, magnitude: 1 });
            combatHistory.push(`>> Applied ${playerRes.statusApplied} status to ${activeEnemy.name}.`);
          }

          // Apply damage to enemy
          activeEnemy.hp = Math.max(0, activeEnemy.hp - playerRes.damage);

          if (activeEnemy.hp <= 0) {
            // Enemy defeated!
            terminalHistory.push(`>> Defeated ${activeEnemy.name}! Gain ${activeEnemy.xpValue} XP.`);
            combatHistory.push(`>> Defeated ${activeEnemy.name}! Gain ${activeEnemy.xpValue} XP.`);

            // Give XP & Level Up
            let nextExp = state.player.experience + activeEnemy.xpValue;
            let nextLvl = state.player.level;
            let nextMaxXp = state.player.experienceToNextLevel;
            let nextBaseAtk = state.player.baseAttack;
            let nextBaseDef = state.player.baseDefense;
            let nextMaxHp = state.player.maxHp;
            
            if (nextExp >= nextMaxXp) {
              nextLvl += 1;
              nextExp -= nextMaxXp;
              nextMaxXp = Math.floor(50 * Math.pow(nextLvl, 1.6));
              nextMaxHp += 5 + Math.floor(nextLvl / 2);
              nextBaseAtk += 1;
              if (nextLvl % 2 === 0) nextBaseDef += 1;
              nextHp = Math.min(nextMaxHp, nextHp + 5); // heal 5 on lvl up
              
              eventBus.emit('notification', { message: `LEVEL UP! Reached Level ${nextLvl}!`, type: 'success' });
            }

            // Process drops
            activeEnemy.drops.forEach((drop: any) => {
              if (Math.random() < drop.chance && drop.item) {
                const newItem = {
                  ...drop.item,
                  quantity: 1,
                } as InventoryItem;
                if (playerInventory.length < state.player.maxInventorySlots) {
                  playerInventory.push(newItem);
                  combatHistory.push(`>> Acquired item: ${newItem.name}`);
                  terminalHistory.push(`>> Acquired item: ${newItem.name}`);
                }
              }
            });

            // If Boss is defeated, descend floor
            if (activeEnemy.enemyType === 'boss') {
              depth += 1;
              defeatCount = 0;
              standbyMode = true;
              autoActive = false;
              terminalHistory.push(`>> [SUCCESS] Descended to Depth ${depth}.`);
              combatHistory.push(`>> [SUCCESS] Descended to Depth ${depth}.`);

              if (depth === 11 && currentPhase === 'GRID') {
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
          } else {
            // Enemy attacks back!
            let isLooped = false;
            if (activeEnemy.activeStatusEffects) {
              const loopIdx = activeEnemy.activeStatusEffects.findIndex((e: any) => e.effect === 'glitchLooped');
              if (loopIdx >= 0) {
                isLooped = true;
                activeEnemy.activeStatusEffects[loopIdx].remainingTicks--;
                if (activeEnemy.activeStatusEffects[loopIdx].remainingTicks <= 0) {
                  activeEnemy.activeStatusEffects.splice(loopIdx, 1);
                }
              }
            }

            if (isLooped) {
              combatHistory.push(`>> ${activeEnemy.name} is glitch-looped and skips its turn!`);
              terminalHistory.push(`>> ${activeEnemy.name} is glitch-looped and skips its turn!`);
            } else {
              const enemyRes = enemyAttackPlayer(activeEnemy, state.player);
              combatHistory.push(enemyRes.combatLog);
              terminalHistory.push(`>> ${enemyRes.combatLog}`);

              if (enemyRes.hit) {
                nextHp = Math.max(0, nextHp - enemyRes.damage);

                // Reduce durability of equipped armor
                const slots = ['head', 'torso', 'hands', 'feet'] as const;
                slots.forEach(slot => {
                  const item = playerEquipment[slot];
                  if (item && item.durability !== undefined) {
                    item.durability = Math.max(0, item.durability - 1);
                  }
                });
              }

              if (nextHp <= 0) {
                // Player defeated!
                nextHp = 1;
                nextEffects.length = 0; // Clear status effects
                standbyMode = true;
                autoActive = false;
                activeEnemy = null;

                // Reduce durability of all gear by 50%
                const eqSlots: (keyof typeof playerEquipment)[] = ['head', 'torso', 'hands', 'feet', 'mainHand', 'offHand', 'relic1', 'relic2'];
                for (const slot of eqSlots) {
                  const item = playerEquipment[slot];
                  if (item && item.durability !== undefined && item.maxDurability !== undefined) {
                    item.durability = Math.max(0, Math.round(item.durability * 0.5));
                  }
                }

                terminalHistory.push('>> [SYSTEM ALERT] OPERATOR INTEGRITY COMPROMISED. RE-MATERIALIZING AT NODE ENTRANCE...');
                combatHistory.push('>> [ALERT] Operator integrity compromised! Rematerializing...');
              }
            }
          }
        }
      }

      return {
        resources: nextResources,
        player: {
          ...state.player,
          hp: nextHp,
          activeStatusEffects: nextEffects,
          equipment: playerEquipment,
          inventory: playerInventory,
        },
        playerGrid,
        automationUnits: nextAutomationUnits,
        activeFailures,
        tickCount: state.tickCount + 1,
        totalRealTimeSeconds: nextSeconds,
        terminalHistory: terminalHistory.slice(-200), // keep logs clean
        secrets: { ...state.secrets, overheatTimer: nextOverheatTimer },
        currentMap: state.currentMap,
        enemyDatabase: state.enemyDatabase,
        unlockedMilestones: state.unlockedMilestones,
        highestDepthReached: depth,
        standby: standbyMode,
        autoExploreActive: autoActive,
        phase: currentPhase,
        injectionTerminalUnlocked: injectionUnlocked,
        combatDefeatCount: defeatCount,
        activeCombatEnemy: activeEnemy,
        combatHistory: combatHistory.slice(-100),
        playerAttackCooldowns: nextCooldowns,
      };
    });

    // Check achievements after state updates
    checkAchievements();
  });
}
