// src/store/types.ts

export type GamePhase = 'TERMINAL' | 'MAINFRAME' | 'GRID' | 'PARADIGM';

export type ResourceKey =
  | 'staticNoise'
  | 'thermalCycles'
  | 'gridWatts'
  | 'quantumFoam'
  | 'structuredLogic'
  | 'corruptedData'
  | 'voidEchoes'
  | 'paradigmShards';

export type StatusEffect =
  | 'overheated'
  | 'nullPoison'
  | 'glitchLooped'
  | 'dataFragmented'
  | 'overclockedI'
  | 'overclockedII'
  | 'overclockedIII'
  | 'blessed_by_glitch';

export interface Resource {
  amount: number;
  capacity: number;           // Hard cap on storage
  productionPerTick: number;  // Calculated each tick
  consumptionPerTick: number; // Calculated each tick
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: 'weapon' | 'armor' | 'consumable' | 'key' | 'lore' | 'relic';
  quantity: number;
  durability?: number;        // undefined = indestructible
  maxDurability?: number;
  stats?: ItemStats;
  flags: ItemFlag[];
}

export interface ItemStats {
  attackBonus?: number;
  defenseBonus?: number;
  penetration?: number;
  critChanceBonus?: number;
  statusOnHit?: StatusEffect;
  statusChance?: number;
}

export type ItemFlag =
  | 'LEGENDARY'
  | 'CURSED'
  | 'GLITCH_TAINTED'
  | 'VENDOR_EXCLUSIVE'
  | 'SECRET_ORIGIN';

export interface EquipmentSlots {
  head: InventoryItem | null;
  torso: InventoryItem | null;
  hands: InventoryItem | null;
  feet: InventoryItem | null;
  mainHand: InventoryItem | null;
  offHand: InventoryItem | null;
  relic1: InventoryItem | null;
  relic2: InventoryItem | null;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  baseAttack: number;
  baseDefense: number;
  basePenetration: number;
  critChance: number;         // 0.0–1.0
  critMultiplier: number;     // e.g. 2.0 = 200% damage
  speed: number;              // Turn order in combat
  level: number;
  experience: number;
  experienceToNextLevel: number;
  activeStatusEffects: ActiveStatusEffect[];
  equipment: EquipmentSlots;
  inventory: InventoryItem[];
  maxInventorySlots: number;
}

export interface ActiveStatusEffect {
  effect: StatusEffect;
  remainingTicks: number;
  magnitude: number;
  sourceId?: string;
}

export interface AutomationUnit {
  id: string;
  name: string;               // e.g. "Scraper.exe"
  tier: number;               // 1–10
  count: number;              // How many the player owns
  isActive: boolean;
  productionTable: Record<ResourceKey, number>; // per-unit-per-tick output
  consumptionTable: Record<ResourceKey, number>;
  failureState: AutomationFailureState | null;
  failureCooldownTicks: number;
  unlockCost: Record<ResourceKey, number>;
  purchaseCost: Record<ResourceKey, number>;
}

export interface AutomationFailureState {
  type: 'THERMAL_OVERLOAD' | 'NULL_EXCEPTION' | 'LOGIC_LOOP' | 'POWER_SURGE' | 'CORRUPTION';
  description: string;
  effectOnProduction: number; // multiplier, e.g. 0 = total shutdown
  recoveryAction: 'VENT_HEAT' | 'REBOOT' | 'PURGE_LOOP' | 'SURGE_SUPPRESS' | 'DATA_SCRUB';
  recoveryThreshold: number;  // Resource amount required to fix
}

export interface GridCell {
  x: number;
  y: number;
  glyph: string;
  fg: string;                 // Hex color
  bg: string;
  passable: boolean;
  visible: boolean;
  explored: boolean;
  entityId?: string;
  itemId?: string;
  featureId?: string;
  isGlitchTile?: boolean;     // Phase 4 / secret dimension tiles
}

export interface GridMap {
  width: number;
  height: number;
  depth: number;              // Dungeon floor number
  seed: number;
  cells: Record<string, GridCell>; // serialized version of Map since Map doesn't serialize nicely to JSON
  playerStart: { x: number; y: number };
  exits: Array<{ x: number; y: number; targetDepth: number }>;
  specialRooms: SpecialRoom[];
}

