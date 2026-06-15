// src/persistence/MigrationEngine.ts

import type { GameState } from '../store/types';
import { createDefaultGameState } from '../store/gameStore';
import { v1_to_v2 } from './migrations/v1_to_v2';
import { v2_to_v3 } from './migrations/v2_to_v3';

type MigrationFn = (state: Partial<GameState>) => Partial<GameState>;

const MIGRATIONS: Record<number, MigrationFn> = {
  1: v1_to_v2,
  2: v2_to_v3,
};

/**
 * Deep merges `partial` into `base`, where `partial` overrides `base` for
 * existing keys, and `base` provides defaults for any missing keys in `partial`.
 * This is NOT a shallow merge — it recurses through nested objects.
 */
function deepMerge<T extends object>(base: T, partial: Partial<T>): T {
  const result = { ...base };
  for (const key in partial) {
    const bVal = base[key];
    const pVal = partial[key];
    if (
      pVal !== undefined &&
      pVal !== null &&
      typeof pVal === 'object' &&
      !Array.isArray(pVal) &&
      typeof bVal === 'object' &&
      bVal !== null &&
      !Array.isArray(bVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        bVal as object,
        pVal as Partial<object>
      );
    } else if (pVal !== undefined) {
      (result as Record<string, unknown>)[key] = pVal;
    }
  }
  return result;
}

export function migrateState(
  savedState: GameState,
  fromVersion: number,
  toVersion: number
): GameState {
  let state: Partial<GameState> = savedState;

  // Apply each migration function sequentially
  for (let v = fromVersion; v < toVersion; v++) {
    const migrationFn = MIGRATIONS[v];
    if (migrationFn) {
      state = migrationFn(state);
    }
  }

  // Final deep merge against fresh default state ensures all new keys are present
  const defaultState = createDefaultGameState();
  return deepMerge(defaultState, state as GameState);
}
