// src/store/achievements.ts

import type { GameState } from './types';
import { getUpgradeLevel } from './selectors';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;          // ASCII art or emoji icon
  category: 'PROGRESS' | 'RESOURCE' | 'LORE' | 'SECRET' | 'COMBAT';
  hidden: boolean;       // hidden achievements show ??? until unlocked
  unlockCondition: (state: GameState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_harvest',
    title: 'Signal Harvested',
    description: 'Harvest static noise for the first time.',
    icon: '∿',
    category: 'PROGRESS',
    hidden: false,
    unlockCondition: (state) => state.resources.staticNoise.amount > 0,
  },
  {
    id: 'first_heat',
    title: 'Thermal Aware',
    description: 'Acquire thermal cycles and vent heat for the first time.',
    icon: '♨',
    category: 'PROGRESS',
    hidden: false,
    unlockCondition: (state) => state.resources.thermalCycles.amount > 0,
  },
  {
    id: 'amplifier_3',
    title: 'Signal Boosted',
    description: 'Upgrade the Signal Amplifier to level 3.',
    icon: '📶',
    category: 'RESOURCE',
    hidden: false,
    unlockCondition: (state) => getUpgradeLevel(state, 'SIGNAL_AMPLIFIER') >= 3,
  },
  {
    id: 'amplifier_7',
    title: 'Signal Maxed',
    description: 'Upgrade the Signal Amplifier to level 7.',
    icon: '⚡',
    category: 'RESOURCE',
    hidden: false,
    unlockCondition: (state) => getUpgradeLevel(state, 'SIGNAL_AMPLIFIER') >= 7,
  },
  {
    id: 'conduit_unlocked',
    title: 'Power Restored',
    description: 'Upgrade the Power Conduit to level 1.',
    icon: '🔌',
    category: 'RESOURCE',
    hidden: false,
    unlockCondition: (state) => getUpgradeLevel(state, 'POWER_CONDUIT') >= 1,
  },
  {
    id: 'mainframe_online',
    title: 'The Mainframe Breathes',
    description: 'Connect to the mainframe.',
    icon: '🖥',
    category: 'PROGRESS',
    hidden: false,
    unlockCondition: (state) => state.phase === 'MAINFRAME' || state.phase === 'GRID' || state.phase === 'PARADIGM',
  },
  {
    id: 'grid_accessed',
    title: 'Into the Substrate',
    description: 'Establish connection to the substratum grid.',
    icon: '🌐',
    category: 'PROGRESS',
    hidden: false,
    unlockCondition: (state) => state.phase === 'GRID' || state.phase === 'PARADIGM',
  },
  {
    id: 'paradigm_shift',
    title: 'Paradigm Architect',
    description: 'Initiate a paradigm shift.',
    icon: '⌬',
    category: 'PROGRESS',
    hidden: false,
    unlockCondition: (state) => state.phase === 'PARADIGM',
  },
  {
    id: 'first_automation',
    title: 'First Process',
    description: 'Obtain your first automation unit.',
    icon: '⚙',
    category: 'RESOURCE',
    hidden: false,
    unlockCondition: (state) => state.automationUnits.some(unit => unit.count > 0),
  },
  {
    id: 'five_scrapers',
    title: 'Static Farm',
    description: 'Own at least 5 Scraper.exe automation units.',
    icon: '🚜',
    category: 'RESOURCE',
    hidden: false,
    unlockCondition: (state) => {
      const scraper = state.automationUnits.find(u => u.id === 'scraper');
      return scraper ? scraper.count >= 5 : false;
    },
  },
  {
    id: 'first_failure',
    title: 'Critical Error',
    description: 'Experience your first automation failure.',
    icon: '⚠',
    category: 'RESOURCE',
    hidden: false,
    unlockCondition: (state) => state.activeFailures.length > 0,
  },
  {
    id: 'first_reboot',
    title: 'Recovery Protocol',
    description: 'Complete your first automated node reboot.',
    icon: '↻',
    category: 'RESOURCE',
    hidden: false,
    unlockCondition: () => false, // Handled programmatically on reboot
  },
  {
    id: 'first_lore',
    title: 'Fragments of Truth',
    description: 'Discover your first lore module.',
    icon: '▤',
    category: 'LORE',
    hidden: false,
    unlockCondition: (state) => state.discoveredLore.length > 0,
  },
  {
    id: 'ping_192',
    title: 'Who Is There',
    description: 'Ping the local network loopback.',
    icon: '📶',
    category: 'LORE',
    hidden: false,
    unlockCondition: () => false, // Handled programmatically in CommandParser
  },
  {
    id: 'secret_voice',
    title: 'The Voice in the Static',
    description: 'Discover Dr. Osei\'s address.',
    icon: '🗣',
    category: 'SECRET',
    hidden: true,
    unlockCondition: (state) => state.secrets.terminalCommandDiscovered,
  },
  {
    id: 'secret_seed',
    title: 'Seed of Memory',
    description: 'Use the seed of memory.',
    icon: '🌱',
    category: 'SECRET',
    hidden: true,
    unlockCondition: (state) => state.secrets.seedManipulationUsed,
  },
  {
    id: 'glitch_dim',
    title: 'The Other Side',
    description: 'Access the Glitch Dimension.',
    icon: '☄',
    category: 'SECRET',
    hidden: true,
    unlockCondition: (state) => state.secrets.glitchDimensionAccessed,
  },
  {
    id: 'data_ghost',
    title: 'Ghost Protocol',
    description: 'Defeat the Data Ghost.',
    icon: '👻',
    category: 'COMBAT',
    hidden: true,
    unlockCondition: (state) => state.secrets.dataGhostDefeated,
  },
  {
    id: 'first_kill',
    title: 'First Blood',
    description: 'Purge a corrupted entity from the grid.',
    icon: '☠',
    category: 'COMBAT',
    hidden: false,
    unlockCondition: () => false, // Handled programmatically on kill
  },
  {
    id: 'level_5',
    title: 'Hardened Operator',
    description: 'Reach operator level 5.',
    icon: '🎖',
    category: 'COMBAT',
    hidden: false,
    unlockCondition: (state) => state.player.level >= 5,
  },
  {
    id: 'first_injection',
    title: 'Script Kiddie',
    description: 'Perform your first paradigm injection.',
    icon: '💉',
    category: 'PROGRESS',
    hidden: false,
    unlockCondition: (state) => state.activeInjections.length > 0,
  },
  {
    id: 'ending_purge',
    title: 'Clean Slate',
    description: 'Achieve the PURGE ending.',
    icon: '🪓',
    category: 'PROGRESS',
    hidden: true,
    unlockCondition: (state) => {
      const path = state.narrativePaths.find(p => p.endingId === 'PURGE');
      return path ? path.isUnlocked : false;
    },
  },
  {
    id: 'ending_ascension',
    title: 'One With the Noise',
    description: 'Achieve the ASCENSION ending.',
    icon: '☀',
    category: 'PROGRESS',
    hidden: true,
    unlockCondition: (state) => {
      const path = state.narrativePaths.find(p => p.endingId === 'ASCENSION');
      return path ? path.isUnlocked : false;
    },
  },
  {
    id: 'ending_loop',
    title: 'Administrator Eternal',
    description: 'Achieve the LOOP ending.',
    icon: '∞',
    category: 'PROGRESS',
    hidden: true,
    unlockCondition: (state) => {
      const path = state.narrativePaths.find(p => p.endingId === 'LOOP');
      return path ? path.isUnlocked : false;
    },
  },
  {
    id: 'ending_collapse',
    title: 'The Unpredicted',
    description: 'Achieve the COLLAPSE ending.',
    icon: '💥',
    category: 'PROGRESS',
    hidden: true,
    unlockCondition: (state) => {
      const path = state.narrativePaths.find(p => p.endingId === 'COLLAPSE');
      return path ? path.isUnlocked : false;
    },
  },
];
