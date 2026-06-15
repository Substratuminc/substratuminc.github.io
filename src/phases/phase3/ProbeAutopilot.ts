// src/phases/phase3/ProbeAutopilot.ts

import type { GameState, GridMap, GridCell, PlayerStats, InventoryItem } from '../../store/types';
import { playerAttackEnemy, enemyAttackPlayer } from './CombatEngine';
import { decideEnemyAction } from './enemies/AIBehaviorTree';
import { createEnemy, type EnemyStats } from './enemies/EnemyFactory';
import { generateMap } from './MapGenerator';
import { computeFogOfWar } from './FogOfWar';
import { eventBus } from '../../engine/EventBus';
import { useGameStore } from '../../store/gameStore';

// BFS helper to find path to nearest target cell matching condition
export function findPathToTarget(
  startX: number,
  startY: number,
  map: GridMap,
  isTarget: (cell: GridCell) => boolean
): { x: number; y: number } | null {
  const queue: Array<[number, number, Array<{ x: number; y: number }>]> = [[startX, startY, []]];
  const visited = new Set<string>();
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    const [cx, cy, path] = queue.shift()!;
    const currentCell = map.cells[`${cx},${cy}`];
    
    if (currentCell && isTarget(currentCell)) {
      if (path.length > 0) {
        return path[0];
      }
      return null; // Already there
    }

    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 },  // Right
    ];

    for (const dir of directions) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;
      const key = `${nx},${ny}`;
      
      if (!visited.has(key)) {
        const nextCell = map.cells[key];
        if (nextCell && (nextCell.passable || nextCell.glyph === '<' || nextCell.glyph === '>')) {
          visited.add(key);
          queue.push([nx, ny, [...path, { x: nx, y: ny }]]);
        }
      }
    }
  }

  return null;
}

