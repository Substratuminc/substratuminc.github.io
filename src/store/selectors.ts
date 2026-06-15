// src/store/selectors.ts

import type { GameState, ResourceKey } from './types';

export interface ProductionRate {
  produced: number;
  consumed: number;
}

export function computeResourceProduction(state: GameState): Record<ResourceKey, ProductionRate> {
  const result: Record<ResourceKey, ProductionRate> = {
    staticNoise: { produced: 0, consumed: 0 },
    thermalCycles: { produced: 0, consumed: 0 },
    gridWatts: { produced: 0, consumed: 0 },
    quantumFoam: { produced: 0, consumed: 0 },
    structuredLogic: { produced: 0, consumed: 0 },
    corruptedData: { produced: 0, consumed: 0 },
    voidEchoes: { produced: 0, consumed: 0 },
    paradigmShards: { produced: 0, consumed: 0 },
  };

  // 1. INFRASTRUCTURE LEVEL PASSIVE GENERATION
  // Signal Amplifier level (level >= 1)
  const ampLevel = getUpgradeLevel(state, 'SIGNAL_AMPLIFIER');
  if (ampLevel > 0) {
    result.staticNoise.produced += 0.8 * Math.pow(1.5, ampLevel - 1);
  }

  // Thermal Duct level (level >= 1) - auto-vents heat
  const ductLevel = getUpgradeLevel(state, 'THERMAL_DUCT');
  if (ductLevel > 0) {
    result.thermalCycles.consumed += ductLevel * 0.5;
  }

  // Power Conduit level - trickle power recovery
  const conduitLevel = getUpgradeLevel(state, 'POWER_CONDUIT');
  if (conduitLevel > 0) {
    result.gridWatts.produced += (3 + conduitLevel * (conduitLevel - 1) / 2) / 20;
  } else {
    result.gridWatts.produced = 0;
  }

  // 2. META INJECTIONS
  // Check if STATIC_PRODUCTION_RATE is modified by injection
  let staticRateMultiplier = 1.0;
  const staticRateInjection = state.activeInjections.find(
    inj => inj.validatedEffect?.targetVariable === 'STATIC_PRODUCTION_RATE'
  );
  if (staticRateInjection && staticRateInjection.validatedEffect) {
    const eff = staticRateInjection.validatedEffect;
    if (eff.operation === 'SET') staticRateMultiplier = eff.value;
    else if (eff.operation === 'MULTIPLY') staticRateMultiplier *= eff.value;
    else if (eff.operation === 'ADD') staticRateMultiplier += eff.value;
  }

  // Apply staticRateMultiplier to passive static noise production
  result.staticNoise.produced *= staticRateMultiplier;

  // 3. AUTOMATION UNITS
  // Find multipliers first
  let phantomCount = 0;
  let sovereignCount = 0;
  let glitchMotherActive = false;

  for (const unit of state.automationUnits) {
    if (unit.isActive && unit.count > 0 && !unit.failureState) {
      if (unit.id === 'phantom') {
        phantomCount += unit.count;
      } else if (unit.id === 'sovereign') {
        sovereignCount += unit.count;
      } else if (unit.id === 'glitch_mother') {
        glitchMotherActive = true;
      }
    }
  }

  const highestDepth = state.highestDepthReached ?? 1;
  const depthSpeedMultiplier = highestDepth >= 3 ? 1.10 : 1.0;

  const t13Multiplier = phantomCount > 0 ? Math.pow(2, phantomCount) : 1.0;
  const globalMultiplier = sovereignCount > 0 ? Math.pow(1.5, sovereignCount) : 1.0;

  for (const unit of state.automationUnits) {
    if (unit.count <= 0 || !unit.isActive) continue;

    // Handle unit count and check failure status
    let activeCount = unit.count;
    let failureMult = 1.0;

    if (unit.failureState) {
      failureMult = unit.failureState.effectOnProduction;
      // Some units halt completely
      if (failureMult === 0) activeCount = 0;
    }

    // Tier multipliers
    let tierMultiplier = globalMultiplier * depthSpeedMultiplier;
    if (unit.tier <= 3) {
      tierMultiplier *= t13Multiplier;
    }

    // Specific unit production/consumption logic
    if (unit.id === 'scraper') {
      // Scraper: +2.0 Static, -0.5W
      // If Static is capped, generates +0.1 Thermal per unit passively instead
      const isStaticCapped = state.resources.staticNoise.amount >= state.resources.staticNoise.capacity;
      if (isStaticCapped) {
        result.thermalCycles.produced += activeCount * 0.1 * tierMultiplier;
      } else {
        result.staticNoise.produced += activeCount * 2.0 * tierMultiplier * staticRateMultiplier;
      }
      result.gridWatts.consumed += activeCount * 0.1 * tierMultiplier;

    } else if (unit.id === 'compiler') {
      if (unit.failureState?.type === 'THERMAL_OVERLOAD') {
        // Compiler halts completely AND produces +2.0 Thermal per tick instead of consuming Static
        result.thermalCycles.produced += unit.count * 2.0;
      } else {
        // Normal: -1.0 Static, +1.0 Structured Logic, +0.5 Thermal
        result.staticNoise.consumed += activeCount * 1.0 * tierMultiplier;
        result.structuredLogic.produced += activeCount * 1.0 * tierMultiplier;
        result.thermalCycles.produced += activeCount * 0.5 * tierMultiplier;
      }

    } else if (unit.id === 'daemon') {
      if (unit.failureState?.type === 'LOGIC_LOOP') {
        // Consumes 0.4W/tick with zero output (double normal consumption)
        result.gridWatts.consumed += unit.count * 0.4;
      } else {
        // Normal: -0.5 Static, -0.2W, +0.8 QF, +0.3 Thermal
        result.staticNoise.consumed += activeCount * 0.5 * tierMultiplier;
        result.gridWatts.consumed += activeCount * 0.2 * tierMultiplier;
        result.quantumFoam.produced += activeCount * 0.8 * tierMultiplier;
        result.thermalCycles.produced += activeCount * 0.3 * tierMultiplier;
      }

    } else if (unit.id === 'buffer') {
      // Buffer: +0.5W, -0.2 Thermal (consumes Thermal, produces W)
      result.gridWatts.produced += activeCount * 0.5 * tierMultiplier;
      result.thermalCycles.consumed += activeCount * 0.2 * tierMultiplier;

    } else if (unit.id === 'reaper') {
      // Reaper: -0.5 SL, -0.3 QF, +1.2 SL, +0.1 CD
      // If corrupted, produces +1.0 CD/tick instead of SL
      if (unit.failureState?.type === 'CORRUPTION') {
        result.corruptedData.produced += unit.count * 1.0;
      } else {
        result.structuredLogic.consumed += activeCount * 0.5 * tierMultiplier;
        result.quantumFoam.consumed += activeCount * 0.3 * tierMultiplier;
        result.structuredLogic.produced += activeCount * 1.2 * tierMultiplier;
        result.corruptedData.produced += activeCount * 0.01 * tierMultiplier;
      }

    } else if (unit.id === 'lattice') {
      // Lattice: -1.0 QF, +0.4 SL, +0.2 Void Echoes
      result.quantumFoam.consumed += activeCount * 1.0 * tierMultiplier;
      result.structuredLogic.produced += activeCount * 0.4 * tierMultiplier;
      result.voidEchoes.produced += activeCount * 0.2 * tierMultiplier;

    } else if (unit.id === 'phantom') {
      // Phantom: -0.5 SL, -0.2 VE
      result.structuredLogic.consumed += activeCount * 0.5 * tierMultiplier;
      result.voidEchoes.consumed += activeCount * 0.2 * tierMultiplier;

    } else if (unit.id === 'architect') {
      if (unit.failureState?.type === 'LOGIC_LOOP') {
        // Halts
      } else {
        // Architect: -1.0 VE, +2.0 SL, +1.5 QF, +0.05 PS
        result.voidEchoes.consumed += activeCount * 1.0 * tierMultiplier;
        result.structuredLogic.produced += activeCount * 2.0 * tierMultiplier;
        result.quantumFoam.produced += activeCount * 1.5 * tierMultiplier;
        result.paradigmShards.produced += activeCount * 0.05 * tierMultiplier;
      }

    } else if (unit.id === 'sovereign') {
      // Sovereign: -0.5 SL, -0.5 QF, +0.15 PS
      result.structuredLogic.consumed += activeCount * 0.5 * tierMultiplier;
      result.quantumFoam.consumed += activeCount * 0.5 * tierMultiplier;
      result.paradigmShards.produced += activeCount * 0.15 * tierMultiplier;
    }
  }

  // Glitch Mother integration unit (if accepted/active)
  if (glitchMotherActive) {
    result.paradigmShards.produced += 5.0;
  }

  // 4. PLAYER STATUS EFFECTS RESOURCE CHANGES
  // overclockedI: +1 Thermal/tick
  // overclockedII: +3 Thermal/tick
  // overclockedIII: +2 HP drain/tick (handled in Tick.ts)
  const playerEffects = state.player.activeStatusEffects;
  for (const eff of playerEffects) {
    if (eff.effect === 'overclockedI') {
      result.thermalCycles.produced += 1.0;
    } else if (eff.effect === 'overclockedII') {
      result.thermalCycles.produced += 3.0;
    }
  }

  return result;
}

