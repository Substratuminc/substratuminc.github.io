// src/engine/Tick.ts

import { gameLoop } from './GameLoop';
import { useGameStore } from '../store/gameStore';
import { computeResourceProduction } from '../store/selectors';
import type { ResourceKey, ActiveStatusEffect, AutomationFailureState, AutomationUnit } from '../store/types';
import { TICK_RATE_MS } from '../store/constants';
import { checkAchievements } from './AchievementChecker';
import { eventBus } from './EventBus';
import { executeProbeAutoStep } from '../phases/phase3/ProbeAutopilot';

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

      // Process auto-explore probe autopilot step (every 7 ticks ~ 350ms)
      if (state.tickCount % 7 === 0 && (state.phase === 'GRID' || state.phase === 'PARADIGM') && state.autoExploreActive && !state.standby && nextHp > 0 && state.currentMap) {
        const autoChanges = executeProbeAutoStep(state);
        if (autoChanges) {
          if (autoChanges.playerGrid) {
            playerGrid.x = autoChanges.playerGrid.x;
            playerGrid.y = autoChanges.playerGrid.y;
          }
          if (autoChanges.currentMap) {
            state.currentMap = autoChanges.currentMap;
          }
          if (autoChanges.player) {
            nextHp = autoChanges.player.hp !== undefined ? autoChanges.player.hp : nextHp;
            if (autoChanges.player.inventory) {
              playerInventory = autoChanges.player.inventory;
            }
          }
          if (autoChanges.enemyDatabase) {
            state.enemyDatabase = autoChanges.enemyDatabase;
          }
          if (autoChanges.terminalHistory) {
            terminalHistory = autoChanges.terminalHistory;
          }
          if (autoChanges.unlockedMilestones) {
            state.unlockedMilestones = autoChanges.unlockedMilestones;
          }
          if (autoChanges.highestDepthReached) {
            state.highestDepthReached = autoChanges.highestDepthReached;
          }
          if (autoChanges.standby !== undefined) {
            state.standby = autoChanges.standby;
          }
          if (autoChanges.autoExploreActive !== undefined) {
            state.autoExploreActive = autoChanges.autoExploreActive;
          }
          if (autoChanges.phase !== undefined) {
            state.phase = autoChanges.phase;
          }
          if (autoChanges.injectionTerminalUnlocked !== undefined) {
            state.injectionTerminalUnlocked = autoChanges.injectionTerminalUnlocked;
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
        highestDepthReached: state.highestDepthReached,
        standby: state.standby,
        autoExploreActive: state.autoExploreActive,
        phase: state.phase,
        injectionTerminalUnlocked: state.injectionTerminalUnlocked,
      };
    });

    // Check achievements after state updates
    checkAchievements();
  });
}
