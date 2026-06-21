// src/phases/phase3/CombatEngine.ts

import type { PlayerStats, GameState } from '../../store/types';
import type { EnemyStats } from './enemies/EnemyFactory';
import { useGameStore } from '../../store/gameStore';

export interface CombatResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  statusApplied?: string;
  combatLog: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EFFECTIVE MAX HP CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

export function getEffectiveMaxHp(player: PlayerStats, state: GameState): number {
  let maxHp = player.maxHp;

  // Set Bonus: Mainframe 2-pieces (+15 Max HP)
  const eq = getEquipmentStats(player);
  if (eq.mainframeCount >= 2) {
    maxHp += 15;
  }

  // Buffers count (+5 Max HP per Buffer automation unit)
  const bufferCount = state.automationUnits.find(u => u.id === 'buffer')?.count || 0;
  maxHp += bufferCount * 5;

  return maxHp;
}

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT STATS & SET BONUSES
// ─────────────────────────────────────────────────────────────────────────────

export function getEquipmentStats(player: PlayerStats) {
  const stats = {
    attack: 0,
    defense: 0,
    penetration: 0,
    critChance: 0,
    speed: 0,
    hitChance: 0,
    // Set piece counters
    mainframeCount: 0,
    glitchCount: 0,
    quantumCount: 0,
  };

  const slots = ['head', 'torso', 'hands', 'feet', 'mainHand', 'offHand', 'relic1', 'relic2'] as const;
  for (const slot of slots) {
    const item = player.equipment[slot];
    if (item && (item.durability === undefined || item.durability > 0)) {
      if (item.set === 'MAINFRAME') stats.mainframeCount++;
      if (item.set === 'GLITCH') stats.glitchCount++;
      if (item.set === 'QUANTUM') stats.quantumCount++;

      const s = item.stats;
      if (s) {
        if (s.attackBonus) stats.attack += s.attackBonus;
        if (s.defenseBonus) stats.defense += s.defenseBonus;
        if (s.penetration) stats.penetration += s.penetration;
        if (s.critChanceBonus) stats.critChance += s.critChanceBonus;
      }
    }

    // Special item logic
    if (item) {
      if (item.id === 'chassis_boots') stats.speed += 1;
      if (item.id === 'data_scope') stats.hitChance += 0.10; // +10% hit chance
    }
  }

  // 2-Piece Set Bonuses
  if (stats.glitchCount >= 2) stats.critChance += 0.08;   // +8% Crit Chance
  if (stats.quantumCount >= 2) stats.attack += 5;         // +5 ATK

  // 4-Piece Set Bonuses
  if (stats.mainframeCount >= 4) stats.defense += 5;      // +5 DEF
  if (stats.quantumCount >= 4) stats.speed += 4;          // +4 Speed

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD COMBAT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function playerAttackEnemy(player: PlayerStats, enemy: EnemyStats, state: GameState): CombatResult {
  const eq = getEquipmentStats(player);
  
  // 1. Hit Chance
  const playerSpeed = player.speed + eq.speed;
  const baseHit = 0.65 + (playerSpeed - enemy.speed) * 0.03 + eq.hitChance;
  
  let blinded = player.activeStatusEffects.some(e => e.effect === 'dataFragmented') ? -0.25 : 0;
  const hitChance = Math.min(0.95, Math.max(0.05, baseHit + blinded));

  const rollHit = Math.random() < hitChance;
  if (!rollHit) {
    return {
      hit: false,
      damage: 0,
      critical: false,
      combatLog: `MISS: Player attack missed the ${enemy.name} (${Math.round(hitChance * 100)}% hit rate).`,
    };
  }

  // 2. Raw Damage & Mainframe 4pc Watts synergy
  const dmgVariance = Math.floor(Math.random() * 5) - 2; // -2 to +2
  let rawDmg = player.baseAttack + eq.attack + dmgVariance;

  if (eq.mainframeCount >= 4) {
    const watts = state.resources.gridWatts.amount;
    const bonus = Math.round(watts * 0.02);
    rawDmg += bonus;
  }

  // Active status effects
  const overclocked = player.activeStatusEffects.find(e => e.effect.startsWith('overclocked'));
  if (overclocked) {
    if (overclocked.effect === 'overclockedI') rawDmg = Math.round(rawDmg * 1.2);
    else if (overclocked.effect === 'overclockedII') rawDmg = Math.round(rawDmg * 1.5);
    else if (overclocked.effect === 'overclockedIII') rawDmg = Math.round(rawDmg * 2.0);
  }
  if (player.activeStatusEffects.some(e => e.effect === 'overheated')) {
    rawDmg += 2; // +2 bonus when overheated
  }

  rawDmg = Math.max(1, rawDmg);

  // 3. Defense mitigation
  const effDef = Math.max(0, enemy.def - eq.penetration);
  const mitigationRatio = effDef / (effDef + rawDmg * 0.5 + 10);
  let effectiveDmg = Math.round(rawDmg * Math.max(0, 1 - mitigationRatio));
  effectiveDmg = Math.max(1, effectiveDmg);

  // 4. Critical Strike & Glitch 2pc
  const totalCritChance = Math.min(0.65, player.critChance + eq.critChance);
  const rollCrit = Math.random() < totalCritChance;
  let finalDmg = effectiveDmg;
  
  if (rollCrit) {
    const mult = player.activeStatusEffects.some(e => e.effect === 'overclockedIII') ? 2.5 : player.critMultiplier;
    finalDmg = Math.round(effectiveDmg * mult);
  }

  // 5. Set triggers & Resource Siphoning
  let statusApplied: string | undefined;
  if (eq.glitchCount >= 4 && Math.random() < 0.25) {
    statusApplied = 'glitchLooped'; // 25% chance to loops enemy
  }

  // Glitch 4pc: Crit siphons +5 Static, +1 Echo
  if (rollCrit && eq.glitchCount >= 4) {
    useGameStore.setState(s => {
      const nextStatic = Math.min(s.resources.staticNoise.capacity, s.resources.staticNoise.amount + 5);
      const nextEcho = Math.min(s.resources.voidEchoes.capacity, s.resources.voidEchoes.amount + 1);
      return {
        resources: {
          ...s.resources,
          staticNoise: { ...s.resources.staticNoise, amount: nextStatic },
          voidEchoes: { ...s.resources.voidEchoes, amount: nextEcho }
        }
      };
    });
  }

  // Quantum 4pc: 30% chance to extract +1 Quantum Foam
  if (eq.quantumCount >= 4 && Math.random() < 0.3) {
    useGameStore.setState(s => {
      const nextFoam = Math.min(s.resources.quantumFoam.capacity, s.resources.quantumFoam.amount + 1);
      return {
        resources: {
          ...s.resources,
          quantumFoam: { ...s.resources.quantumFoam, amount: nextFoam }
        }
      };
    });
  }

  return {
    hit: true,
    damage: finalDmg,
    critical: rollCrit,
    statusApplied,
    combatLog: rollCrit 
      ? `★ CRITICAL! Player hit ${enemy.name} for ${finalDmg} damage.`
      : `HIT: Player hit ${enemy.name} for ${finalDmg} damage.`,
  };
}

export function enemyAttackPlayer(enemy: EnemyStats, player: PlayerStats): CombatResult {
  const eq = getEquipmentStats(player);

  // 1. Hit Chance
  const playerSpeed = player.speed + eq.speed;
  const baseHit = 0.65 + (enemy.speed - playerSpeed) * 0.03;
  const hitChance = Math.min(0.95, Math.max(0.05, baseHit));

  const rollHit = Math.random() < hitChance;
  if (!rollHit) {
    return {
      hit: false,
      damage: 0,
      critical: false,
      combatLog: `MISS: ${enemy.name}'s attack missed the Player.`,
    };
  }

  // OffHand Shield block
  const hasShield = player.equipment.offHand?.id === 'logic_shield';
  if (hasShield && Math.random() < 0.10) {
    return {
      hit: false,
      damage: 0,
      critical: false,
      combatLog: `BLOCK: Player blocked ${enemy.name}'s attack with Logic Shield.`,
    };
  }

  // 2. Raw Damage
  const dmgVariance = Math.floor(Math.random() * 5) - 2;
  let rawDmg = enemy.atk + dmgVariance;
  rawDmg = Math.max(1, rawDmg);

  // 3. Defense mitigation (mainframe set counts here)
  let playerDef = player.baseDefense + eq.defense;
  if (player.activeStatusEffects.some(e => e.effect === 'overheated')) {
    playerDef = Math.max(0, playerDef - 3);
  }
  
  const effDef = Math.max(0, playerDef - enemy.pen);
  const mitigationRatio = effDef / (effDef + rawDmg * 0.5 + 10);
  let effectiveDmg = Math.round(rawDmg * Math.max(0, 1 - mitigationRatio));
  effectiveDmg = Math.max(1, effectiveDmg);

  // 4. Critical Strike
  const rollCrit = Math.random() < enemy.critChance;
  let finalDmg = effectiveDmg;

  if (rollCrit) {
    finalDmg = Math.round(effectiveDmg * 1.5);
  }

  // Status effects
  let statusApplied: string | undefined;
  if (enemy.enemyType === 'apparition') {
    statusApplied = 'nullPoison';
  }

  return {
    hit: true,
    damage: finalDmg,
    critical: rollCrit,
    statusApplied,
    combatLog: rollCrit
      ? `★ CRITICAL! ${enemy.name} hit Player for ${finalDmg} damage.`
      : `HIT: ${enemy.name} hit Player for ${finalDmg} damage.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIAL CLICKABLE PLAYER ATTACKS
// ─────────────────────────────────────────────────────────────────────────────

export interface SpecialAttack {
  id: string;
  name: string;
  description: string;
  cooldownSec: number;
  costDesc: string;
}

export const SPECIAL_ATTACKS: SpecialAttack[] = [
  {
    id: 'defrag_strike',
    name: 'Defrag Strike',
    description: 'Attack +3. Ignores 2 target DEF.',
    cooldownSec: 4,
    costDesc: 'FREE',
  },
  {
    id: 'overclock_pierce',
    name: 'Overclock Pierce',
    description: 'Attack +6, +25% Crit. Mainframe 4pc halves cooldown.',
    cooldownSec: 8,
    costDesc: '5 Watts',
  },
  {
    id: 'buffer_overrun',
    name: 'Buffer Overrun',
    description: 'Deals 2x damage (4x if Foam > 500 & Quantum 4pc active) and blinds.',
    cooldownSec: 15,
    costDesc: 'FREE',
  },
  {
    id: 'emergency_vents',
    name: 'Emergency Vents',
    description: 'Deals standard damage. Vents 15 Thermal Cycles.',
    cooldownSec: 12,
    costDesc: 'FREE',
  },
];

export function executeSpecialAttack(
  attackId: string,
  player: PlayerStats,
  enemy: EnemyStats,
  state: GameState
): { success: boolean; result?: CombatResult; error?: string } {
  const eq = getEquipmentStats(player);

  if (attackId === 'overclock_pierce') {
    if (state.resources.gridWatts.amount < 5) {
      return { success: false, error: 'INSUFFICIENT WATTS (Requires 5W)' };
    }
    // Spend 5 Watts
    useGameStore.setState(s => {
      const nextWatts = Math.max(0, s.resources.gridWatts.amount - 5);
      return {
        resources: {
          ...s.resources,
          gridWatts: { ...s.resources.gridWatts, amount: nextWatts },
        },
      };
    });
  }

  // 1. Hit Chance
  const playerSpeed = player.speed + eq.speed;
  const baseHit = 0.65 + (playerSpeed - enemy.speed) * 0.03 + eq.hitChance;
  let blinded = player.activeStatusEffects.some(e => e.effect === 'dataFragmented') ? -0.25 : 0;
  const hitChance = Math.min(0.95, Math.max(0.05, baseHit + blinded));

  const rollHit = Math.random() < hitChance;
  if (!rollHit) {
    return {
      success: true,
      result: {
        hit: false,
        damage: 0,
        critical: false,
        combatLog: `>> [SKILL] ${SPECIAL_ATTACKS.find(a => a.id === attackId)?.name} MISSED target ${enemy.name}.`,
      },
    };
  }

  // 2. Base Damage
  const dmgVariance = Math.floor(Math.random() * 5) - 2;
  let rawDmg = player.baseAttack + eq.attack + dmgVariance;

  // Set bonus mainframe 4pc
  if (eq.mainframeCount >= 4) {
    const watts = state.resources.gridWatts.amount;
    rawDmg += Math.round(watts * 0.02);
  }

  let finalCritChance = player.critChance + eq.critChance;
  let penetration = eq.penetration;
  let statusApplied: string | undefined;
  let damageMultiplier = 1.0;

  switch (attackId) {
    case 'defrag_strike':
      rawDmg += 3;
      penetration += 2;
      break;

    case 'overclock_pierce':
      rawDmg += 6;
      finalCritChance += 0.25;
      break;

    case 'buffer_overrun':
      damageMultiplier = 2.0;
      if (eq.quantumCount >= 4 && state.resources.quantumFoam.amount > 500) {
        damageMultiplier = 4.0; // Quadruple damage!
      }
      statusApplied = 'dataFragmented'; // Blinds enemy
      break;

    case 'emergency_vents':
      // Vents 15 heat
      useGameStore.setState(s => {
        const nextThermal = Math.max(0, s.resources.thermalCycles.amount - 15);
        return {
          resources: {
            ...s.resources,
            thermalCycles: { ...s.resources.thermalCycles, amount: nextThermal },
          },
        };
      });
      break;
  }

  // 3. Defense mitigation
  const effDef = Math.max(0, enemy.def - penetration);
  const mitigationRatio = effDef / (effDef + rawDmg * 0.5 + 10);
  let effectiveDmg = Math.round(rawDmg * Math.max(0, 1 - mitigationRatio));
  effectiveDmg = Math.max(1, effectiveDmg);

  // Apply multipliers
  effectiveDmg = Math.round(effectiveDmg * damageMultiplier);

  // 4. Critical Strike
  const rollCrit = Math.random() < Math.min(0.65, finalCritChance);
  let finalDmg = effectiveDmg;
  
  if (rollCrit) {
    const mult = player.activeStatusEffects.some(e => e.effect === 'overclockedIII') ? 2.5 : player.critMultiplier;
    finalDmg = Math.round(effectiveDmg * mult);
  }

  // Glitch 4pc siphoning
  if (rollCrit && eq.glitchCount >= 4) {
    useGameStore.setState(s => {
      const nextStatic = Math.min(s.resources.staticNoise.capacity, s.resources.staticNoise.amount + 5);
      const nextEcho = Math.min(s.resources.voidEchoes.capacity, s.resources.voidEchoes.amount + 1);
      return {
        resources: {
          ...s.resources,
          staticNoise: { ...s.resources.staticNoise, amount: nextStatic },
          voidEchoes: { ...s.resources.voidEchoes, amount: nextEcho }
        }
      };
    });
  }

  // Quantum 4pc siphoning
  if (eq.quantumCount >= 4 && Math.random() < 0.3) {
    useGameStore.setState(s => {
      const nextFoam = Math.min(s.resources.quantumFoam.capacity, s.resources.quantumFoam.amount + 1);
      return {
        resources: {
          ...s.resources,
          quantumFoam: { ...s.resources.quantumFoam, amount: nextFoam }
        }
      };
    });
  }

  const name = SPECIAL_ATTACKS.find(a => a.id === attackId)?.name || 'Special Attack';
  const combatLog = rollCrit
    ? `★ [SKILL CRIT] Player executed ${name}! Deals ${finalDmg} damage to ${enemy.name}.`
    : `>> [SKILL] Player executed ${name}! Deals ${finalDmg} damage to ${enemy.name}.`;

  return {
    success: true,
    result: {
      hit: true,
      damage: finalDmg,
      critical: rollCrit,
      statusApplied,
      combatLog,
    },
  };
}
