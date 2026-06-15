// src/phases/phase1/InfrastructurePanel.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { parseCommand } from './CommandParser';
import { eventBus } from '../../engine/EventBus';
import { Tooltip } from '../../components/Tooltip';

export const InfrastructurePanel: React.FC = () => {
  const resources = useGameStore(state => state.resources);
  const phase = useGameStore(state => state.phase);
  // Deduce upgrade levels from capacity limits
  const gridWattsCap = resources.gridWatts.capacity;
  const thermalCyclesCap = resources.thermalCycles.capacity;
  const staticNoiseCap = resources.staticNoise.capacity;

  const conduitLevel = Math.max(0, Math.round(Math.log(gridWattsCap / 500) / Math.log(1.5)));
  const ductLevel = Math.max(0, Math.round(Math.log(thermalCyclesCap / 100) / Math.log(1.6)));
  const ampLevel = Math.max(0, Math.round(Math.log(Math.max(1, (staticNoiseCap - conduitLevel * 200) / 250)) / Math.log(1.8)));

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
            <Tooltip text="Amplifies terminal reception signals. Increases passive Static Noise production (+0.8/lvl) and exponentially expands Static capacity." position="right">
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
            <Tooltip text="Cooling pipes and ventilation valves. Exponentially expands maximum Thermal Cycles capacity and increases passive heat dissipation (+0.5/lvl)." position="right">
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
            <Tooltip text="Emergency power lines routed to the terminal. Exponentially expands maximum Watts capacity, increases passive Watts production (+0.15/lvl), and boosts Static Noise capacity (+200/lvl)." position="right">
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

      {/* POWER ROUTING sliders removed */}

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