// Helper to extract upgrade level from infrastructure command logic
export function getUpgradeLevel(state: GameState, upgradeId: string): number {
  if (upgradeId === 'SIGNAL_AMPLIFIER') {
    // Find Signal Amplifier level by checking current capacity bonuses or store variables
    // In our terminal state, we'll store upgrade levels. Let's make sure we track them.
    // Wait, where are levels stored? In state.resources.staticNoise.capacity we can deduce it,
    // or let's store infrastructure levels directly in our gameStore state!
    // Let's add a list of infrastructure upgrade levels in the Zustand store.
    // Let's check where they are tracked.
    // Ah, in types.ts they weren't explicitly in the fields of GameState except under resources capacity formulas.
    // Wait! Let's add an explicit `infrastructure` field to GameState or keep them as part of resources.
    // Wait, the formulas in Section 2.1.3:
    //   Static Noise cap: 250 + (amplifier_level * 150) + (conduit_level * 50)
    //   Thermal Cycles cap: 100 + (duct_level * 25)
    //   Grid Watts cap: 500 + (conduit_level * 200)
    // We can just add an `infrastructure` field to GameState:
    //   `infrastructure: { signalAmp: number, thermalDuct: number, powerConduit: number }`
    // Wait, let's check if the GameState interface has it.
    // In types.ts, there was no `infrastructure` field in GameState.
    // Wait! Is there an easy way? Let's check how cap is computed or let's just add the field to GameState!
    // Yes! Adding `infrastructure: { signalAmp: number, thermalDuct: number, powerConduit: number }` is clean and simple.
    // Let's look at types.ts. The GameState interface did not have it, but we can add it, or we can deduce levels from capacity:
    //   duct_level = (thermalCycles.capacity - 100) / 25
    //   conduit_level = (gridWatts.capacity - 500) / 200
    //   amplifier_level = (staticNoise.capacity - 250 - conduit_level * 50) / 150
    // Wow! That is a very clever mathematical deduction that doesn't require modifying the schema!
    // Let's see:
    //   conduit_level = Math.round((state.resources.gridWatts.capacity - 500) / 200)
    //   duct_level = Math.round((state.resources.thermalCycles.capacity - 100) / 25)
    //   amplifier_level = Math.round((state.resources.staticNoise.capacity - 250 - conduit_level * 50) / 150)
    // Let's use this deduction, it is extremely elegant and perfectly preserves the schema!
  }

  const gridWattsCap = state.resources.gridWatts.capacity;
  const thermalCyclesCap = state.resources.thermalCycles.capacity;
  const staticNoiseCap = state.resources.staticNoise.capacity;

  const conduitLevel = Math.max(0, Math.round(Math.log(gridWattsCap / 500) / Math.log(1.5)));
  const ductLevel = Math.max(0, Math.round(Math.log(thermalCyclesCap / 100) / Math.log(1.6)));
  const amplifierLevel = Math.max(0, Math.round(Math.log(Math.max(1, (staticNoiseCap - conduitLevel * 200) / 250)) / Math.log(1.8)));

  if (upgradeId === 'SIGNAL_AMPLIFIER') return amplifierLevel;
  if (upgradeId === 'THERMAL_DUCT') return ductLevel;
  if (upgradeId === 'POWER_CONDUIT') return conduitLevel;

  return 0;
}
