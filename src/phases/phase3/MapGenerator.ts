// src/phases/phase3/MapGenerator.ts

import * as ROT from 'rot-js';
import type { GridMap, GridCell, SpecialRoom } from '../../store/types';

export function generateMap(depth: number, seed: number): GridMap {
  // If the secret debug seed is used, load the custom office map (Secret 05)
  if (seed === 47291) {
    return generateTrueFloor();
  }

  // Set the Rot.js RNG seed
  ROT.RNG.setSeed(seed);

  // Determine size based on depth range
  let width = 40;
  let height = 30;
  if (depth >= 16) {
    width = 80;
    height = 60;
  } else if (depth >= 11) {
    width = 70;
    height = 50;
  } else if (depth >= 6) {
    width = 60;
    height = 40;
  }

  const cells: Record<string, GridCell> = {};
  const specialRooms: SpecialRoom[] = [];

  // Create Digger map generator
  // Depth 11-15 uses Cellular for organic cave structure, others use Digger
  const useCellular = depth >= 11 && depth <= 15;
  const mapData: Record<string, boolean> = {}; // true = floor, false = wall

  if (useCellular) {
    const cellular = new ROT.Map.Cellular(width, height);
    cellular.randomize(0.5);
    // run cellular automata cycles
    for (let i = 0; i < 4; i++) {
      cellular.create();
    }
    cellular.connect((x, y, value) => {
      mapData[`${x},${y}`] = value === 1;
    }, 1);
  } else {
    const digger = new ROT.Map.Digger(width, height, {
      roomWidth: [3, 8],
      roomHeight: [3, 8],
      corridorLength: [3, 10],
      dugPercentage: 0.25,
    });

    digger.create((x, y, value) => {
      // 0 = empty/floor, 1 = wall
      mapData[`${x},${y}`] = value === 0;
    });

    // Save digger rooms as special rooms
    const rooms = digger.getRooms();
    rooms.forEach((room, idx) => {
      specialRooms.push({
        id: `room-${idx}`,
        type: idx === 0 ? 'ANOMALY' : idx === rooms.length - 1 ? 'BOSS' : 'LORE_CACHE',
        bounds: {
          x: room.getLeft(),
          y: room.getTop(),
          w: room.getRight() - room.getLeft() + 1,
          h: room.getBottom() - room.getTop() + 1,
        },
        triggered: false,
      });
    });
  }

  // Initialize cells record
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const isFloor = mapData[`${x},${y}`] || false;
      const key = `${x},${y}`;

      cells[key] = {
        x,
        y,
        glyph: isFloor ? '.' : '#',
        fg: isFloor ? '#555555' : '#222222',
        bg: '#0a0a0a',
        passable: isFloor,
        visible: false,
        explored: false,
      };

      // Add pools of static noise '~' on depth 11-15 floors
      if (isFloor && useCellular && ROT.RNG.getUniform() < 0.08) {
        cells[key].glyph = '~';
        cells[key].fg = '#33ff66';
      }

      // Add glitch tiles '*' randomly on depth 16-20 Core floors
      if (isFloor && depth >= 16 && ROT.RNG.getUniform() < 0.05) {
        cells[key].glyph = '*';
        cells[key].fg = '#ff33ff';
        cells[key].isGlitchTile = true;
      }
    }
  }

  // Find player start (first available floor tile)
  let startX = 2;
  let startY = 2;
  let foundStart = false;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (cells[`${x},${y}`]?.passable) {
        startX = x;
        startY = y;
        foundStart = true;
        break;
      }
    }
    if (foundStart) break;
  }

  // Place exits: Staircase down '>' in the furthest available place, staircase up '<' at start
  cells[`${startX},${startY}`].glyph = '<';
  cells[`${startX},${startY}`].fg = '#8888ff';

  // Staircase down
  let exitX = width - 3;
  let exitY = height - 3;
  let foundExit = false;
  for (let y = height - 2; y > 1; y--) {
    for (let x = width - 2; x > 1; x--) {
      if (cells[`${x},${y}`]?.passable && (x !== startX || y !== startY)) {
        exitX = x;
        exitY = y;
        foundExit = true;
        break;
      }
    }
    if (foundExit) break;
  }

  cells[`${exitX},${exitY}`].glyph = '>';
  cells[`${exitX},${exitY}`].fg = '#ff8888';

  // Spawn items ('!') and enemies ('e')
  const rooms = specialRooms.length > 0 ? specialRooms : [{ bounds: { x: 2, y: 2, w: width - 4, h: height - 4 } }];
  rooms.forEach((room, roomIdx) => {
    // Spawn 1 lore cache item '!' in lore rooms
    if (roomIdx > 0 && roomIdx < rooms.length - 1) {
      const rx = room.bounds.x + Math.floor(room.bounds.w / 2);
      const ry = room.bounds.y + Math.floor(room.bounds.h / 2);
      const key = `${rx},${ry}`;
      if (cells[key] && cells[key].passable) {
        cells[key].glyph = '!';
        cells[key].fg = '#ffff00';
        cells[key].itemId = `lore_cache_${depth}_${roomIdx}`;
      }
    }

    // Spawn 1-2 enemies per room
    const enemyCount = Math.floor(ROT.RNG.getUniform() * 2) + 1;
    for (let i = 0; i < enemyCount; i++) {
      const ex = room.bounds.x + Math.floor(ROT.RNG.getUniform() * (room.bounds.w - 1));
      const ey = room.bounds.y + Math.floor(ROT.RNG.getUniform() * (room.bounds.h - 1));
      const key = `${ex},${ey}`;

      if (cells[key] && cells[key].passable && cells[key].glyph === '.') {
        // Pick enemy type based on depth
        let enemyType = 'drone';
        const rand = ROT.RNG.getUniform();
        
        if (depth >= 16) {
          enemyType = rand < 0.4 ? 'ghost' : rand < 0.7 ? 'hydra' : 'apparition';
        } else if (depth >= 11) {
          enemyType = rand < 0.5 ? 'hydra' : 'apparition';
        } else if (depth >= 6) {
          enemyType = rand < 0.6 ? 'apparition' : 'drone';
        }

        // Spawn a boss 'E' on depth 10 & 20 instead of normal enemies
        const isBossFloor = (depth === 10 || depth === 20) && roomIdx === rooms.length - 1;
        
        cells[key].entityId = isBossFloor 
          ? `boss_${depth}`
          : `enemy_${depth}_${roomIdx}_${i}_${enemyType}`;
        
        // Glyphs
        if (isBossFloor) {
          cells[key].glyph = 'A'; // The Archivist boss
          cells[key].fg = '#ffffff';
        } else {
          cells[key].glyph = enemyType === 'drone' ? 'd' : enemyType === 'apparition' ? 'n' : enemyType === 'hydra' ? 'H' : 'P';
          cells[key].fg = enemyType === 'drone' ? '#3a8a8a' : enemyType === 'apparition' ? '#ffffff' : enemyType === 'hydra' ? '#00ff88' : '#9966cc';
        }
      }
    }
  });

  return {
    width,
    height,
    depth,
    seed,
    cells,
    playerStart: { x: startX, y: startY },
    exits: [{ x: exitX, y: exitY, targetDepth: depth + 1 }],
    specialRooms,
  };
}

