// src/phases/phase3/FogOfWar.ts

import * as ROT from 'rot-js';
import type { GridMap } from '../../store/types';

export function computeFogOfWar(
  playerX: number,
  playerY: number,
  fovRadius: number,
  map: GridMap
): GridMap {
  const nextMap = { ...map, cells: { ...map.cells } };

  // 1. Reset all cells visibility
  for (const key in nextMap.cells) {
    nextMap.cells[key] = {
      ...nextMap.cells[key],
      visible: false,
    };
  }

  // 2. Define custom light pass callback for PreciseShadowcasting
  const lightPasses = (x: number, y: number): boolean => {
    const key = `${x},${y}`;
    const cell = nextMap.cells[key];
    if (!cell) return false;
    // Walls block light (non-passable cells block light)
    return cell.passable || cell.glyph === '<' || cell.glyph === '>';
  };

  // 3. Instantiate shadowcaster and compute FOV
  const shadowcaster = new ROT.FOV.PreciseShadowcasting(lightPasses);

  shadowcaster.compute(playerX, playerY, fovRadius, (x, y, _r, visibility) => {
    const key = `${x},${y}`;
    const cell = nextMap.cells[key];
    if (cell && visibility > 0) {
      nextMap.cells[key] = {
        ...cell,
        visible: true,
        explored: true,
      };
    }
  });

  // Ensure the player's standing tile is always visible
  const playerKey = `${playerX},${playerY}`;
  if (nextMap.cells[playerKey]) {
    nextMap.cells[playerKey] = {
      ...nextMap.cells[playerKey],
      visible: true,
      explored: true,
    };
  }

  return nextMap;
}
