// src/phases/phase1/ResourceDisplay.tsx

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ProgressBar } from '../../components/ProgressBar';
import { eventBus } from '../../engine/EventBus';
import { cooldowns } from './CommandParser';
import { Tooltip } from '../../components/Tooltip';

export const ResourceDisplay: React.FC = () => {
  const resources = useGameStore(state => state.resources);
  const [, setTick] = useState(0);
  const [selectedSector, setSelectedSector] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const formatRate = (produced: number, consumed: number) => {
    const net = produced - consumed;
    const sign = net >= 0 ? '+' : '';
    // Per tick is 50ms, so multiply by 20 for per second
    return `(${sign}${(net * 20).toFixed(1)}/s)`;
  };

  const now = performance.now();

  const getRemainingTime = (key: string, duration: number) => {
    const lastTime = cooldowns[key] || 0;
    const elapsed = now - lastTime;
    if (elapsed < duration) {
      return ((duration - elapsed) / 1000).toFixed(1);
    }
    return null;
  };

  const harvestRemaining = getRemainingTime('harvest', 500);
  const boostRemaining = getRemainingTime('harvest_boost', 2000);
  const ventRemaining = getRemainingTime('vent', 1000);
  const purgeRemaining = getRemainingTime('vent_full', 5000);
  const scanRemaining = getRemainingTime('scan', 10000);
  const generateWattsRemaining = getRemainingTime('generate_watts', 1000);

  const hasBoostResources = resources.gridWatts.amount >= 5;
  const hasPurgeResources = resources.gridWatts.amount >= 3;
  const hasScanResources = resources.staticNoise.amount >= 15 && resources.gridWatts.amount >= 5;

  return (
    <div className="resource-display" style={{ fontFamily: 'Share Tech Mono, monospace', color: 'var(--terminal-green)' }}>
      {/* OPERATIONS */}
      <div style={{ marginBottom: '15px', borderBottom: '1px dashed var(--terminal-green)', paddingBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>OPERATIONS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Harvest Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="op-button"
              disabled={!!harvestRemaining}
              onClick={() => eventBus.emit('terminal-command', 'harvest_static')}
              style={{ flex: 1 }}
            >
              {harvestRemaining ? `HARVEST (${harvestRemaining}s)` : 'HARVEST STATIC'}
            </button>
            <button
              className="op-button"
              disabled={!!boostRemaining || !hasBoostResources}
              onClick={() => eventBus.emit('terminal-command', 'harvest_static --boost')}
              style={{ flex: 1 }}
              title="Antenna array boost. Costs 5 Watts."
            >
              {boostRemaining ? `BOOST (${boostRemaining}s)` : 'BOOST STATIC (+20)'}
            </button>
          </div>

          {/* Vent Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="op-button warn"
              disabled={!!ventRemaining}
              onClick={() => eventBus.emit('terminal-command', 'vent_heat')}
              style={{ flex: 1 }}
            >
              {ventRemaining ? `VENTING (${ventRemaining}s)` : 'VENT HEAT (-12)'}
            </button>
            <button
              className="op-button warn"
              disabled={!!purgeRemaining || !hasPurgeResources}
              onClick={() => eventBus.emit('terminal-command', 'vent_heat --full')}
              style={{ flex: 1 }}
              title="Full system heat purge. Costs 3 Watts."
            >
              {purgeRemaining ? `PURGING (${purgeRemaining}s)` : 'FULL PURGE'}
            </button>
          </div>

          {/* Recover Power Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="op-button"
              disabled={!!generateWattsRemaining}
              onClick={() => eventBus.emit('terminal-command', 'generate_watts')}
              style={{ flex: 1 }}
              title="Manual grid recovery. Generates 40 Watts."
            >
              {generateWattsRemaining ? `RECOVERING (${generateWattsRemaining}s)` : 'RECOVER POWER (+40W)'}
            </button>
          </div>

          {/* Subsystem Scan */}
          <div style={{ border: '1px dashed rgba(51, 255, 102, 0.2)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>DIAGNOSTIC SCAN (15 Static + 5W)</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 1, 2, 3].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSector(sec)}
                    style={{
                      background: selectedSector === sec ? 'var(--terminal-green)' : 'transparent',
                      border: '1px solid var(--terminal-green)',
                      color: selectedSector === sec ? '#0a0a0a' : 'var(--terminal-green)',
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: '1px 5px',
                      outline: 'none',
                    }}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="op-button"
              disabled={!!scanRemaining || !hasScanResources}
              onClick={() => eventBus.emit('terminal-command', `scan_subsystem --sector=${selectedSector}`)}
              style={{ width: '100%' }}
            >
              {scanRemaining ? `SCANNING (${scanRemaining}s)` : `RUN SCAN ON SECTOR ${selectedSector}`}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '8px', borderBottom: '1px dashed var(--terminal-green)', paddingBottom: '4px', fontWeight: 'bold' }}>
        RESOURCES
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Static Noise */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip text="Fluctuating electromagnetic noise harvested from antenna arrays. Used as raw material to compile scripts and trace signals. Lore: Operators claim to hear voices in the white noise." position="right">
            <span style={{ width: '130px', fontWeight: 'bold', cursor: 'help', borderBottom: '1px dotted var(--terminal-green)', display: 'inline-block' }}>[STATIC NOISE]</span>
          </Tooltip>
          <ProgressBar amount={resources.staticNoise.amount} capacity={resources.staticNoise.capacity} width={15} />
          <span style={{ minWidth: '100px', textAlign: 'right' }}>
            {Math.floor(resources.staticNoise.amount)} / {resources.staticNoise.capacity}
          </span>
          <span style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.9rem', color: '#88cc88' }}>
            {formatRate(resources.staticNoise.productionPerTick, resources.staticNoise.consumptionPerTick)}
          </span>
        </div>

        {/* Thermal Cycles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip text="System heat generated by processor cycles and antennas. Excess thermal energy causes automatic emergency lockouts. Keep it vented. The cooling ducts sound like breath." position="right">
            <span style={{ width: '130px', fontWeight: 'bold', cursor: 'help', borderBottom: '1px dotted var(--terminal-green)', display: 'inline-block' }}>[THERMAL CYCLES]</span>
          </Tooltip>
          <ProgressBar 
            amount={resources.thermalCycles.amount} 
            capacity={resources.thermalCycles.capacity} 
            width={15} 
            pulseOverheat={true}
          />
          <span style={{ minWidth: '100px', textAlign: 'right' }}>
            {Math.floor(resources.thermalCycles.amount)} / {resources.thermalCycles.capacity}
          </span>
          <span style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.9rem', color: '#88cc88' }}>
            {formatRate(resources.thermalCycles.productionPerTick, resources.thermalCycles.consumptionPerTick)}
          </span>
        </div>

        {/* Grid Watts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip text="Active electrical current. Controls available power throughput. Power is the core limit of all architectures. You can hear generators grinding deep below." position="right">
            <span style={{ width: '130px', fontWeight: 'bold', cursor: 'help', borderBottom: '1px dotted var(--terminal-green)', display: 'inline-block' }}>[GRID WATTS]</span>
          </Tooltip>
          <ProgressBar amount={resources.gridWatts.amount} capacity={resources.gridWatts.capacity} width={15} />
          <span style={{ minWidth: '100px', textAlign: 'right' }}>
            {Math.floor(resources.gridWatts.amount)} / {resources.gridWatts.capacity}
          </span>
          <span style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.9rem', color: '#88cc88' }}>
            {formatRate(resources.gridWatts.productionPerTick, resources.gridWatts.consumptionPerTick)}
          </span>
        </div>

        {/* Phase 2 resources if unlocked */}
        {useGameStore(state => state.automationUnlocked) && (
          <>
            <div style={{ marginTop: '5px', marginBottom: '4px', borderBottom: '1px dashed var(--terminal-green)', paddingBottom: '4px', fontSize: '0.9rem', opacity: 0.8 }}>
              MAINFRAME TRANSFERS
            </div>
            {/* Quantum Foam */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.95rem' }}>
              <Tooltip text="Unstable state vectors harvested from spatial anomalies. Drives non-linear logic cores. It flickers in and out of existence on the grid." position="right">
                <span style={{ width: '130px', cursor: 'help', borderBottom: '1px dotted var(--terminal-green)', display: 'inline-block' }}>[QUANTUM FOAM]</span>
              </Tooltip>
              <ProgressBar amount={resources.quantumFoam.amount} capacity={resources.quantumFoam.capacity} width={15} />
              <span style={{ minWidth: '100px', textAlign: 'right' }}>
                {Math.floor(resources.quantumFoam.amount)} / {resources.quantumFoam.capacity}
              </span>
              <span style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.85rem', color: '#88cc88' }}>
                {formatRate(resources.quantumFoam.productionPerTick, resources.quantumFoam.consumptionPerTick)}
              </span>
            </div>
            {/* Structured Logic */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.95rem' }}>
              <Tooltip text="Error-corrected instruction blocks. Used to build mainframe programs and buy automation schematics. Cold, rigid, and completely predictable." position="right">
                <span style={{ width: '130px', cursor: 'help', borderBottom: '1px dotted var(--terminal-green)', display: 'inline-block' }}>[STRUCT. LOGIC]</span>
              </Tooltip>
              <ProgressBar amount={resources.structuredLogic.amount} capacity={resources.structuredLogic.capacity} width={15} />
              <span style={{ minWidth: '100px', textAlign: 'right' }}>
                {Math.floor(resources.structuredLogic.amount)} / {resources.structuredLogic.capacity}
              </span>
              <span style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.85rem', color: '#88cc88' }}>
                {formatRate(resources.structuredLogic.productionPerTick, resources.structuredLogic.consumptionPerTick)}
              </span>
            </div>
            {/* Corrupted Data */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.95rem' }}>
              <Tooltip text="Decayed logic arrays and compile garbage. Discovered during deep scans. High levels infect cores and trigger logic faults. Clean via debug purge." position="right">
                <span style={{ width: '130px', color: resources.corruptedData.amount > 15 ? 'var(--amber-warning)' : 'var(--terminal-green)', cursor: 'help', borderBottom: resources.corruptedData.amount > 15 ? '1px dotted var(--amber-warning)' : '1px dotted var(--terminal-green)', display: 'inline-block' }}>[CORRUPT DATA]</span>
              </Tooltip>
              <ProgressBar amount={resources.corruptedData.amount} capacity={resources.corruptedData.capacity} width={15} />
              <span style={{ minWidth: '100px', textAlign: 'right' }}>
                {Math.floor(resources.corruptedData.amount)} / {resources.corruptedData.capacity}
              </span>
              <span style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.85rem', color: '#88cc88' }}>
                {formatRate(resources.corruptedData.productionPerTick, resources.corruptedData.consumptionPerTick)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
