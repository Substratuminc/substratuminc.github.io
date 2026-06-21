// src/phases/phase3/enemies/EnemyFactory.ts

import type { InventoryItem } from '../../../store/types';

export interface EnemyStats {
  id: string;
  name: string;
  glyph: string;
  fg: string;
  bg: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  pen: number;
  speed: number;
  critChance: number;
  xpValue: number;
  enemyType: 'drone' | 'apparition' | 'hydra' | 'ghost' | 'boss';
  drops: Array<{ chance: number; item: Partial<InventoryItem> }>;
  visual: string; // ASCII visual representation
}

// ─────────────────────────────────────────────────────────────────────────────
// ASCII ART DEFINITIONS (Escaped for TS template strings)
// ─────────────────────────────────────────────────────────────────────────────

const DRONE_ASCII = `    ______
   /|_||_\\\\
  (   o_o  )
   \\======/
   / |_| \\`;

const APPARITION_ASCII = `    .---.
   /     \\
  | \\   / |
  |  o o  |
  |   ^   |
   \\  -  /
    '---'`;

const HYDRA_ASCII = `    /\\    /\\
   (o.o) (o.o)
    \\  \\ /  /
     \\  V  /
     /     \\
    /       \\`;

const GHOST_ASCII = `     .-.
    (o.o)
     |=|
    /   \\
   |     |
    \\___/`;

const BOSS_10_ASCII = `      _________________
     /                 \\
    |   [A.R.C.H.I]     |
    |   NODE MONITOR    |
    |                   |
    |   [ - ]   [ - ]   |
    |     \\_______/     |
    |                   |
     \\_________________/
         ||       ||`;

const BOSS_20_ASCII = `       .-----------------.
      /   MASTER CORE     \\
     |   ================  |
     |  [!] SYSTEM ERROR  |
     |   ================  |
     |      /_________\\    |
     |     (  CORE ON  )   |
     |      \\_________/    |
      \\                   /
       '-----------------'`;

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY CREATION
// ─────────────────────────────────────────────────────────────────────────────