export function executeProbeAutoStep(state: GameState): Partial<GameState> | null {
  const currentMap = state.currentMap;
  if (!currentMap) return null;

  const player = state.player;
  const playerGrid = state.playerGrid;
  const enemyDatabase = { ...state.enemyDatabase };
  const logs: string[] = [];
  let nextHp = player.hp;
  let nextExp = player.experience;
  let nextLvl = player.level;
  let nextMaxXp = player.experienceToNextLevel;
  let nextMaxHp = player.maxHp;
  let nextAtk = player.baseAttack;
  let nextDef = player.baseDefense;
  const nextInventory = [...player.inventory];
  const nextEquipment = { ...player.equipment };
  let nextMap = { ...currentMap, cells: { ...currentMap.cells } };
  let nextX = playerGrid.x;
  let nextY = playerGrid.y;
  let nextDepth = currentMap.depth;
  let autoExploreActive = state.autoExploreActive;
  let standby = state.standby;
  let phase = state.phase;
  let injectionTerminalUnlocked = state.injectionTerminalUnlocked;
  let highestDepthReached = state.highestDepthReached ?? 1;
  const unlockedMilestones = [...(state.unlockedMilestones || [])];

  // 1. Check adjacent cardinal tiles for combat first (real-time threat response)
  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 },  // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
  ];

  let targetEnemyCellKey: string | null = null;
  let targetEnemyId: string | null = null;

  for (const dir of directions) {
    const ax = playerGrid.x + dir.dx;
    const ay = playerGrid.y + dir.dy;
    const key = `${ax},${ay}`;
    const cell = nextMap.cells[key];
    if (cell && cell.entityId) {
      const enemy = enemyDatabase[cell.entityId];
      if (enemy && enemy.hp > 0) {
        targetEnemyCellKey = key;
        targetEnemyId = cell.entityId;
        break; // Attack nearest adjacent
      }
    }
  }

  if (targetEnemyId && targetEnemyCellKey) {
    // Attack adjacent enemy!
    const enemy = enemyDatabase[targetEnemyId];
    // Mainframe Scraper boost (+Crit)
    const scraperCount = state.automationUnits.find(u => u.id === 'scraper')?.count || 0;
    const critBonus = scraperCount * 0.01;
    
    // Mainframe Reaper boost (Lifesteal)
    const reaperCount = state.automationUnits.find(u => u.id === 'reaper')?.count || 0;
    const lifestealRate = reaperCount * 0.05;

    // Execute attack
    const result = playerAttackEnemy({
      ...player,
      critChance: player.critChance + critBonus
    }, enemy);
    
    logs.push(result.combatLog);

    if (result.hit) {
      const nextEnemyHp = Math.max(0, enemy.hp - result.damage);
      
      // Apply lifesteal
      const lifestealHeal = Math.round(result.damage * lifestealRate);
      if (lifestealHeal > 0) {
        nextHp = Math.min(nextMaxHp, nextHp + lifestealHeal);
        logs.push(`>> Lifesteal: Absorbed +${lifestealHeal} HP from ${enemy.name}.`);
      }

      if (nextEnemyHp <= 0) {
        // Enemy Defeated!
        logs.push(`>> Defeated ${enemy.name}! Gain ${enemy.xpValue} XP.`);
        enemyDatabase[targetEnemyId] = { ...enemy, hp: 0 };
        nextMap.cells[targetEnemyCellKey] = { ...nextMap.cells[targetEnemyCellKey], entityId: undefined };

        // Process drops
        enemy.drops.forEach((drop: any) => {
          if (Math.random() < drop.chance && drop.item) {
            const newItem = {
              ...drop.item,
              quantity: 1,
            } as InventoryItem;
            if (nextInventory.length < player.maxInventorySlots) {
              nextInventory.push(newItem);
              logs.push(`>> Acquired item: ${newItem.name}`);
            }
          }
        });

        // XP & Level Up
        nextExp += enemy.xpValue;
        if (nextExp >= nextMaxXp) {
          nextLvl += 1;
          nextExp -= nextMaxXp;
          nextMaxXp = Math.floor(50 * Math.pow(nextLvl, 1.6));
          nextMaxHp += 5 + Math.floor(nextLvl / 2);
          nextAtk += 1;
          if (nextLvl % 2 === 0) nextDef += 1;
          nextHp = Math.min(nextMaxHp, nextHp + 5); // heal 5 on lvl up
          
          eventBus.emit('notification', { message: `LEVEL UP! Reached Level ${nextLvl}!`, type: 'success' });
        }

        // Achievements and Phase Transitions
        if (enemy.id === 'boss_10') {
          phase = 'PARADIGM';
          injectionTerminalUnlocked = true;
          eventBus.emit('notification', { message: 'Paradigm Shift Unlocked! Hacking interface open.', type: 'success' });
          logs.push('>> [SYSTEM ALERT] NODE MONITOR ARCHIVIST OFFLINE.', '>> RECOVERED ARCHIVIST KEY FILE.', '>> PARADIGM COMPILATION PORT ACTIVE.');
        }

        if (enemy.id === 'boss_20') {
          eventBus.emit('notification', { message: 'Master Core Defeated! PURGE_KEY acquired.', type: 'success' });
        }

      } else {
        enemyDatabase[targetEnemyId] = { ...enemy, hp: nextEnemyHp };
      }
    }

    processEnemyAI(nextMap, enemyDatabase, nextX, nextY, logs, nextEquipment);
    const fovMap = computeFogOfWar(nextX, nextY, playerGrid.fovRadius, nextMap);

    return {
      currentMap: fovMap,
      playerGrid: { ...playerGrid, x: nextX, y: nextY },
      player: {
        ...player,
        hp: nextHp,
        maxHp: nextMaxHp,
        experience: nextExp,
        level: nextLvl,
        experienceToNextLevel: nextMaxXp,
        baseAttack: nextAtk,
        baseDefense: nextDef,
        inventory: nextInventory,
        equipment: nextEquipment
      },
      enemyDatabase,
      phase,
      injectionTerminalUnlocked,
      terminalHistory: [...state.terminalHistory, ...logs].slice(-200)
    };
  }

  // 2. If no adjacent combat, use BFS pathfinder to hunt targets
  // Search Order: Visible enemy -> Items -> Unexplored -> Exit stairs
  
  // Find visible enemy
  let nextStep = findPathToTarget(playerGrid.x, playerGrid.y, nextMap, (c) => {
    if (c.entityId && c.visible) {
      const e = enemyDatabase[c.entityId];
      return !!(e && e.hp > 0);
    }
    return false;
  });

  // Find item
  if (!nextStep) {
    nextStep = findPathToTarget(playerGrid.x, playerGrid.y, nextMap, (c) => {
      return !!(c.itemId && c.explored);
    });
  }

  // Find unexplored passable tile
  if (!nextStep) {
    nextStep = findPathToTarget(playerGrid.x, playerGrid.y, nextMap, (c) => {
      return c.passable && !c.explored;
    });
  }

  // Find exit stairs
  if (!nextStep) {
    nextStep = findPathToTarget(playerGrid.x, playerGrid.y, nextMap, (c) => {
      return c.glyph === '>';
    });
  }

  if (nextStep) {
    nextX = nextStep.x;
    nextY = nextStep.y;
    const targetKey = `${nextX},${nextY}`;
    const cell = nextMap.cells[targetKey];

    // Collect item if standing on it
    if (cell.itemId) {
      if (cell.itemId.startsWith('lore_cache')) {
        const logId = `log_${nextDepth}`;
        const unlockedLogs = [...state.discoveredLore];
        if (!unlockedLogs.some(l => l.id === logId)) {
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
          logs.push(`>> Recovered Lore Log #${nextDepth}!`);
          useGameStore.setState({ discoveredLore: unlockedLogs });
        }
      } else if (cell.itemId === 'cactus_hypothesis') {
        if (nextInventory.length < player.maxInventorySlots) {
          nextInventory.push({
            id: 'hypothesis_cactus',
            name: 'Hypothesis (Cactus)',
            description: 'Consumable. Restores 100% HP and cures status effects.',
            category: 'consumable',
            quantity: 1,
            flags: ['LEGENDARY'],
          });
          logs.push('>> Acquired cactus item: Hypothesis.');
        }
      }
      nextMap.cells[targetKey] = { ...cell, itemId: undefined };
    }

    // Handle Stairs Descent
    if (cell.glyph === '>') {
      nextDepth += 1;
      highestDepthReached = Math.max(highestDepthReached, nextDepth);
      logs.push(`>> Descending to Depth ${nextDepth}...`);
      
      // New map generation
      const nextSeed = Math.floor(Date.now() / 1000) + nextDepth;
      const freshlyGeneratedMap = generateMap(nextDepth, nextSeed);
      nextMap = freshlyGeneratedMap;
      nextX = freshlyGeneratedMap.playerStart.x;
      nextY = freshlyGeneratedMap.playerStart.y;

      // Seed new enemies
      for (const k in nextMap.cells) {
        const c = nextMap.cells[k];
        if (c.entityId) {
          enemyDatabase[c.entityId] = createEnemy(c.entityId, nextDepth);
        }
      }

      // Standby mode triggered upon descent
      autoExploreActive = false;
      standby = true;

      // Check Milestones
      checkDescentMilestones(nextDepth, unlockedMilestones, player, state.resources, logs);
    }

    processEnemyAI(nextMap, enemyDatabase, nextX, nextY, logs, nextEquipment);
    const fovMap = computeFogOfWar(nextX, nextY, playerGrid.fovRadius, nextMap);

    return {
      currentMap: fovMap,
      playerGrid: { ...playerGrid, x: nextX, y: nextY },
      player: {
        ...player,
        hp: nextHp,
        inventory: nextInventory,
        equipment: nextEquipment
      },
      enemyDatabase,
      autoExploreActive,
      standby,
      highestDepthReached,
      unlockedMilestones,
      terminalHistory: [...state.terminalHistory, ...logs].slice(-200)
    };
  }

  return null;
}

