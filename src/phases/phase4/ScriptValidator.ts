// src/phases/phase4/ScriptValidator.ts

import type { MetaVariable, ValidatedEffect } from '../../store/types';

export interface ParseResult {
  success: boolean;
  effect: ValidatedEffect | null;
  error?: string;
  cost?: number;
  safety?: 'GREEN' | 'YELLOW' | 'RED';
}

const COMPLEXITY_WEIGHTS: Record<MetaVariable, number> = {
  PLAYER_SPEED: 30,
  FOG_RADIUS: 20,
  GRAVITY_CONSTANT: 50,
  CRIT_MULTIPLIER: 60,
  COST_SCALING_EXPONENT: 100,
  ENEMY_HEAL_RATE: 80,
  STATIC_PRODUCTION_RATE: 70,
  BOSS_DAMAGE_ARRAY: 150,
};

const OP_MULTIPLIERS = {
  SET: 1.0,
  ADD: 1.2,
  MULTIPLY: 1.5,
  INVERT: 2.0,
};

const SCOPE_MULTIPLIERS = {
  SESSION: 1.0,
  PERMANENT_FLOOR: 1.5,
  PERMANENT_GLOBAL: 2.0,
};

const BOUNDS_TABLE: Record<
  Exclude<MetaVariable, 'BOSS_DAMAGE_ARRAY'>,
  { min: number; max: number; allowedOps: string[] }
> = {
  PLAYER_SPEED: { min: 1, max: 12, allowedOps: ['SET', 'ADD', 'MULTIPLY'] },
  GRAVITY_CONSTANT: { min: 0.1, max: 2.0, allowedOps: ['SET', 'MULTIPLY'] },
  CRIT_MULTIPLIER: { min: 1.0, max: 4.0, allowedOps: ['SET', 'ADD', 'MULTIPLY'] },
  FOG_RADIUS: { min: 4, max: 20, allowedOps: ['SET', 'ADD'] },
  COST_SCALING_EXPONENT: { min: 1.2, max: 2.5, allowedOps: ['SET', 'MULTIPLY'] },
  ENEMY_HEAL_RATE: { min: -5.0, max: 2.0, allowedOps: ['SET', 'MULTIPLY', 'INVERT'] },
  STATIC_PRODUCTION_RATE: { min: 0.5, max: 10.0, allowedOps: ['SET', 'MULTIPLY'] },
};

export function validateSubScript(scriptText: string, selectedScope: 'SESSION' | 'PERMANENT' | 'GLOBAL' = 'SESSION'): ParseResult {
  const clean = scriptText.trim().replace(/\s+/g, ' ');
  if (!clean) {
    return { success: false, effect: null, error: 'Empty script.' };
  }

  const tokens = clean.split(' ');
  const opToken = tokens[0].toUpperCase();

  if (opToken !== 'SET' && opToken !== 'ADD' && opToken !== 'MULTIPLY' && opToken !== 'INVERT') {
    return { success: false, effect: null, error: `Invalid operation: "${opToken}". Expected SET, ADD, MULTIPLY, or INVERT.` };
  }

  const varToken = tokens[1]?.toUpperCase() as MetaVariable;
  const whitelist: MetaVariable[] = [
    'PLAYER_SPEED', 'GRAVITY_CONSTANT', 'CRIT_MULTIPLIER', 'FOG_RADIUS',
    'COST_SCALING_EXPONENT', 'ENEMY_HEAL_RATE', 'STATIC_PRODUCTION_RATE', 'BOSS_DAMAGE_ARRAY'
  ];

  if (!whitelist.includes(varToken)) {
    return { success: false, effect: null, error: `Unknown variable: "${tokens[1]}".` };
  }

  // 1. INVERT operations
  if (opToken === 'INVERT') {
    if (tokens.length > 2) {
      return { success: false, effect: null, error: 'INVERT operation takes no value argument.' };
    }

    if (varToken !== 'BOSS_DAMAGE_ARRAY' && varToken !== 'ENEMY_HEAL_RATE') {
      return { success: false, effect: null, error: `INVERT operation is not allowed on "${varToken}".` };
    }

    // Determine safety level
    let safety: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (selectedScope === 'PERMANENT') safety = 'YELLOW';
    if (selectedScope === 'GLOBAL') safety = 'RED';

    // Calculate cost
    const baseWeight = COMPLEXITY_WEIGHTS[varToken];
    const opMult = OP_MULTIPLIERS.INVERT;
    const scopeKey = selectedScope === 'SESSION' ? 'SESSION' : selectedScope === 'PERMANENT' ? 'PERMANENT_FLOOR' : 'PERMANENT_GLOBAL';
    const scopeMult = SCOPE_MULTIPLIERS[scopeKey];
    const cost = Math.round(baseWeight * opMult * scopeMult);

    return {
      success: true,
      safety,
      cost,
      effect: {
        targetVariable: varToken,
        operation: 'INVERT',
        value: 0, // Invert has no numerical value
        scopedTo: selectedScope === 'SESSION' ? 'SESSION' : 'PERMANENT',
        safetyLevel: safety,
      },
    };
  }

  // 2. SET, ADD, MULTIPLY operations
  if (varToken === 'BOSS_DAMAGE_ARRAY') {
    return { success: false, effect: null, error: 'BOSS_DAMAGE_ARRAY only supports the INVERT operation.' };
  }

  const connector = tokens[2]?.toUpperCase();
  if (connector !== 'TO' && connector !== 'BY') {
    return { success: false, effect: null, error: 'Expected TO or BY connector (e.g. SET PLAYER_SPEED TO 6).' };
  }

  const valStr = tokens[3];
  if (!valStr) {
    return { success: false, effect: null, error: 'Missing target value.' };
  }

  const val = parseFloat(valStr);
  if (isNaN(val)) {
    return { success: false, effect: null, error: `Invalid numeric value: "${valStr}".` };
  }

  if (tokens.length > 4) {
    return { success: false, effect: null, error: 'Extraneous trailing statements detected.' };
  }

  // Check bounds
  const bounds = BOUNDS_TABLE[varToken];
  if (!bounds.allowedOps.includes(opToken)) {
    return { success: false, effect: null, error: `Operation "${opToken}" is not allowed on "${varToken}".` };
  }

  if (val < bounds.min || val > bounds.max) {
    return { success: false, effect: null, error: `Value ${val} out of bounds for "${varToken}". Allowed range: [${bounds.min}, ${bounds.max}].` };
  }

  // Determine safety level
  let safety: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  if (selectedScope === 'PERMANENT') safety = 'YELLOW';
  if (selectedScope === 'GLOBAL') safety = 'RED';

  // Calculate cost
  const baseWeight = COMPLEXITY_WEIGHTS[varToken];
  const opMult = OP_MULTIPLIERS[opToken as 'SET' | 'ADD' | 'MULTIPLY'];
  const scopeKey = selectedScope === 'SESSION' ? 'SESSION' : selectedScope === 'PERMANENT' ? 'PERMANENT_FLOOR' : 'PERMANENT_GLOBAL';
  const scopeMult = SCOPE_MULTIPLIERS[scopeKey];
  const cost = Math.round(baseWeight * opMult * scopeMult);

  return {
    success: true,
    safety,
    cost,
    effect: {
      targetVariable: varToken,
      operation: opToken as any,
      value: val,
      scopedTo: selectedScope === 'SESSION' ? 'SESSION' : 'PERMANENT',
      safetyLevel: safety,
    },
  };
}
