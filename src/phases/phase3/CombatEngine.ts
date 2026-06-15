// src/phases/phase3/CombatEngine.ts

import type { PlayerStats } from '../../store/types';
import type { EnemyStats } from './enemies/EnemyFactory';

export interface CombatResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  statusApplied?: string;
  combatLog: string;
}

// Helper to sum equipment stats
export function getEquipmentStats(player: PlayerStats) {
  const stats = {
    attack: 0,
    defense: 0,
    penetration: 0,
    critChance: 0,
    speed: 0,
    hitChance: 0,
  };

  const slots = ['head', 'torso', 'hands', 'feet', 'mainHand', 'offHand', 'relic1', 'relic2'] as const;
  for (const slot of slots) {
    const item = player.equipment[slot];
    if (item && item.stats && (item.durability === undefined || item.durability > 0)) {
      const s = item.stats;
      if (s.attackBonus) stats.attack += s.attackBonus;
      if (s.defenseBonus) stats.defense += s.defenseBonus;
      if (s.penetration) stats.penetration += s.penetration;
      if (s.critChanceBonus) stats.critChance += s.critChanceBonus;
    }

    // Special items
    if (item) {
      if (item.id === 'chassis_boots') stats.speed += 1;
      if (item.id === 'data_scope') stats.hitChance += 0.10; // Data scope +10% hit
    }
  }

  return stats;
}

export function playerAttackEnemy(player: PlayerStats, enemy: EnemyStats): CombatResult {
  const eq = getEquipmentStats(player);
  
  // 1. Hit Chance
  // hitChance = clamp(0.05, 0.95, 0.65 + ((attackerSpeed - defenderSpeed) * 0.03))
  const playerSpeed = player.speed + eq.speed;
  const baseHit = 0.65 + (playerSpeed - enemy.speed) * 0.03 + eq.hitChance;
  
  // Status modifiers
  let blinded = player.activeStatusEffects.some(e => e.effect === 'dataFragmented') ? -0.25 : 0; // use fragmented as blind
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

  // 2. Raw Damage
  // rawDamage = attackerBaseAttack + equipmentAttackBonus + uniformInt(-2, 2)
  const dmgVariance = Math.floor(Math.random() * 5) - 2; // -2 to +2
  let rawDmg = player.baseAttack + eq.attack + dmgVariance;

  // Status effects
  const overclocked = player.activeStatusEffects.find(e => e.effect.startsWith('overclocked'));
  if (overclocked) {
    if (overclocked.effect === 'overclockedI') rawDmg = Math.round(rawDmg * 1.2);
    else if (overclocked.effect === 'overclockedII') rawDmg = Math.round(rawDmg * 1.5);
    else if (overclocked.effect === 'overclockedIII') rawDmg = Math.round(rawDmg * 2.0);
  }
  if (player.activeStatusEffects.some(e => e.effect === 'overheated')) {
    rawDmg += 2; // overheated yields +2 ATK
  }

  rawDmg = Math.max(1, rawDmg);

  // 3. Defense mitigation
  // effectiveDefense = max(0, defenderDefense - attackerPenetration)
  const effDef = Math.max(0, enemy.def - eq.penetration);
  // effectiveDamage = rawDamage * max(0, 1 - (defenderDefense / (defenderDefense + rawDamage * 0.5 + 10)))
  const mitigationRatio = effDef / (effDef + rawDmg * 0.5 + 10);
  let effectiveDmg = Math.round(rawDmg * Math.max(0, 1 - mitigationRatio));
  effectiveDmg = Math.max(1, effectiveDmg);

  // 4. Critical Strike
  const totalCritChance = Math.min(0.65, player.critChance + eq.critChance);
  const rollCrit = Math.random() < totalCritChance;
  let finalDmg = effectiveDmg;
  
  if (rollCrit) {
    const mult = player.activeStatusEffects.some(e => e.effect === 'overclockedIII') ? 2.5 : player.critMultiplier;
    finalDmg = Math.round(effectiveDmg * mult);
  }

  return {
    hit: true,
    damage: finalDmg,
    critical: rollCrit,
    combatLog: rollCrit 
      ? `★ CRITICAL! Player hit ${enemy.name} for ${finalDmg} damage (mitigated by ${Math.round(mitigationRatio * 100)}% DEF).`
      : `HIT: Player hit ${enemy.name} for ${finalDmg} damage (mitigated by ${Math.round(mitigationRatio * 100)}% DEF).`,
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

  // Check OffHand shield block
  const hasShield = player.equipment.offHand?.id === 'logic_shield';
  // 10% block chance
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

  // 3. Defense mitigation
  // Player defense is baseDefense + equipment defense. Overheat decreases DEF by 3
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
    finalDmg = Math.round(effectiveDmg * 1.5); // standard 1.5x enemy crit
  }

  // Apply poison on hit for Null-Pointer
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