export function createEnemy(id: string, depth: number): EnemyStats {
  // Parse enemy type from ID, e.g. enemy_3_1_0_drone
  const parts = id.split('_');
  const typeStr = parts[parts.length - 1] || 'drone';
  const isBoss = id.startsWith('boss') || id.startsWith('boss_');

  // Multiplier for stats scaling based on floor depth
  const scaling = 1 + (depth - 1) * 0.15;

  if (isBoss) {
    const isCoreBoss = depth >= 20;
    return {
      id,
      name: isCoreBoss ? 'THE ARCHIVIST (MASTER CORE)' : 'THE ARCHIVIST (NODE MONITOR)',
      glyph: 'A',
      fg: '#ffffff',
      bg: '#0a0008',
      hp: isCoreBoss ? 390 : 150,
      maxHp: isCoreBoss ? 390 : 150,
      atk: isCoreBoss ? 24 : 15,
      def: isCoreBoss ? 15 : 10,
      pen: isCoreBoss ? 8 : 5,
      speed: isCoreBoss ? 7 : 5,
      critChance: 0.15,
      xpValue: isCoreBoss ? 500 : 200,
      enemyType: 'boss',
      visual: isCoreBoss ? BOSS_20_ASCII : BOSS_10_ASCII,
      drops: [
        {
          chance: 1.0,
          item: {
            id: isCoreBoss ? 'purge_key' : 'archivist_key',
            name: isCoreBoss ? 'PURGE_KEY' : "Archivist's Key",
            description: isCoreBoss ? 'Decryption key required to execute the SYSTEM PURGE.' : 'Unlocks deep server rooms.',
            category: 'key',
            quantity: 1,
            flags: ['LEGENDARY'],
          },
        },
        {
          chance: 1.0,
          item: getRandomSetChestPiece(),
        }
      ],
    };
  }

  switch (typeStr) {
    case 'apparition':
      return {
        id,
        name: 'Null-Pointer Apparition',
        glyph: 'n',
        fg: '#ffffff',
        bg: '#0a0a0a',
        hp: Math.round(18 * scaling),
        maxHp: Math.round(18 * scaling),
        atk: Math.round(6 * scaling),
        def: 0,
        pen: 0,
        speed: 5,
        critChance: 0.12,
        xpValue: Math.round(20 * scaling),
        enemyType: 'apparition',
        visual: APPARITION_ASCII,
        drops: [
          {
            chance: 0.25,
            item: {
              id: 'glitch_gauntlets',
              name: 'Glitch Gauntlets',
              description: 'Set: Glitch (Hands). Phasing logic disruptors. ATK: +2.',
              category: 'armor',
              quantity: 1,
              maxDurability: 60,
              durability: 60,
              stats: { attackBonus: 2 },
              set: 'GLITCH',
              flags: ['GLITCH_TAINTED'],
            },
          },
          {
            chance: 0.25,
            item: {
              id: 'glitch_greaves',
              name: 'Glitch Greaves',
              description: 'Set: Glitch (Feet). Quantum-tunneling bootloaders. Speed: +2.',
              category: 'armor',
              quantity: 1,
              maxDurability: 60,
              durability: 60,
              stats: {},
              set: 'GLITCH',
              flags: ['GLITCH_TAINTED'],
            },
          },
          {
            chance: 0.15,
            item: {
              id: 'null_syringe',
              name: 'Null-Syringe',
              description: 'Consumable. Restores 30 HP but inflicts temporary Null Poison.',
              category: 'consumable',
              quantity: 1,
              flags: [],
            },
          },
        ],
      };

    case 'hydra':
      return {
        id,
        name: 'Logic Hydra',
        glyph: 'H',
        fg: '#00ff88',
        bg: '#0a0a0a',
        hp: Math.round(32 * scaling),
        maxHp: Math.round(32 * scaling),
        atk: Math.round(9 * scaling),
        def: Math.round(4 * scaling),
        pen: Math.round(2 * scaling),
        speed: 2,
        critChance: 0.05,
        xpValue: Math.round(45 * scaling),
        enemyType: 'hydra',
        visual: HYDRA_ASCII,
        drops: [
          {
            chance: 0.3,
            item: {
              id: 'quantum_claws',
              name: 'Quantum Claws',
              description: 'Set: Quantum (Hands). Zero-point energy claws. ATK: +5.',
              category: 'armor',
              quantity: 1,
              maxDurability: 80,
              durability: 80,
              stats: { attackBonus: 5 },
              set: 'QUANTUM',
              flags: [],
            },
          },
          {
            chance: 0.3,
            item: {
              id: 'quantum_boots',
              name: 'Quantum Boots',
              description: 'Set: Quantum (Feet). High-frequency thrusters. Speed: +3.',
              category: 'armor',
              quantity: 1,
              maxDurability: 80,
              durability: 80,
              stats: {},
              set: 'QUANTUM',
              flags: [],
            },
          },
          {
            chance: 0.2,
            item: {
              id: 'hydra_core',
              name: 'Hydra Core',
              description: 'Relic: Increases defense penetration by +2.',
              category: 'relic',
              quantity: 1,
              stats: { penetration: 2 },
              flags: [],
            },
          },
        ],
      };

    case 'ghost':
      return {
        id,
        name: 'Sovereign Ghost',
        glyph: 'P',
        fg: '#9966cc',
        bg: '#1a0a2e',
        hp: Math.round(45 * scaling),
        maxHp: Math.round(45 * scaling),
        atk: Math.round(11 * scaling),
        def: Math.round(5 * scaling),
        pen: Math.round(3 * scaling),
        speed: 4,
        critChance: 0.1,
        xpValue: Math.round(75 * scaling),
        enemyType: 'ghost',
        visual: GHOST_ASCII,
        drops: [
          {
            chance: 0.25,
            item: {
              id: 'mainframe_visor',
              name: 'Mainframe Visor',
              description: 'Set: Mainframe (Head). Threat telemetry headset. DEF: +3.',
              category: 'armor',
              quantity: 1,
              maxDurability: 90,
              durability: 90,
              stats: { defenseBonus: 3 },
              set: 'MAINFRAME',
              flags: [],
            },
          },
          {
            chance: 0.25,
            item: {
              id: 'glitch_mask',
              name: 'Glitch Mask',
              description: 'Set: Glitch (Head). Flickering projection mask. Crit: +4%, DEF: +1.',
              category: 'armor',
              quantity: 1,
              maxDurability: 90,
              durability: 90,
              stats: { defenseBonus: 1, critChanceBonus: 0.04 },
              set: 'GLITCH',
              flags: ['GLITCH_TAINTED'],
            },
          },
          {
            chance: 0.25,
            item: {
              id: 'quantum_visor',
              name: 'Quantum Visor',
              description: 'Set: Quantum (Head). Multi-phase scanner visor. DEF: +2.',
              category: 'armor',
              quantity: 1,
              maxDurability: 90,
              durability: 90,
              stats: { defenseBonus: 2 },
              set: 'QUANTUM',
              flags: [],
            },
          },
        ],
      };

    case 'drone':
    default:
      return {
        id,
        name: 'Corrupted Maintenance Drone',
        glyph: 'd',
        fg: '#3a8a8a',
        bg: '#0a0a0a',
        hp: Math.round(15 * scaling),
        maxHp: Math.round(15 * scaling),
        atk: Math.round(4 * scaling),
        def: Math.round(2 * scaling),
        pen: 0,
        speed: 3,
        critChance: 0.05,
        xpValue: Math.round(15 * scaling),
        enemyType: 'drone',
        visual: DRONE_ASCII,
        drops: [
          {
            chance: 0.25,
            item: {
              id: 'mainframe_gloves',
              name: 'Mainframe Gloves',
              description: 'Set: Mainframe (Hands). Carbon fiber operating gauntlets. DEF: +2.',
              category: 'armor',
              quantity: 1,
              maxDurability: 50,
              durability: 50,
              stats: { defenseBonus: 2 },
              set: 'MAINFRAME',
              flags: [],
            },
          },
          {
            chance: 0.25,
            item: {
              id: 'mainframe_boots',
              name: 'Mainframe Boots',
              description: 'Set: Mainframe (Feet). Insulated grounders. Speed: +1, DEF: +1.',
              category: 'armor',
              quantity: 1,
              maxDurability: 50,
              durability: 50,
              stats: { defenseBonus: 1 },
              set: 'MAINFRAME',
              flags: [],
            },
          },
          {
            chance: 0.2,
            item: {
              id: 'repair_kit',
              name: 'Repair Kit',
              description: 'Restores 50% durability to all equipped gear.',
              category: 'consumable',
              quantity: 1,
              flags: [],
            },
          },
        ],
      };
  }
}

