// src/persistence/db.ts

import Dexie, { type Table } from 'dexie';
import type { GameState } from '../store/types';

export interface SaveSlot {
  id?: number;          // Auto-increment primary key
  slotName: string;     // e.g. "Slot 1", "Quick Save"
  saveVersion: number;  // Schema version at time of save
  timestamp: number;    // Unix ms
  phase: string;        // Snapshot for UI display
  totalPlaytime: number;// Seconds, for display
  state: GameState;     // Full serialized game state
}

export class SubstratumDB extends Dexie {
  saves!: Table<SaveSlot, number>;

  constructor() {
    super('SubstratumDB');

    this.version(1).stores({
      saves: '++id, slotName, timestamp',
    });
  }
}

export const db = new SubstratumDB();
