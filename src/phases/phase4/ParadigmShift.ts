// src/phases/phase4/ParadigmShift.ts

import type { GameState, MetaVariable } from '../../store/types';

const BASE_VARIABLES: Record<Exclude<MetaVariable, 'BOSS_DAMAGE_ARRAY'>, number> = {
  PLAYER_SPEED: 4,
  GRAVITY_CONSTANT: 1.0,
  CRIT_MULTIPLIER: 1.75,
  FOG_RADIUS: 8,
  COST_SCALING_EXPONENT: 1.65,
  ENEMY_HEAL_RATE: 1.0,
  STATIC_PRODUCTION_RATE: 1.0,
};

/**
 * Resolves the active value of a meta variable by applying all active injections
 * in sequence.
 */
export function resolveMetaVariable(state: GameState, variable: Exclude<MetaVariable, 'BOSS_DAMAGE_ARRAY'>): number {
  let value = BASE_VARIABLES[variable];

  // Apply all active injections that target this variable
  state.activeInjections.forEach(inj => {
    if (inj.validatedEffect && inj.validatedEffect.targetVariable === variable) {
      const eff = inj.validatedEffect;
      if (eff.operation === 'SET') {
        value = eff.value;
      } else if (eff.operation === 'ADD') {
        value += eff.value;
      } else if (eff.operation === 'MULTIPLY') {
        value *= eff.value;
      } else if (eff.operation === 'INVERT') {
        value = -value;
      }
    }
  });

  return value;
}

/**
 * Checks if the BOSS_DAMAGE_ARRAY has been inverted.
 */
export function isBossDamageInverted(state: GameState): boolean {
  return state.activeInjections.some(
    inj => inj.validatedEffect && inj.validatedEffect.targetVariable === 'BOSS_DAMAGE_ARRAY' && inj.validatedEffect.operation === 'INVERT'
  );
}
