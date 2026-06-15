// src/persistence/migrations/v1_to_v2.ts

import type { GameState } from '../../store/types';

export function v1_to_v2(state: Partial<GameState>): Partial<GameState> {
  return {
    ...state,
    version: 2,
    resources: {
      ...state.resources,
      structuredLogic: (state.resources as Record<string, any>)?.dataPoints
        ? { amount: ((state.resources as Record<string, any>).dataPoints as { amount: number }).amount, capacity: 50, productionPerTick: 0, consumptionPerTick: 0 }
        : state.resources?.structuredLogic,
    } as GameState['resources'],
  };
}