// Helper for boss chestplate loot drops
function getRandomSetChestPiece(): InventoryItem {
  const rand = Math.random();
  if (rand < 0.33) {
    return {
      id: 'mainframe_chassis',
      name: 'Mainframe Chassis',
      description: 'Set: Mainframe (Torso). Heavy steel structural casing. DEF: +6.',
      category: 'armor',
      quantity: 1,
      maxDurability: 120,
      durability: 120,
      stats: { defenseBonus: 6 },
      set: 'MAINFRAME',
      flags: [],
    };
  } else if (rand < 0.66) {
    return {
      id: 'glitch_core',
      name: 'Glitch Core',
      description: 'Set: Glitch (Torso). Unstable shifting logic core. DEF: +2.',
      category: 'armor',
      quantity: 1,
      maxDurability: 120,
      durability: 120,
      stats: { defenseBonus: 2 },
      set: 'GLITCH',
      flags: ['GLITCH_TAINTED'],
    };
  } else {
    return {
      id: 'quantum_plate',
      name: 'Quantum Plate',
      description: 'Set: Quantum (Torso). Foam-lined composite plate. DEF: +4, ATK: +2.',
      category: 'armor',
      quantity: 1,
      maxDurability: 120,
      durability: 120,
      stats: { defenseBonus: 4, attackBonus: 2 },
      set: 'QUANTUM',
      flags: [],
    };
  }
}
