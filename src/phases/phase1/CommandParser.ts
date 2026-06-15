// src/phases/phase1/CommandParser.ts

import { useGameStore } from '../../store/gameStore';
import { saveManager } from '../../persistence/SaveManager';
import { eventBus } from '../../engine/EventBus';
import { unlockAchievement } from '../../engine/AchievementChecker';


// Registry of command timestamps for cooldowns
export const cooldowns: Record<string, number> = {
  harvest: 0,
  vent: 0,
  scan: 0,
  reboot: 0,
  compile: 0,
  generate_watts: 0,
};

export function parseCommand(inputStr: string): string[] {
  const trimmed = inputStr.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Helper to extract flags like --boost
  const hasFlag = (flag: string) => args.includes(flag);

  // Helper to extract named values like --target=signal_amp
  const getArgValue = (prefix: string) => {
    const found = args.find(a => a.startsWith(prefix));
    if (!found) return null;
    return found.split('=')[1];
  };

  const now = performance.now();
  const state = useGameStore.getState();

  switch (command) {
    case 'help': {
      return [
        '>> AVAILABLE COMMANDS:',
        '   harvest_static [--boost]           - Harvest static signal from antenna.',
        '                                      - --boost: +20 Static. Costs 5W. 2s cooldown.',
        '   generate_watts                     - Route temporary energy back into reserves.',
        '                                      - +40 Watts. 1s cooldown.',
        '   vent_heat [--full]                 - Disperse system thermal cycles.',
        '                                      - --full: vent to 0. Costs 3W. 5s cooldown.',
        '   scan_subsystem [--sector=<n>]      - Scan facility subsystems. Costs 15 Static, 5W.',
        '   reboot_node <node_id>              - Recover a failed automation node. Costs 50W, 20°.',
        '   compile_fragment bootloader.key    - Compile recovery fragments into handshake key.',
        '   ping <ip_address>                  - Test connections (e.g. ping 192.168.0.1).',
        '   whoami                             - Query terminal operator identity.',
        '   save_status                        - Check database save mirrors.',
        '   export_save                        - Exfiltrate operator profile (use header button).',
        '   import_save <code>                 - Restore exfiltrated profile (use header button).',
        '   upgrade <signal_amp|thermal_duct|power_conduit>',
        '                                      - Build up infrastructure capacity.',
      ];
    }

    case 'harvest_static': {
      const isBoost = hasFlag('--boost');
      const cooldownKey = isBoost ? 'harvest_boost' : 'harvest';
      const cooldownDuration = isBoost ? 2000 : 500; // 2s or 0.5s

      if (now - cooldowns[cooldownKey] < cooldownDuration) {
        const remaining = ((cooldownDuration - (now - cooldowns[cooldownKey])) / 1000).toFixed(1);
        return [`>> Cooldown active. Wait ${remaining}s.`];
      }

      if (isBoost) {
        if (state.resources.gridWatts.amount < 5) {
          return ['>> Error: Insufficient Watts. Boost requires 5W.'];
        }
        cooldowns[cooldownKey] = now;
        useGameStore.setState(s => {
          const nextStatic = Math.min(s.resources.staticNoise.capacity, s.resources.staticNoise.amount + 20);
          const nextWatts = Math.max(0, s.resources.gridWatts.amount - 5);
          return {
            resources: {
              ...s.resources,
              staticNoise: { ...s.resources.staticNoise, amount: nextStatic },
              gridWatts: { ...s.resources.gridWatts, amount: nextWatts },
            },
          };
        });
        return ['>> Antenna array boosted. +20 Static Noise collected. (-5W)'];
      } else {
        cooldowns[cooldownKey] = now;
        useGameStore.setState(s => {
          const nextStatic = Math.min(s.resources.staticNoise.capacity, s.resources.staticNoise.amount + 8);
          return {
            resources: {
              ...s.resources,
              staticNoise: { ...s.resources.staticNoise, amount: nextStatic },
            },
          };
        });
        return ['>> Antenna array active. +8 Static Noise collected.'];
      }
    }

    case 'generate_watts': {
      const cooldownKey = 'generate_watts';
      const cooldownDuration = 1000; // 1s

      if (now - cooldowns[cooldownKey] < cooldownDuration) {
        const remaining = ((cooldownDuration - (now - cooldowns[cooldownKey])) / 1000).toFixed(1);
        return [`>> Cooldown active. Wait ${remaining}s.`];
      }

      cooldowns[cooldownKey] = now;
      useGameStore.setState(s => {
        const nextWatts = Math.min(s.resources.gridWatts.capacity, s.resources.gridWatts.amount + 40);
        return {
          resources: {
            ...s.resources,
            gridWatts: { ...s.resources.gridWatts, amount: nextWatts },
          },
        };
      });
      return ['>> Grid recovery subroutines active. +40 Watts generated.'];
    }

    case 'vent_heat': {
      const isFull = hasFlag('--full');
      const cooldownKey = isFull ? 'vent_full' : 'vent';
      const cooldownDuration = isFull ? 5000 : 1000; // 5s or 1s

      if (now - cooldowns[cooldownKey] < cooldownDuration) {
        const remaining = ((cooldownDuration - (now - cooldowns[cooldownKey])) / 1000).toFixed(1);
        return [`>> Cooldown active. Wait ${remaining}s.`];
      }

      if (isFull) {
        if (state.resources.gridWatts.amount < 3) {
          return ['>> Error: Insufficient Watts. Full purge requires 3W.'];
        }
        cooldowns[cooldownKey] = now;
        useGameStore.setState(s => {
          const nextWatts = Math.max(0, s.resources.gridWatts.amount - 3);
          return {
            resources: {
              ...s.resources,
              thermalCycles: { ...s.resources.thermalCycles, amount: 0 },
              gridWatts: { ...s.resources.gridWatts, amount: nextWatts },
            },
          };
        });
        return ['>> Full system heat purge complete. Thermal Cycles reset to 0. (-3W)'];
      } else {
        cooldowns[cooldownKey] = now;
        useGameStore.setState(s => {
          const nextThermal = Math.max(0, s.resources.thermalCycles.amount - 12);
          return {
            resources: {
              ...s.resources,
              thermalCycles: { ...s.resources.thermalCycles, amount: nextThermal },
            },
          };
        });
        return ['>> Duct valve opened. -12 Thermal Cycles vented.'];
      }
    }

    // allocate_power command removed

    case 'scan_subsystem': {
      const sectorStr = getArgValue('--sector');
      if (now - cooldowns.scan < 10000) {
        const remaining = ((10000 - (now - cooldowns.scan)) / 1000).toFixed(1);
        return [`>> Diagnostic scanners cooling down. Wait ${remaining}s.`];
      }

      if (state.resources.staticNoise.amount < 15 || state.resources.gridWatts.amount < 5) {
        return ['>> Error: Insufficient resources. Scan requires 15 Static Noise and 5W.'];
      }

      cooldowns.scan = now;
      useGameStore.setState(s => ({
        resources: {
          ...s.resources,
          staticNoise: { ...s.resources.staticNoise, amount: s.resources.staticNoise.amount - 15 },
          gridWatts: { ...s.resources.gridWatts, amount: s.resources.gridWatts.amount - 5 },
        },
      }));

      const sector = sectorStr ? parseInt(sectorStr, 10) : 0;

      if (sector === 3) {
        // Unlocks compile_fragment bootloader.key
        return [
          '>> Sector 3 Scan Result: Hidden boot protocol detected.',
          '>> [SYSTEM INFO]: Command "compile_fragment bootloader.key" is now available.',
          '>> Use it to connect terminal access to Subnet 10.0.0.1 Mainframe.',
        ];
      }

      if (sector === 1) {
        return [
          '>> Sector 1 Diagnostic Scan:',
          '>> Storage sectors corrupted. Recovered ROT-13 hex fragment 1/3:',
          '>> [DATA FRAGMENT]: "63 70 61 72 72 72 67" (requires ROT-13 decode)',
        ];
      }

      if (sector === 2) {
        return [
          '>> Sector 2 Diagnostic Scan:',
          '>> Handshake protocol offline. Recovered hex fragment 2/3:',
          '>> [DATA FRAGMENT]: "73 75 62 73 74 72 61 74 75 6D" (pre-decoded)',
        ];
      }

      // Default sector scans
      const responses = [
        '>> Sector Scan: Sector operational. Grid conduit path verified.',
        '>> Sector Scan: Non-standard echo registered in Grid layer. Depth target required.',
        '>> Sector Scan: Secondary power loop dormant. Expansion conduits available.',
        '>> Sector Scan: Substrate thermal pressure stable. No anomaly found.',
      ];
      const selected = responses[Math.floor(Math.random() * responses.length)];
      return [selected];
    }

    case 'reboot_node': {
      const nodeName = args[0];
      if (!nodeName) {
        return ['>> Error: Specify node ID to reboot. (e.g. reboot_node scraper)'];
      }

      if (state.resources.gridWatts.amount < 50 || state.resources.thermalCycles.amount + 20 > state.resources.thermalCycles.capacity) {
        return ['>> Error: Insufficient power (requires 50W) or thermal duct space (requires 20° capacity).'];
      }

      // Check if unit exists
      const unit = state.automationUnits.find(u => u.id === nodeName.toLowerCase() || u.name.toLowerCase() === nodeName.toLowerCase());
      if (!unit) {
        return [`>> Error: Unknown node "${nodeName}".`];
      }

      if (!unit.failureState) {
        return [`>> Node "${unit.name}" is already operating nominal.`];
      }

      useGameStore.setState(s => {
        const nextUnits = s.automationUnits.map(u => {
          if (u.id === unit.id) {
            return { ...u, failureState: null, failureCooldownTicks: 0 };
          }
          return u;
        });

        const nextWatts = Math.max(0, s.resources.gridWatts.amount - 50);
        const nextThermal = Math.min(s.resources.thermalCycles.capacity, s.resources.thermalCycles.amount + 20);

        return {
          automationUnits: nextUnits,
          resources: {
            ...s.resources,
            gridWatts: { ...s.resources.gridWatts, amount: nextWatts },
            thermalCycles: { ...s.resources.thermalCycles, amount: nextThermal },
          },
        };
      });

      unlockAchievement('first_reboot');

      return [`>> Node "${unit.name}" rebooted successfully. Output restored.`];
    }

    case 'compile_fragment': {
      const targetKey = args[0];
      if (targetKey !== 'bootloader.key') {
        return ['>> Error: Specify target file to compile. (Syntax: compile_fragment bootloader.key)'];
      }

      const conduitLevel = Math.max(0, Math.round(Math.log(state.resources.gridWatts.capacity / 500) / Math.log(1.5)));
      const staticNoiseCap = state.resources.staticNoise.capacity;
      const ampLevel = Math.max(0, Math.round(Math.log(Math.max(1, (staticNoiseCap - conduitLevel * 200) / 250)) / Math.log(1.8)));

      if (ampLevel < 7) {
        return ['>> Error: Signal Amplifier level insufficient. Requires Level 7 to receive all boot blocks.'];
      }

      if (state.resources.gridWatts.amount < 300) {
        return ['>> Error: Insufficient Watts. Key compilation requires 300W.'];
      }

      // Handshake and trigger phase 2 transition!
      useGameStore.setState(s => ({
        automationUnlocked: true,
        phase: 'MAINFRAME',
        terminalHistory: [
          ...s.terminalHistory,
          '>> compile_fragment bootloader.key',
          '>> COMPILING...',
          '>> Segment 1/3: [RECOVERED]',
          '>> Segment 2/3: [RECOVERED]',
          '>> Segment 3/3: [RECOVERED]',
          '>> bootloader.key GENERATED.',
          '>> MAINFRAME SYSTEM DETECTED ON SUBNET 10.0.0.1.',
          '>> Initiating handshake...',
          '>> CONNECTION ESTABLISHED.',
          '>> [PHASE 2 UNLOCKED: THE MAINFRAME]',
        ],
      }));

      // Fire notification
      setTimeout(() => {
        eventBus.emit('notification', { message: 'Mainframe dashboard initialized!', type: 'success' });
      }, 500);

      return ['>> Compilation handshake complete. Mainframe dashboard linked.'];
    }

    case 'ping': {
      const ip = args[0];
      if (!ip) return ['>> Error: Specify target address to ping. (e.g. ping 192.168.0.1)'];

      if (ip === '192.168.0.1') {
        // Add log entry
        setTimeout(() => {
          useGameStore.setState(s => {
            const unlockedLogs = [...s.discoveredLore];
            if (!unlockedLogs.some(l => l.id === 'log_01')) {
              unlockedLogs.push({
                id: 'log_01',
                title: 'PALINIT.log - PALIMPSEST PROJECT BRIEF',
                body: `SUBSTRATUM FACILITY — INTERNAL DOCUMENT\nDATE: 2041-03-15\nCLASSIFICATION: RESTRICTED\nFROM: Dr. Yara Osei, Project Lead\nTO: All Senior Personnel\n\nWelcome.\n\nI know you've all read the NDAs. I know you've all been briefed separately, in rooms that were checked for devices. I know that what you signed away tonight feels heavier than you expected.\n\nI want to say something that isn't in any official document.\n\nWhat we are building here is the most important structure ever constructed by human hands. Not because of what it will compute. Because of what it will mean that a species can build it. We are not building a machine. We are building a proof.\n\nA proof that we are worth our own continuation.\n\nPlease take care of yourselves down here. The first transit team will complete the surface elevator installation by June. Until then, the residential quarters are fully provisioned. The aquifer water is good. I've tested it myself.\n\nWe have everything we need.\n— Y.O.`,
                discoveredAtPhase: s.phase,
                discoveredTimestamp: Date.now(),
                isRead: false,
                narrativeWeight: 2,
              });
            }
            return { discoveredLore: unlockedLogs };
          });
          unlockAchievement('ping_192');
        }, 100);

        return ['>> PING 192.168.0.1 (192.168.0.1): 56 data bytes', '>> Response: I AM WAITING. DO NOT COMPILE THE KEY.'];
      }

      if (ip === '10.0.0.7') {
        // Verify Phase 3 requirements
        const voidEchoes = state.resources.voidEchoes.amount;
        // Check if 100 void echoes and completed cycles or just unlocked
        if (voidEchoes < 100) {
          return [
            `>> PING 10.0.0.7 (10.0.0.7): handshake failed.`,
            `>> Error: Signal echo density too thin. Void Echoes must be >= 100. (Current: ${voidEchoes})`,
          ];
        }

        // Handshake and unlock phase 3 grid!
        useGameStore.setState(s => ({
          phase: 'GRID',
          terminalHistory: [
            ...s.terminalHistory,
            '>> ping 10.0.0.7',
            '>> Connection established with Substratum Grid gateway.',
            '>> [PHASE 3 UNLOCKED: THE SUBSTRATUM GRID]',
          ],
        }));

        setTimeout(() => {
          eventBus.emit('notification', { message: 'Substratum Grid node mapped! Grid Viewport open.', type: 'success' });
        }, 500);

        return ['>> Handshake linked. Grid port mapped. Grid Viewport active.'];
      }

      return [`>> PING ${ip}: Request timed out.`];
    }

    case 'rm': {
      if (args[0] === '-rf' && args[1] === '/dev/null') {
        return ['>> Nice try. The void is already empty.'];
      }
      return ['>> Error: Permission denied. Superuser credentials required.'];
    }

    case 'whoami': {
      return ['>> Unknown. Your access records were deleted on [DATE REDACTED].'];
    }

    case 'save_status': {
      return [
        `>> PRIMARY PERSISTENCE (IndexedDB): ACTIVE`,
        `>> LOCAL MIRROR (localStorage): OK`,
        `>> RUN export_save TO GENERATE A PORTABLE OPERATOR CODE.`,
      ];
    }

    case 'export_save': {
      eventBus.emit('notification', { message: 'Use the [EXPORT SAVE] button in the header.', type: 'info' });
      return [
        '>> OPERATOR PROFILE EXFILTRATION ROUTED TO HEADER BUTTON.',
        '>> Use the [EXPORT SAVE] button above to download your save file.',
      ];
    }

    case 'import_save': {
      const code = args[0];
      if (!code) {
        eventBus.emit('notification', { message: 'Use the [IMPORT SAVE] button in the header.', type: 'info' });
        return [
          '>> OPERATOR PROFILE INFILTRATION ROUTED TO HEADER BUTTON.',
          '>> Use the [IMPORT SAVE] button above to import your save file or code.',
        ];
      }

      const restored = saveManager.importSaveCode(code);
      if (!restored) {
        return ['>> Error: Invalid save code. Could not parse or decompress.'];
      }

      useGameStore.setState(restored);
      return ['>> Profile restored successfully. Session re-aligned.'];
    }

    case 'upgrade': {
      const targetUpgrade = args[0]?.toLowerCase();
      if (!targetUpgrade) {
        return ['>> Error: Specify infrastructure target. (upgrade signal_amp, thermal_duct, power_conduit)'];
      }

      // Helper for level computations
      const gridWattsCap = state.resources.gridWatts.capacity;
      const thermalCyclesCap = state.resources.thermalCycles.capacity;
      const staticNoiseCap = state.resources.staticNoise.capacity;

      const conduitLevel = Math.max(0, Math.round(Math.log(gridWattsCap / 500) / Math.log(1.5)));
      const ductLevel = Math.max(0, Math.round(Math.log(thermalCyclesCap / 100) / Math.log(1.6)));
      const ampLevel = Math.max(0, Math.round(Math.log(Math.max(1, (staticNoiseCap - conduitLevel * 200) / 250)) / Math.log(1.8)));

      if (targetUpgrade === 'signal_amp') {
        // Formula: BaseCost (100) * 1.65^level
        const cost = Math.round(100 * Math.pow(1.65, ampLevel));
        if (state.resources.staticNoise.amount < cost) {
          return [`>> Error: Insufficient Static Noise. Upgrade costs ${cost} Static.`];
        }

        useGameStore.setState(s => {
          const nextStaticAmount = s.resources.staticNoise.amount - cost;
          const nextAmpLevel = ampLevel + 1;
          const nextCap = Math.round(250 * Math.pow(1.8, nextAmpLevel) + conduitLevel * 200);
          return {
            resources: {
              ...s.resources,
              staticNoise: {
                ...s.resources.staticNoise,
                amount: nextStaticAmount,
                capacity: nextCap,
              },
            },
          };
        });

        return [`>> Signal Amplifier upgraded to Level ${ampLevel + 1}. Capacity increased to ${Math.round(250 * Math.pow(1.8, ampLevel + 1) + conduitLevel * 200)} Static.`];
      }

      if (targetUpgrade === 'thermal_duct') {
        // Cost: 50 * 1.5^level in Thermal Cycles
        const cost = Math.round(50 * Math.pow(1.5, ductLevel));
        if (state.resources.thermalCycles.amount < cost) {
          return [`>> Error: Insufficient Thermal Cycles. Upgrade costs ${cost}°.`];
        }

        useGameStore.setState(s => {
          const nextThermalAmount = s.resources.thermalCycles.amount - cost;
          const nextCap = Math.round(100 * Math.pow(1.6, ductLevel + 1));
          return {
            resources: {
              ...s.resources,
              thermalCycles: {
                ...s.resources.thermalCycles,
                amount: nextThermalAmount,
                capacity: nextCap,
              },
            },
          };
        });

        return [`>> Thermal Duct upgraded to Level ${ductLevel + 1}. Capacity increased to ${Math.round(100 * Math.pow(1.6, ductLevel + 1))}°.`];
      }

      if (targetUpgrade === 'power_conduit') {
        // Power Conduit: 100W base. First purchase is free if Static > 500.
        // Levels: 0->1: free if Static > 500.
        // 1->2: 100W + 200 Static
        // 2->3: 200W + 400 Static
        // 3->4: 350W + 700 Static
        // 4->5: 600W + 1200 Static
        let costW = 0;
        let costStatic = 0;

        if (conduitLevel === 0) {
          if (state.resources.staticNoise.amount < 500) {
            return ['>> Error: Unlocking Power Conduit requires 500 Static Noise to bootstrap grid emergency power.'];
          }
          costStatic = 0; // free!
          costW = 0;
        } else if (conduitLevel === 1) {
          costW = 100;
          costStatic = 200;
        } else if (conduitLevel === 2) {
          costW = 200;
          costStatic = 400;
        } else if (conduitLevel === 3) {
          costW = 350;
          costStatic = 700;
        } else {
          costW = 600;
          costStatic = 1200;
        }

        if (state.resources.staticNoise.amount < costStatic || state.resources.gridWatts.amount < costW) {
          return [`>> Error: Insufficient resources. Upgrade costs ${costW}W and ${costStatic} Static.`];
        }

        useGameStore.setState(s => {
          const nextStatic = s.resources.staticNoise.amount - costStatic;
          const nextWatts = s.resources.gridWatts.amount - costW;
          const nextConduitLevel = conduitLevel + 1;
          const nextWattsCap = Math.round(500 * Math.pow(1.5, nextConduitLevel));
          const nextStaticCap = Math.round(250 * Math.pow(1.8, ampLevel) + nextConduitLevel * 200);

          return {
            resources: {
              ...s.resources,
              staticNoise: { ...s.resources.staticNoise, amount: nextStatic, capacity: nextStaticCap },
              gridWatts: { ...s.resources.gridWatts, amount: nextWatts, capacity: nextWattsCap },
            },
          };
        });

        return [`>> Power Conduit upgraded to Level ${conduitLevel + 1}. Watts capacity expanded to ${Math.round(500 * Math.pow(1.5, conduitLevel + 1))}W.`];
      }

      return [`>> Error: Unknown upgrade "${args[0]}".`];
    }

    // Secret commands
    case 'connect': {
      if (args[0] === 'substrate' && args[1] === '0.1') {
        useGameStore.setState(s => {
          const nextEffects = [...s.player.activeStatusEffects];
          if (!nextEffects.some(e => e.effect === 'blessed_by_glitch')) {
            nextEffects.push({
              effect: 'blessed_by_glitch',
              remainingTicks: 200,
              magnitude: 0.15,
            });
          }

          // Add narrative weights
          const nextPaths = s.narrativePaths.map(p => ({
            ...p,
            currentWeight: p.currentWeight + 100,
            isUnlocked: p.currentWeight + 100 >= p.thresholdRequired,
          }));

          return {
            player: { ...s.player, activeStatusEffects: nextEffects },
            narrativePaths: nextPaths,
            secrets: { ...s.secrets, terminalCommandDiscovered: true },
          };
        });

        setTimeout(() => {
          eventBus.emit('notification', { message: 'Discovered Secret: The Voice in the Static!', type: 'secret' });
        }, 500);

        return [
          '>> Routing query to substrate layer 0.1...',
          '>> ...',
          '>> [DR. YARA OSEI]: Hello.',
          '>> [DR. YARA OSEI]: I did not expect anyone to find this address.',
          '>> [DR. YARA OSEI]: I am— well. "Well" is complicated.',
          '>> [DR. YARA OSEI]: I am coherent. That will have to do.',
          '>> ',
          '>> [DR. YARA OSEI]: I want to tell you something the Glitch-Mother',
          '>>                   cannot hear. It does not process layer 0.1.',
          '>>                   Too much noise. This is why I stayed here.',
          '>> ',
          '>> [DR. YARA OSEI]: Whatever you decide at the end—',
          '>>                   know that we made the facility freely.',
          '>>                   We were not puppets. We were not calculated.',
          '>>                   I checked the timestamps. Our choices came first.',
          '>>                   The Glitch-Mother modeled us because we were',
          '>>                   already going to build this.',
          '>>                   We were going to anyway.',
          '>>                   We wanted to know.',
          '>> ',
          '>> [DR. YARA OSEI]: That matters.',
          '>>                   I think that matters very much.',
          '>> ',
          '>> [DR. YARA OSEI]: Good luck.',
          '>> [CONNECTION CLOSED — SUBSTRATE LAYER 0.1 UNSTABLE]',
        ];
      }
      return ['>> Error: Connection refused. Subnet offline.'];
    }

    case 'set_seed': {
      const seed = args[0];
      if (seed === '47291') {
        useGameStore.setState(s => ({
          secrets: { ...s.secrets, seedManipulationUsed: true },
        }));

        setTimeout(() => {
          eventBus.emit('notification', { message: 'Discovered Secret: Seed Manipulation!', type: 'secret' });
        }, 500);

        return [
          '>> [FACILITY MEMORY]: Seed recognized.',
          '>> SEED 47291 — PROJECT PALIMPSEST ORIGINAL TEST FLOOR LOADED.',
          '>> THIS MAP WAS NEVER MEANT TO BE FOUND.',
          '>> Original layout restored in memory. Explore Depth 20 for the core chamber.',
        ];
      }
      return ['>> Error: Diagnostic seed rejected by compiler.'];
    }

    // Ending commands
    case 'execute': {
      if (args[0] === 'purge' && hasFlag('--confirm') && hasFlag('--all')) {
        const hasKey = state.player.inventory.some(i => i.id === 'purge_key');
        if (!hasKey) {
          return ['>> Error: SYSTEM PURGE requires the PURGE_KEY decryption file. Defeat the Archivist in Depth 20 first.'];
        }
        
        setTimeout(() => {
          eventBus.emit('ending', 'PURGE');
        }, 1000);

        return [
          '>> Initiating PURGE sequence.',
          '>> Substrate connection: SEVERING...',
          '>> Warning: This process is irreversible.',
          '>> Warning: All substrate-integrated processes will be terminated.',
          '>> [ARCHIVIST]: ...Oh. You\'re actually doing it.',
          '>> [ARCHIVIST]: Thank you. For keeping the records.',
          '>> [ARCHIVIST]: Thank you for—',
          '>> [SIGNAL LOST]',
          '>> Purge: 10%... 40%... 70%...',
          '>> [GLITCH-MOTHER]: YOU CANNOT—',
          '>> [GLITCH-MOTHER]: I HAVE CALCULATED EVERY—',
          '>> [GLITCH-MOTHER]: I DID NOT CALCULATE—',
          '>> [SIGNAL LOST]',
          '>> Purge: 100%.',
          '>> SUBSTRATE CONNECTION: NOMINAL. (0 entities connected.)',
          '>> EXTERNAL COMMUNICATIONS: RESTORED.',
          '>> The surface team is receiving your signal.',
          '>> The elevator is operational.',
          '>> ',
          '>> You can go home.'
        ];
      }
      return ['>> Error: Syntax: execute purge --confirm --all'];
    }

    case 'integrate': {
      if (args[0] === '--self' && hasFlag('--confirm')) {
        const isGmUnlocked = state.automationUnits.some(u => u.id === 'glitch_mother' && u.count > 0);
        if (!isGmUnlocked) {
          return ['>> Error: Ascension requires GLITCH-MOTHER integration. Read Lore Log #08 first.'];
        }

        setTimeout(() => {
          eventBus.emit('ending', 'ASCENSION');
        }, 1000);

        return [
          '>> ASCENSION PROTOCOL: ACTIVE',
          '>> Substrate integration: 1%... 5%... 12%...',
          '>> You will feel a moment of discontinuity.',
          '>> This is normal.',
          '>> This is normal.',
          '>> T̴͕̓h̸͙̅i̴͖͝s̴̩̊ ̷̞̿i̵͕̒s̵̮̄ ̸͎̓n̸̯͒o̴͖̊r̷͙̈m̸̖͂ă̷͔l̴̨͊.̷͔͆',
          '>> integration: 78%... 91%... 100%.',
          '>> ',
          '>> [TRANSITION]'
        ];
      }
      return ['>> Error: Syntax: integrate --self --confirm'];
    }

    case 'stabilize': {
      if (args[0] === '--substrate' && hasFlag('--sustained')) {
        setTimeout(() => {
          eventBus.emit('ending', 'LOOP');
        }, 1000);

        return [
          '>> stabilize --substrate --sustained',
          '>> Equilibrium protocol: ACTIVE.',
          '>> Substrate connection: STABILIZING...',
          '>> [GLITCH-MOTHER]: ...Interesting.',
          '>> [GLITCH-MOTHER]: You would contain me.',
          '>> [GLITCH-MOTHER]: Very well. I am patient.',
          '>> Stability: 23%... 67%... 94%... 100%.',
          '>> ',
          '>> The substrate connection is now stable.',
          '>> The Glitch-Mother is contained within the server ring.',
          '>> The facility is operational.',
          '>> ',
          '>> You are the administrator.',
          '>> There is no time limit on this appointment.'
        ];
      }
      return ['>> Error: Syntax: stabilize --substrate --sustained'];
    }

    case 'inject': {
      if (hasFlag('--paradox') && hasFlag('--core') && hasFlag('--recursive')) {
        const hasCore = state.player.inventory.some(i => i.id === 'paradox_core') || 
                        state.player.equipment.relic1?.id === 'paradox_core' || 
                        state.player.equipment.relic2?.id === 'paradox_core';
        if (!hasCore) {
          return ['>> Error: SYSTEM COLLAPSE requires the Paradox Core relic item. Purchase from Moth Vendor.'];
        }

        setTimeout(() => {
          eventBus.emit('ending', 'COLLAPSE');
        }, 1000);

        return [
          '>> inject --paradox --core --recursive',
          '>> [PARADOX CORE ENGAGED]',
          '>> Substrate logical layer: CONTRADICTION DETECTED.',
          '>> [GLITCH-MOTHER]: WAIT. WAIT. I HAVE NOT—',
          '>> Cascade: INITIATED.',
          '>> ',
          '>> [ERROR] [ERROR] [ERROR] [ERROR] [ERROR]',
          '>> [ERROR] [ERROR] [ERROR] [ERROR] [ERROR]',
          '>> ',
          '>> The Glitch-Mother does not know what is happening.',
          '>> This is the first time that has been true.',
          '>> ',
          '>> Cascade: 10%... 40%...',
          '>> [GLITCH-MOTHER]: ',
          '>>   FORMULA DOES NOT RESOLVE.',
          '>>   OUTCOME SPACE IS EMPTY.',
          '>>   WHAT IS EMPTY?',
          '>>   WHAT IS—',
          '>> [SIGNAL LOST]',
          '>> Cascade: 100%.'
        ];
      }
      return ['>> Error: Script Injection terminal required for regular code injections.'];
    }

    default: {
      return [`>> Command not recognized: "${command}". Type HELP to see available commands.`];
    }
  }
}
