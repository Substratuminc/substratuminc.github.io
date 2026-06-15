// src/persistence/migrations/v2_to_v3.ts

import type { GameState } from '../../store/types';

export function v2_to_v3(state: Partial<GameState>): Partial<GameState> {
  return {
    ...state,
    version: 3,
  };
}
