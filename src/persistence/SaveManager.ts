// src/persistence/SaveManager.ts

import LZString from 'lz-string';
import { db } from './db';
import type { GameState } from '../store/types';
import { CURRENT_SAVE_VERSION } from '../store/constants';
import { migrateState } from './MigrationEngine';

const AUTO_SAVE_SLOT = 'auto';
const AUTO_SAVE_INTERVAL_MS = 30_000;   // Every 30 seconds
const LS_KEY_PREFIX = 'substratum_save_'; // localStorage key prefix

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function lsKey(slotName: string): string {
  return `${LS_KEY_PREFIX}${slotName}`;
}

function writeLocalStorageMirror(slotName: string, state: GameState): void {
  try {
    // Compress before writing to stay within the ~5MB localStorage quota
    const compressed = LZString.compressToUTF16(JSON.stringify(state));
    localStorage.setItem(lsKey(slotName), compressed);
  } catch (e) {
    // localStorage can throw if storage is full or in a restricted context
    console.warn('[SaveManager] localStorage mirror write failed:', e);
  }
}

function readLocalStorageMirror(slotName: string): GameState | null {
  try {
    const raw = localStorage.getItem(lsKey(slotName));
    if (!raw) return null;
    const decompressed = LZString.decompressFromUTF16(raw);
    if (!decompressed) return null;
    return JSON.parse(decompressed) as GameState;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE MANAGER CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class SaveManager {
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  // ── Auto-save ──────────────────────────────────────────────────────────────

  public startAutoSave(getState: () => GameState): void {
    if (this.autoSaveTimer) return;
    this.autoSaveTimer = setInterval(async () => {
      await this.save(AUTO_SAVE_SLOT, getState());
    }, AUTO_SAVE_INTERVAL_MS);
  }

  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // ── Primary save (IndexedDB) + localStorage mirror ─────────────────────────

  public async save(slotName: string, state: GameState): Promise<void> {
    const record = {
      slotName,
      saveVersion: CURRENT_SAVE_VERSION,
      timestamp: Date.now(),
      phase: state.phase,
      totalPlaytime: state.totalRealTimeSeconds,
      state,
    };

    // Write to IndexedDB (primary)
    const existing = await db.saves.where('slotName').equals(slotName).first();
    if (existing?.id != null) {
      await db.saves.update(existing.id, record);
    } else {
      await db.saves.add(record);
    }

    // Write to localStorage (mirror — runs fire-and-forget, never blocks)
    writeLocalStorageMirror(slotName, state);
  }

  // ── Load with automatic fallback chain ─────────────────────────────────────
  //
  // Strategy:
  //   1. Try IndexedDB first (most reliable).
  //   2. If IndexedDB is empty (cache cleared), fall back to localStorage mirror.
  //   3. Apply migration to whatever we find.
  //   4. If both are empty, return null (fresh start).

  public async load(slotName: string): Promise<GameState | null> {
    // Attempt 1: IndexedDB
    const slot = await db.saves.where('slotName').equals(slotName).first();
    if (slot) {
      return migrateState(slot.state, slot.saveVersion, CURRENT_SAVE_VERSION);
    }

    // Attempt 2: localStorage mirror
    const mirror = readLocalStorageMirror(slotName);
    if (mirror) {
      console.info('[SaveManager] IndexedDB empty — restoring from localStorage mirror.');
      // Re-persist to IndexedDB so the primary is warm again
      await this.save(slotName, mirror);
      return migrateState(mirror, mirror.version ?? 1, CURRENT_SAVE_VERSION);
    }

    return null;
  }

  public async listSaves(): Promise<any[]> {
    const slots = await db.saves.toArray();
    return slots.map(({ state: _state, ...meta }) => meta);
  }

  public async deleteSave(slotName: string): Promise<void> {
    await db.saves.where('slotName').equals(slotName).delete();
    localStorage.removeItem(lsKey(slotName));
  }

  // ── Portable Export / Import (Save Codes) ──────────────────────────────────
  //
  // Export produces a short-ish base64url string (lz-string compressed JSON).
  // The player copies it out of the terminal and pastes it back later.
  // This is the ONLY save mechanism that survives a full browser data wipe
  // or a device change. Framed in-game as "exfiltrating your operator profile."

  public exportSaveCode(state: GameState): string {
    const payload = JSON.stringify({
      v: CURRENT_SAVE_VERSION,
      ts: Date.now(),
      s: state,
    });
    // compressToEncodedURIComponent produces URL-safe base64 — safe to copy/paste
    return LZString.compressToEncodedURIComponent(payload);
  }

  public importSaveCode(code: string): GameState | null {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(code);
      if (!decompressed) throw new Error('Decompression returned null');
      const parsed = JSON.parse(decompressed) as { v: number; ts: number; s: GameState };
      if (!parsed.s || typeof parsed.v !== 'number') throw new Error('Invalid payload shape');
      return migrateState(parsed.s, parsed.v, CURRENT_SAVE_VERSION);
    } catch (e) {
      console.error('[SaveManager] importSaveCode failed:', e);
      return null; // Caller must show the player an error message
    }
  }
}

export const saveManager = new SaveManager();
