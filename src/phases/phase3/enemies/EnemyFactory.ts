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
}

export function createEnemy(id: string, depth: number): EnemyStats {
  // Parse enemy type from ID, e.g., enemy_3_1_0_drone
  const parts = id.split('_');
  const typeStr = parts[parts.length - 1] || 'drone';

  const isBoss = id.startsWith('boss');

  if (isBoss) {
    // The Archivist Boss
    const isCoreBoss = depth === 20;
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
      ],
    };
  }

  // Scaling multiplier for normal enemies based on depth
  const scaling = 1 + (depth - 1) * 0.15;

  switch (typeStr) {
    case 'apparition':
      return {
        id,
        name: 'Null-Pointer Apparition',
        glyph: 'n',
        fg: '#ffffff',
        bg: '#0a0a0a',
        hp: Math.round(8 * scaling),
        maxHp: Math.round(8 * scaling),
        atk: Math.round(6 * scaling),
        def: 0,
        pen: 0,
        speed: 6,
        critChance: 0.15,
        xpValue: Math.round(18 * scaling),
        enemyType: 'apparition',
        drops: [
          {
            chance: 0.25,
            item: {
              id: 'fragment_lost_code',
              name: 'Fragment of Lost Code',
              description: 'A glowing fragment of corrupted pointer memory.',
              category: 'lore',
              quantity: 1,
              flags: ['GLITCH_TAINTED'],
            },
          },
          {
            chance: 0.15,
            item: {
              id: 'null_syringe',
              name: 'Null-Syringe',
              description: 'Applies nullPoison to target on hit.',
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
        hp: Math.round(20 * scaling),
        maxHp: Math.round(20 * scaling),
        atk: Math.round(8 * scaling),
        def: Math.round(5 * scaling),
        pen: Math.round(2 * scaling),
        speed: 2,
        critChance: 0.05,
        xpValue: Math.round(60 * scaling),
        enemyType: 'hydra',
        drops: [
          {
            chance: 0.8,
            item: {
              id: 'hydra_core',
              name: 'Hydra Core',
              description: 'Relic: +10% ATK per enemy killed on current floor.',
              category: 'relic',
              quantity: 1,
              flags: ['VENDOR_EXCLUSIVE'],
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
        atk: Math.round(10 * scaling),
        def: Math.round(6 * scaling),
        pen: Math.round(3 * scaling),
        speed: 4,
        critChance: 0.1,
        xpValue: Math.round(90 * scaling),
        enemyType: 'ghost',
        drops: [
          {
            chance: 0.5,
            item: {
              id: 'void_dust',
              name: 'Void Dust',
              description: 'A handful of dark static residue.',
              category: 'consumable',
              quantity: 1,
              flags: [],
            },
          },
          {
            chance: 0.3,
            item: {
              id: 'logic_shield',
              name: 'Logic Shield',
              description: 'Shield. DEF: +8. 10% block chance.',
              category: 'armor',
              quantity: 1,
              maxDurability: 70,
              durability: 70,
              flags: [],
            },
          },
          {
            chance: 0.1,
            item: {
              id: 'sovereign_weave',
              name: 'Sovereign Weave',
              description: 'Torso armor. DEF: +12. Increases HP by +5% per floor.',
              category: 'armor',
              quantity: 1,
              maxDurability: 120,
              durability: 120,
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
        hp: Math.round(12 * scaling),
        maxHp: Math.round(12 * scaling),
        atk: Math.round(4 * scaling),
        def: Math.round(2 * scaling),
        pen: 0,
        speed: 3,
        critChance: 0.05,
        xpValue: Math.round(24 * scaling),
        enemyType: 'drone',
        drops: [
          {
            chance: 0.4,
            item: {
              id: 'repair_kit',
              name: 'Repair Kit',
              description: 'Restores 20 durability to equipped weapon/armor.',
              category: 'consumable',
              quantity: 1,
              flags: [],
            },
          },
          {
            chance: 0.2,
            item: {
              id: 'overclock_shard',
              name: 'Overclock Shard',
              description: 'Relic: Applies overclockedI on use.',
              category: 'relic',
              quantity: 1,
              flags: [],
            },
          },
          {
            chance: 0.1,
            item: {
              id: 'bit_blade_1',
              name: 'Bit-Blade Mk.I',
              description: 'Light sword. ATK: +5.',
              category: 'weapon',
              quantity: 1,
              maxDurability: 40,
              durability: 40,
              flags: [],
            },
          },
        ],
      };
  }
}
