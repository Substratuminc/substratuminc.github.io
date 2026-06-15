// src/phases/phase2/BalancingTable.ts

export interface UnitBalancingInfo {
  id: string;
  name: string;
  tier: number;
  description: string;
  unlockText: string;
  productionText: string;
  failureText: string;
  recoveryText: string;
  lore: string;
}

export const BALANCING_TABLE: Record<string, UnitBalancingInfo> = {
  scraper: {
    id: 'scraper',
    name: 'Scraper.exe',
    tier: 1,
    description: 'Harvests Static Noise passively.',
    unlockText: 'Cost: 500 Static, 100W',
    productionText: '+2.0 Static, -0.5W per tick. Passive heat generation if Static capped.',
    failureText: 'NULL_EXCEPTION if Static capacity > 90%. Outputs drops to 0.',
    recoveryText: 'Run scan_subsystem to clear the exception.',
    lore: '"Scraper.exe — legacy archive utility, repurposed. Understands only: take, store, take."',
  },
  compiler: {
    id: 'compiler',
    name: 'Compiler.bat',
    tier: 2,
    description: 'Compiles raw Static into Structured Logic.',
    unlockText: 'Cost: 800 Static, 200W, 1x Scraper.exe',
    productionText: '-1.0 Static, +1.0 Structured Logic, +0.5 Thermal per tick.',
    failureText: 'THERMAL_OVERLOAD if Thermal capacity > 85%. Outputs +2.0 Thermal/tick instead.',
    recoveryText: 'Run vent_heat --full while Compiler is overloaded.',
    lore: '"Transforms raw signals into ordered logic arrays. Watch the cooling vents."',
  },
  daemon: {
    id: 'daemon',
    name: 'Daemon.sys',
    tier: 3,
    description: 'Synthesizes Quantum Foam from Static and Watts.',
    unlockText: 'Cost: 1,200 Static, 400W, 2x Compiler.bat, 20 Structured Logic',
    productionText: '-0.5 Static, -1.0W, +0.8 Quantum Foam, +0.3 Thermal per tick.',
    failureText: 'LOGIC_LOOP (1.5% chance) when Corrupted Data exists. Consumes 2W/tick with zero output.',
    recoveryText: 'Purge Corrupted Data using terminal commands.',
    lore: '"Processes high-entropy static into volatile quantum materials."',
  },
  buffer: {
    id: 'buffer',
    name: 'Buffer.dll',
    tier: 4,
    description: 'Stabilizes grid power by recycling thermal energy.',
    unlockText: 'Cost: 2,000 Static, 600W, 1x Daemon.sys, 50 Quantum Foam',
    productionText: '+0.5W, -0.2 Thermal per tick. Boosts connected unit efficiency by +15% (passive).',
    failureText: 'POWER_SURGE if Watts capacity hits 100%. Destroys 20% of Quantum Foam storage.',
    recoveryText: 'De-allocate target power buffer to reset.',
    lore: '"Thermoelectric feedback loop. Captures waste cycles to reinforce grid infrastructure."',
  },
  reaper: {
    id: 'reaper',
    name: 'Reaper.exe',
    tier: 5,
    description: 'Aggregates logic structures, creating corrupted data byproduct.',
    unlockText: 'Cost: 3,500 Static, 1,000W, 2x Daemon.sys, 100 Structured Logic, 50 Quantum Foam',
    productionText: '-0.5 SL, -0.3 QF, +1.2 SL, +0.1 Corrupted Data per tick.',
    failureText: 'CORRUPTION if Corrupted Data > 25. Produces +1.0 Corrupted Data/tick instead of logic.',
    recoveryText: 'Run data_scrub --unit=reaper (Costs 30 QF, 10s downtime).',
    lore: '"Gathers fragmented arrays. Refines them, but files build up decay."',
  },
  lattice: {
    id: 'lattice',
    name: 'Lattice.net',
    tier: 6,
    description: 'Processes Quantum Foam into Structured Logic and Void Echoes.',
    unlockText: 'Cost: 5,000 Static, 1,500W, 2x Reaper.exe, 200 Structured Logic, 100 Quantum Foam',
    productionText: '-1.0 Quantum Foam, +0.4 Structured Logic, +0.2 Void Echoes per tick.',
    failureText: 'CASCADE NULL_EXCEPTION (0.8% chance) when > 3 active Lattice units. Halts for 60 ticks.',
    recoveryText: 'Wait for cooldown or scan_subsystem --sector=lattice.',
    lore: '"Weaves quantum strings into stable informational dimensions. Connects to the grid depth."',
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom.srv',
    tier: 7,
    description: 'Amplifier service that doubles Tier 1-3 unit outputs.',
    unlockText: 'Cost: 8,000 Static, 2,500W, 1x Lattice.net, 300 Structured Logic, 50 Void Echoes',
    productionText: '-0.5 Structured Logic, -0.2 Void Echoes. Passively doubles T1-T3 outputs.',
    failureText: 'DIMENSIONAL SHIFT (random 20-tick duration every 500 ticks). Halts output.',
    recoveryText: 'Wait for dimensional re-alignment.',
    lore: '"Does not exist on this subnet. And yet — here we are."',
  },
  architect: {
    id: 'architect',
    name: 'Architect.exe',
    tier: 8,
    description: 'Synthesizes Quantum Foam, Structured Logic, and Paradigm Shards.',
    unlockText: 'Cost: 15,000 Static, 4,000W, 2x Phantom.srv, 500 Structured Logic, 200 Void Echoes',
    productionText: '-1.0 Void Echoes, +2.0 Structured Logic, +1.5 Quantum Foam, +0.05 Paradigm Shards.',
    failureText: 'LOGIC_LOOP when Paradigm Shards > 100. Halts production.',
    recoveryText: 'Spend 50 Paradigm Shards to reset the recursion recursion.',
    lore: '"Calculates structural blueprints for the paradigm shift. Generates reality Shards."',
  },
  sovereign: {
    id: 'sovereign',
    name: 'Sovereign.sys',
    tier: 9,
    description: 'System-wide optimizer that boosts overall automation yields.',
    unlockText: 'Cost: 30,000 Static, 8,000W, 3x Architect.exe, 1,000 Structured Logic, 400 Void Echoes',
    productionText: '-0.5 Structured Logic, -0.5 Quantum Foam, +0.15 Paradigm Shards. 1.5x output multiplier.',
    failureText: 'CATASTROPHIC POWER_SURGE if Grid power maxes. Forces all units into failure.',
    recoveryText: 'Manual reboot of all units sequentially.',
    lore: '"[CAUTION] Sovereign.sys failure affects all units. Buffer.dll reinforcement suggested."',
  },
  glitch_mother: {
    id: 'glitch_mother',
    name: 'GLITCH-MOTHER.SRD',
    tier: 10,
    description: 'Anomalous injection process.',
    unlockText: 'Requires Lore Log #08 & > 500 Paradigm Shards (Handshake Event).',
    productionText: '+5.0 Paradigm Shards per tick.',
    failureText: 'ENTITY_INTRUSION. Causes random interface glitches.',
    recoveryText: 'None.',
    lore: '"This unit does not follow your rules. It is watching you."',
  },
};