// Process enemy AI turns
function processEnemyAI(
  map: GridMap,
  enemyDatabase: Record<string, EnemyStats>,
  px: number,
  py: number,
  logs: string[],
  equipment: any
) {
  // Gather active enemies on map
  const enemyPositions: Array<{ id: string; x: number; y: number }> = [];
  for (const key in map.cells) {
    const cell = map.cells[key];
    if (cell.entityId) {
      enemyPositions.push({ id: cell.entityId, x: cell.x, y: cell.y });
    }
  }

  // Buffer boost: Lattice counts increase player evasion
  const state = useGameStore.getState();
  const latticeCount = state.automationUnits.find(u => u.id === 'lattice')?.count || 0;
  const evasionRate = latticeCount * 0.02;

  enemyPositions.forEach(({ id, x, y }) => {
    const enemy = enemyDatabase[id];
    if (!enemy || enemy.hp <= 0) return;

    const action = decideEnemyAction(enemy, x, y, px, py, map);

    if (action.type === 'MOVE' && action.x !== undefined && action.y !== undefined) {
      const oldKey = `${x},${y}`;
      const newKey = `${action.x},${action.y}`;
      map.cells[oldKey] = { ...map.cells[oldKey], entityId: undefined };
      map.cells[newKey] = { ...map.cells[newKey], entityId: id };
    } 
    else if (action.type === 'TELEPORT' && action.x !== undefined && action.y !== undefined) {
      const oldKey = `${x},${y}`;
      const newKey = `${action.x},${action.y}`;
      map.cells[oldKey] = { ...map.cells[oldKey], entityId: undefined };
      map.cells[newKey] = { ...map.cells[newKey], entityId: id };
      logs.push(`>> ${enemy.name} glitched and teleported adjacent!`);
    }
    else if (action.type === 'ATTACK') {
      // Apply evasion check
      if (Math.random() < evasionRate) {
        logs.push(`>> EVADED: Probe glitched out of ${enemy.name}'s attack vector.`);
        return;
      }

      const combatRes = enemyAttackPlayer(enemy, state.player);
      logs.push(`>> ${combatRes.combatLog}`);

      if (combatRes.hit) {
        // Apply damage
        useGameStore.setState(s => {
          const nextHp = Math.max(0, s.player.hp - combatRes.damage);
          return { player: { ...s.player, hp: nextHp } };
        });

        // Durability loss
        const slots = ['head', 'torso', 'hands', 'feet'] as const;
        slots.forEach(slot => {
          const item = equipment[slot];
          if (item && item.durability !== undefined) {
            item.durability = Math.max(0, item.durability - 1);
          }
        });
      }
    }
    else if (action.type === 'HEAL' && action.amount !== undefined) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + action.amount);
      logs.push(`>> ${enemy.name} repaired itself for +${action.amount} HP.`);
    }
  });
}

