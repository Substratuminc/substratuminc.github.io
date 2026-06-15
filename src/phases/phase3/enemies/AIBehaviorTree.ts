// src/phases/phase3/enemies/AIBehaviorTree.ts

import * as ROT from 'rot-js';
import type { GridMap } from '../../../store/types';
import type { EnemyStats } from './EnemyFactory';

export interface AIAction {
  type: 'MOVE' | 'ATTACK' | 'HEAL' | 'TELEPORT' | 'IDLE';
  x?: number;
  y?: number;
  amount?: number;
}

export function decideEnemyAction(
  enemy: EnemyStats,
  enemyX: number,
  enemyY: number,
  playerX: number,
  playerY: number,
  map: GridMap
): AIAction {
  const dx = playerX - enemyX;
  const dy = playerY - enemyY;
  const distance = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance

  // Adjacent check
  const isAdjacent = distance === 1;

  // 1. NULL-POINTER APPARITION SPECIAL AI
  if (enemy.enemyType === 'apparition') {
    // Dormant until player within 3 tiles
    if (distance > 3 && !map.cells[`${enemyX},${enemyY}`].visible) {
      return { type: 'IDLE' };
    }
    // Teleport adjacent if not adjacent
    if (!isAdjacent) {
      // Find open adjacent cell to player
      const options: [number, number][] = [];
      const dirs = [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      for (const [ox, oy] of dirs) {
        const tx = playerX + ox;
        const ty = playerY + oy;
        const cell = map.cells[`${tx},${ty}`];
        if (cell && cell.passable && !cell.entityId) {
          options.push([tx, ty]);
        }
      }
      if (options.length > 0) {
        const [tx, ty] = options[Math.floor(Math.random() * options.length)];
        return { type: 'TELEPORT', x: tx, y: ty };
      }
    } else {
      return { type: 'ATTACK' };
    }
  }

  // 2. CORRUPTED MAINTENANCE DRONE SPECIAL AI
  if (enemy.enemyType === 'drone') {
    // If adjacent, check self repair chance (30% if HP < 50%)
    if (isAdjacent && enemy.hp < enemy.maxHp * 0.5 && Math.random() < 0.3) {
      return { type: 'HEAL', amount: 3 };
    }

    // Flee if HP < 20% and not adjacent
    if (enemy.hp < enemy.maxHp * 0.2 && distance < 5 && Math.random() < 0.5) {
      // Pathfind AWAY from player
      const options: [number, number][] = [];
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [ox, oy] of dirs) {
        const tx = enemyX + ox;
        const ty = enemyY + oy;
        const cell = map.cells[`${tx},${ty}`];
        if (cell && cell.passable && !cell.entityId) {
          // Verify it moves player further away
          const newDist = Math.max(Math.abs(playerX - tx), Math.abs(playerY - ty));
          if (newDist > distance) {
            options.push([tx, ty]);
          }
        }
      }
      if (options.length > 0) {
        const [tx, ty] = options[Math.floor(Math.random() * options.length)];
        return { type: 'MOVE', x: tx, y: ty };
      }
    }
  }

  // 3. STANDARD PATHFINDING (A*)
  // Alert range 6 tiles
  if (distance <= 6) {
    if (isAdjacent) {
      return { type: 'ATTACK' };
    }

    // Use Rot.js AStar
    const path: [number, number][] = [];
    const passableCallback = (x: number, y: number): boolean => {
      const cell = map.cells[`${x},${y}`];
      if (!cell) return false;
      // Allow passing through player, but other entities block
      return cell.passable && (!cell.entityId || (x === playerX && y === playerY));
    };

    const astar = new ROT.Path.AStar(playerX, playerY, passableCallback);
    astar.compute(enemyX, enemyY, (x, y) => {
      path.push([x, y]);
    });

    // path[0] is current node, path[1] is the next step!
    if (path.length > 1) {
      const [nextX, nextY] = path[1];
      // Check if occupied by other enemy
      const targetCell = map.cells[`${nextX},${nextY}`];
      if (targetCell && !targetCell.entityId) {
        return { type: 'MOVE', x: nextX, y: nextY };
      }
    }
  }

  // If too far or blocked, just wander randomly (patrol)
  if (Math.random() < 0.3) {
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const [ox, oy] = dirs[Math.floor(Math.random() * dirs.length)];
    const tx = enemyX + ox;
    const ty = enemyY + oy;
    const cell = map.cells[`${tx},${ty}`];
    if (cell && cell.passable && !cell.entityId && cell.glyph === '.') {
      return { type: 'MOVE', x: tx, y: ty };
    }
  }

  return { type: 'IDLE' };
}