// Hand-crafted Test Floor 47291 (Secret 05)
function generateTrueFloor(): GridMap {
  const width = 100;
  const height = 80;
  const cells: Record<string, GridCell> = {};

  // Build a giant empty office layout
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const key = `${x},${y}`;
      const isBoundary = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      
      cells[key] = {
        x,
        y,
        glyph: isBoundary ? '#' : '.',
        fg: isBoundary ? '#222222' : '#333333',
        bg: '#0a0a0a',
        passable: !isBoundary,
        visible: false,
        explored: false,
      };
    }
  }

  // Draw some office cubicle desks
  const drawDesk = (dx: number, dy: number, name: string) => {
    // monitors: [m]
    cells[`${dx},${dy}`] = { x: dx, y: dy, glyph: '[', fg: '#888888', bg: '#0a0a0a', passable: false, visible: false, explored: false };
    cells[`${dx+1},${dy}`] = { x: dx+1, y: dy, glyph: 'm', fg: '#55ff55', bg: '#0a0a0a', passable: false, visible: false, explored: false, itemId: `monitor_${name}` };
    cells[`${dx+2},${dy}`] = { x: dx+2, y: dy, glyph: ']', fg: '#888888', bg: '#0a0a0a', passable: false, visible: false, explored: false };
  };

  drawDesk(10, 10, 'osei');
  // Hypothesis cactus
  cells[`${10},${11}`] = { x: 10, y: 11, glyph: 'p', fg: '#00ff00', bg: '#0a0a0a', passable: false, visible: false, explored: false, itemId: 'cactus_hypothesis' };

  drawDesk(10, 20, 'rücker');
  drawDesk(25, 20, 'varela');

  // Draw core SI-001 chamber
  // 30x10 chamber in the middle
  const cx = 40;
  const cy = 35;
  const cw = 20;
  const ch = 10;

  for (let x = cx; x < cx + cw; x++) {
    for (let y = cy; y < cy + ch; y++) {
      const isWall = x === cx || y === cy || x === cx + cw - 1 || y === cy + ch - 1;
      const key = `${x},${y}`;
      cells[key] = {
        x,
        y,
        glyph: isWall ? '█' : '.',
        fg: isWall ? '#550055' : '#1a051a',
        bg: '#0a0a0a',
        passable: !isWall,
        visible: false,
        explored: false,
      };
    }
  }

  // Place interactive center portal
  const px = cx + Math.floor(cw / 2);
  const py = cy + Math.floor(ch / 2);
  cells[`${px},${py}`] = {
    x: px,
    y: py,
    glyph: '?',
    fg: '#ff00ff',
    bg: '#0a0a0a',
    passable: true,
    visible: false,
    explored: false,
    itemId: 'si_001_core',
  };

  // Exit staircase back to the regular depth level
  cells[`${90},${70}`].glyph = '✦';
  cells[`${90},${70}`].fg = '#ff00ff';

  return {
    width,
    height,
    depth: 999, // special depth
    seed: 47291,
    cells,
    playerStart: { x: 8, y: 8 },
    exits: [{ x: 90, y: 70, targetDepth: 1 }],
    specialRooms: [
      { id: 'office', type: 'ANOMALY', bounds: { x: 5, y: 5, w: 90, h: 70 }, triggered: false },
    ],
  };
}