export interface SpecialRoom {
  id: string;
  type: 'VENDOR' | 'LORE_CACHE' | 'BOSS' | 'ANOMALY' | 'GLITCH_PORTAL';
  bounds: { x: number; y: number; w: number; h: number };
  triggered: boolean;
}

export interface PlayerGridState {
  x: number;
  y: number;
  facing: 'N' | 'S' | 'E' | 'W';
  fovRadius: number;
  actionPoints: number;
  maxActionPoints: number;
}

export interface MetaInjection {
  id: string;
  scriptFragment: string;         // The raw script text the player typed
  validatedEffect: ValidatedEffect | null;
  applicationCount: number;
  maxApplications: number;
  energyCost: number;             // In paradigmShards
}

export interface ValidatedEffect {
  targetVariable: MetaVariable;
  operation: 'SET' | 'MULTIPLY' | 'ADD' | 'INVERT';
  value: number;
  scopedTo: 'SESSION' | 'PERMANENT';
  safetyLevel: 'GREEN' | 'YELLOW' | 'RED';   // RED requires confirmation
}

export type MetaVariable =
  | 'PLAYER_SPEED'
  | 'ENEMY_HEAL_RATE'
  | 'GRAVITY_CONSTANT'
  | 'CRIT_MULTIPLIER'
  | 'COST_SCALING_EXPONENT'
  | 'FOG_RADIUS'
  | 'STATIC_PRODUCTION_RATE'
  | 'BOSS_DAMAGE_ARRAY';

export interface DiscoveredLoreModule {
  id: string;
  title: string;
  body: string;                   // Full text of the log entry
  discoveredAtPhase: GamePhase;
  discoveredTimestamp: number;    // Unix ms
  isRead: boolean;
  narrativeWeight: number;        // 1–5, influences ending unlock
}

export interface NarrativePath {
  endingId: 'PURGE' | 'ASCENSION' | 'LOOP' | 'COLLAPSE';
  currentWeight: number;          // Accumulates via player choices
  thresholdRequired: number;      // Weight to unlock this ending
  isUnlocked: boolean;
}

export interface SecretsState {
  terminalCommandDiscovered: boolean;   // SECRET_01
  hiddenVendorEncountered: boolean;     // SECRET_02
  glitchDimensionAccessed: boolean;     // SECRET_03
  dataGhostDefeated: boolean;           // SECRET_04
  seedManipulationUsed: boolean;        // SECRET_05
  overheatTimer: number;                // Seconds spent overheated (for SECRET_02 trigger)
  hiddenFragmentsFound: string[];       // IDs of code fragments found (for SECRET_01)
}

export interface GameState {
  // Meta
  version: number;               // Save schema version (increments on migration)
  phase: GamePhase;
  totalRealTimeSeconds: number;  // Tracks real play time
  tickCount: number;             // Total game ticks elapsed
  sessionStartTime: number;

  // Resources
  resources: Record<ResourceKey, Resource>;
  powerAllocation: Record<string, number>;


  // Player
  player: PlayerStats;
  playerGrid: PlayerGridState;

  // Automation
  automationUnits: AutomationUnit[];
  automationUnlocked: boolean;
  activeFailures: AutomationFailureState[];

  // Grid / Roguelike
  currentMap: GridMap | null;
  visitedMapSeeds: number[];     // Prevent re-generating already-seen floors
  enemyDatabase: Record<string, any>;
  highestDepthReached: number;
  unlockedMilestones: string[];
  autoExploreActive: boolean;
  standby: boolean;

  // Meta / Phase 4
  injectionTerminalUnlocked: boolean;
  activeInjections: MetaInjection[];
  paradigmShardPool: number;

  // Lore & Narrative
  discoveredLore: DiscoveredLoreModule[];
  narrativePaths: NarrativePath[];

  // Secrets
  secrets: SecretsState;

  // Achievements
  unlockedAchievements: string[];

  // Terminal History (Phase 1)
  terminalHistory: string[];
  commandQueue: string[];

  // Settings (not persisted in same slot, but part of runtime state)
  settings: {
    masterVolume: number;
    sfxVolume: number;
    ambientVolume: number;
    textSpeed: 'SLOW' | 'MEDIUM' | 'FAST' | 'INSTANT';
    colorblindMode: boolean;
    showTooltips: boolean;
  };
}