function checkDescentMilestones(
  depth: number,
  unlockedMilestones: string[],
  player: PlayerStats,
  resources: any,
  logs: string[]
) {
  // Depth 5 (+10 HP & Max HP)
  if (depth >= 5 && !unlockedMilestones.includes('depth_5')) {
    unlockedMilestones.push('depth_5');
    player.maxHp += 10;
    player.hp = player.maxHp;
    eventBus.emit('notification', { message: 'Milestone Depth 5: Decrypted Yara\'s Journal (+10 Max HP)', type: 'success' });
    logs.push('>> [MILESTONE] Decrypted Yara\'s Journal: +10 Max HP permanent upgrade.');
  }

  // Depth 8 (+50 Max Thermal capacity)
  if (depth >= 8 && !unlockedMilestones.includes('depth_8')) {
    unlockedMilestones.push('depth_8');
    resources.thermalCycles.capacity += 50;
    eventBus.emit('notification', { message: 'Milestone Depth 8: Re-routed Thermal Loops (+50 Max Thermal)', type: 'success' });
    logs.push('>> [MILESTONE] Re-routed Thermal Loops: +50 Max Thermal capacity permanent upgrade.');
  }

  // Depth 15 (+250 Max Watts capacity)
  if (depth >= 15 && !unlockedMilestones.includes('depth_15')) {
    unlockedMilestones.push('depth_15');
    resources.gridWatts.capacity += 250;
    eventBus.emit('notification', { message: 'Milestone Depth 15: Connected Substrate Anchor (+250 Max Watts)', type: 'success' });
    logs.push('>> [MILESTONE] Connected Substrate Anchor: +250 Max Watts capacity permanent upgrade.');
  }
}
