// src/lore/NarrativeEngine.ts

import { useGameStore } from '../store/gameStore';
import type { GameState, NarrativePath } from '../store/types';

/**
 * Adds weight to a specific ending and checks if it crosses the unlock threshold.
 */
export function addNarrativeWeight(
  endingId: 'PURGE' | 'ASCENSION' | 'LOOP' | 'COLLAPSE',
  amount: number
): void {
  useGameStore.setState(state => {
    const nextPaths = state.narrativePaths.map((path): NarrativePath => {
      if (path.endingId === endingId) {
        const nextWeight = path.currentWeight + amount;
        const isUnlocked = nextWeight >= path.thresholdRequired;
        return {
          ...path,
          currentWeight: nextWeight,
          isUnlocked,
        };
      }
      return path;
    });

    return { narrativePaths: nextPaths };
  });
}

/**
 * Scans the current state and returns all endings that have crossed their threshold.
 */
export function getUnlockedEndings(state: GameState): string[] {
  return state.narrativePaths
    .filter(p => p.isUnlocked)
    .map(p => p.endingId);
}
