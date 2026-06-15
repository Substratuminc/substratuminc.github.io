// src/secrets/SecretManager.ts

import { useGameStore } from '../store/gameStore';
import { eventBus } from '../engine/EventBus';

export function unlockSecret(secretKey: keyof typeof secretsMapping): void {
  const state = useGameStore.getState();
  const secretField = secretsMapping[secretKey];

  if (state.secrets[secretField]) return; // already discovered

  useGameStore.setState(s => ({
    secrets: {
      ...s.secrets,
      [secretField]: true,
    },
  }));

  eventBus.emit('notification', {
    message: `UNLOCKED SECRET: ${secretKey}`,
    type: 'secret',
  });
}

const secretsMapping = {
  'Voice in the Static': 'terminalCommandDiscovered',
  'Moth Vendor': 'hiddenVendorEncountered',
  'Glitch Dimension': 'glitchDimensionAccessed',
  'Data Ghost': 'dataGhostDefeated',
  'Seed Manipulation': 'seedManipulationUsed',
} as const;
