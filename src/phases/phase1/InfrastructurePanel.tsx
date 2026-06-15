// src/phases/phase1/InfrastructurePanel.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { parseCommand } from './CommandParser';
import { eventBus } from '../../engine/EventBus';
import { Tooltip } from '../../components/Tooltip';

export const InfrastructurePanel: React.FC = () => {
  const resources = useGameStore(state => state.resources);
  const phase = useGameStore(state => state.phase);
  const powerAllocation = useGameStore(state => state.powerAllocation || { signalAmp: 0, thermalDuct: 0 });
  
  const signalAmpAlloc = powerAllocation.signalAmp || 0;
  const thermalDuctAlloc = powerAllocation.thermalDuct || 0;
  const wattsCap = resources.gridWatts.capacity;
  const totalAllocated = signalAmpAlloc + thermalDuctAlloc;
  const availableWatts = wattsCap - totalAllocated;

  const handleSignalAmpAllocChange = (val: number) => {
    useGameStore.setState(s => ({
      powerAllocation: {
        ...s.powerAllocation,
        signalAmp: val
      }
    }));
  };

  const handleThermalDuctAllocChange = (val: number) => {
    useGameStore.setState(s => ({
      powerAllocation: {
        ...s.powerAllocation,
        thermalDuct: val
      }
    }));
  };

  // Deduce upgrade levels from capacity limits
  const gridWattsCap = resources.gridWatts.capacity;
  const thermalCyclesCap = resources.thermalCycles.capacity;
  const staticNoiseCap = resources.staticNoise.capacity;

  const conduitLevel = Math.max(0, Math.round((gridWattsCap - 500) / 200));
  const ductLevel = Math.max(0, Math.round((thermalCyclesCap - 100) / 25));
  const ampLevel = Math.max(0, Math.round((staticNoiseCap - 250 - conduitLevel * 100) / 300));

  // Costs
  const ampCost = Math.round(100 * Math.pow(1.65, ampLevel));
  const ductCost = Math.round(50 * Math.pow(1.5, ductLevel));

  let conduitCostW = 0;
  let conduitCostStatic = 0;

  if (conduitLevel === 0) {
    conduitCostStatic = 500;
  } else if (conduitLevel === 1) {
    conduitCostW = 100;
    conduitCostStatic = 200;
  } else if (conduitLevel === 2) {
    conduitCostW = 200;
    conduitCostStatic = 400;
  } else if (conduitLevel === 3) {
    conduitCostW = 350;
    conduitCostStatic = 700;
  } else {
    conduitCostW = 600;
    conduitCostStatic = 1200;
  }

  const triggerUpgrade = (target: string) => {
    const results = parseCommand(`upgrade ${target}`);
    // Add output to terminal history so players see feedback
    useGameStore.setState(s => ({
      terminalHistory: [...s.terminalHistory, ...results].slice(-200)
    }));

    // Trigger UI notification
    const resultText = results[0];
    if (resultText && !resultText.includes('Error')) {
      eventBus.emit('notification', { message: resultText.replace('>> ', ''), type: 'success' });
    } else if (resultText) {
      eventBus.emit('notification', { message: resultText.replace('>> ', ''), type: 'warn' });
    }
  };

  return (
    <div className="infrastructure-panel" style={{ fontFamily: 'Share Tech Mono, monospace', color: 'var(--terminal-green)' }}>
      <div style={{ marginBottom: '8px', borderBottom: '1px dashed var(--terminal-green)', paddingBottom: '4px', fontWeight: 'bold' }}>
        INFRASTRUCTURE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Signal Amplifier */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Tooltip text="Amplifies terminal reception signals. Increases passive Static Noise production (+0.5/lvl) and Static capacity (+300/lvl)." position="right">
              <div style={{ fontWeight: 'bold', cursor: 'help', borderBottom: '1px dotted var(--terminal-green)', display: 'inline-block' }}>[SIGNAL AMPLIFIER]</div>
            </Tooltip>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              Lv.{ampLevel} &middot; Cost: {ampCost} Static
            </div>
          </div>
          <button 
            onClick={() => triggerUpgrade('signal_amp')}
            disabled={resources.staticNoise.amount < ampCost}
            style={{
              background: 'transparent',
              border: '1px solid var(--terminal-green)',
              color: 'var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.9rem',
              padding: '2px 8px',
              opacity: resources.staticNoise.amount < ampCost ? 0.5 : 1,
            }}
          >
            [UPGRADE]
          </button>
        </div>

        {/* Thermal Duct */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Tooltip text="Cooling pipes and ventilation valves. Increases maximum Thermal Cycles capacity (+25/lvl) and passive heat dissipation." position="right">
              <div style={{ fontWeight: 'bold', cursor: 'help', borderBottom: '1px dotted var(--terminal-green)', display: 'inline-block' }}>[THERMAL DUCT]</div>
            </Tooltip>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              Lv.{ductLevel} &middot; Cost: {ductCost}°
            </div>
          </div>
          <button 
            onClick={() => triggerUpgrade('thermal_duct')}
            disabled={resources.thermalCycles.amount < ductCost}
            style={{
              background: 'transparent',
              border: '1px solid var(--terminal-green)',
              color: 'var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.9rem',
              padding: '2px 8px',
              opacity: resources.thermalCycles.amount < ductCost ? 0.5 : 1,
            }}
          >
            [UPGRADE]
          </button>
        </div>

        {/* Power Conduit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Tooltip text="Emergency power lines routed to the terminal. Increases maximum Watts capacity (+200/lvl), Watts production (+0.02/lvl), and Static Noise capacity (+100/lvl)." position="right">
              <div style={{ fontWeight: 'bold', cursor: 'help', borderBottom: '1px dotted var(--terminal-green)', display: 'inline-block' }}>[POWER CONDUIT]</div>
            </Tooltip>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              Lv.{conduitLevel} &middot; Cost: {conduitCostW > 0 ? `${conduitCostW}W + ` : ''}{conduitCostStatic} Static
            </div>
          </div>
          <button 
            onClick={() => triggerUpgrade('power_conduit')}
            disabled={resources.staticNoise.amount < conduitCostStatic || resources.gridWatts.amount < conduitCostW}
            style={{
              background: 'transparent',
              border: '1px solid var(--terminal-green)',
              color: 'var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.9rem',
              padding: '2px 8px',
              opacity: (resources.staticNoise.amount < conduitCostStatic || resources.gridWatts.amount < conduitCostW) ? 0.5 : 1,
            }}
          >
            {conduitLevel === 0 ? '[UNLOCK]' : '[UPGRADE]'}
          </button>
        </div>
      </div>

      {/* POWER ROUTING */}
      {conduitLevel >= 1 && (
        <div style={{ marginTop: '20px', borderTop: '1px dashed var(--terminal-green)', paddingTop: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>POWER ROUTING</div>
          <div style={{ fontSize: '0.85rem', marginBottom: '12px', opacity: 0.8 }}>
            Reroute grid power to boost subsystem throughput. Allocated: {totalAllocated}W / {wattsCap}W
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Signal Amp Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Signal Amp Boost:</span>
                <span style={{ fontWeight: 'bold' }}>{signalAmpAlloc} W (+{Math.min(40, signalAmpAlloc * 2)}% output)</span>
              </div>
              <input 
                type="range"
                min="0"
                max={signalAmpAlloc + availableWatts}
                value={signalAmpAlloc}
                onChange={(e) => handleSignalAmpAllocChange(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  background: '#111',
                  accentColor: 'var(--terminal-green)',
                  outline: 'none',
                  height: '4px',
                  margin: '6px 0',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Thermal Duct Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Thermal Vent Boost:</span>
                <span style={{ fontWeight: 'bold' }}>{thermalDuctAlloc} W (+{Math.min(40, thermalDuctAlloc * 2)}% vent rate)</span>
              </div>
              <input 
                type="range"
                min="0"
                max={thermalDuctAlloc + availableWatts}
                value={thermalDuctAlloc}
                onChange={(e) => handleThermalDuctAllocChange(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  background: '#111',
                  accentColor: 'var(--terminal-green)',
                  outline: 'none',
                  height: '4px',
                  margin: '6px 0',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Phase Gating Hint */}
      {ampLevel >= 7 && phase === 'TERMINAL' && (
        <div 
          className="pulse-amber" 
          style={{ 
            marginTop: '20px', 
            border: '1px solid var(--amber-warning)', 
            padding: '10px', 
            fontSize: '0.85rem', 
            background: 'rgba(255, 107, 53, 0.05)',
            textAlign: 'center',
            lineHeight: '1.4',
            animation: 'flash-urgent 1.5s infinite',
          }}
        >
          ⚡ Signal Amplifier Lv.7 reached. Enter <code style={{ color: '#fff', background: '#222', padding: '2px 4px', borderRadius: '2px' }}>compile_fragment bootloader.key</code> in the terminal to connect to the Mainframe.
        </div>
      )}
    </div>
  );
};
