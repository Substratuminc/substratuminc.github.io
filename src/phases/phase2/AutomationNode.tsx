// src/phases/phase2/AutomationNode.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { BALANCING_TABLE } from './BalancingTable';
import { Tooltip } from '../../components/Tooltip';
import { eventBus } from '../../engine/EventBus';
import type { AutomationUnit, ResourceKey } from '../../store/types';

interface AutomationNodeProps {
  unit: AutomationUnit;
  revealName?: boolean;
}

export const AutomationNode: React.FC<AutomationNodeProps> = ({ unit, revealName }) => {
  const resources = useGameStore(state => state.resources);
  const metadata = BALANCING_TABLE[unit.id] || {
    description: '',
    productionText: '',
    failureText: '',
    recoveryText: '',
    lore: '',
  };

  const isUnlocked = unit.count > 0 || unit.isActive; // or unlocked via trigger

  // Check if player has resources to buy/unlock
  const canBuy = () => {
    for (const resKey in unit.purchaseCost) {
      const k = resKey as ResourceKey;
      if (resources[k].amount < unit.purchaseCost[k]) return false;
    }
    return true;
  };

  const handleBuy = () => {
    if (!canBuy()) return;

    useGameStore.setState(state => {
      // Deduct resources
      const nextResources = { ...state.resources };
      for (const resKey in unit.purchaseCost) {
        const k = resKey as ResourceKey;
        nextResources[k] = {
          ...nextResources[k],
          amount: Math.max(0, nextResources[k].amount - unit.purchaseCost[k]),
        };
      }

      // Update unit
      const nextUnits = state.automationUnits.map(u => {
        if (u.id === unit.id) {
          return {
            ...u,
            count: u.count + 1,
            isActive: true, // Auto activate on purchase
          };
        }
        return u;
      });

      return {
        resources: nextResources,
        automationUnits: nextUnits,
      };
    });

    eventBus.emit('notification', { message: `Purchased ${unit.name}`, type: 'success' });
  };

  const toggleActive = () => {
    useGameStore.setState(state => {
      const nextUnits = state.automationUnits.map(u => {
        if (u.id === unit.id) {
          return { ...u, isActive: !u.isActive };
        }
        return u;
      });
      return { automationUnits: nextUnits };
    });
  };

  // Render status indicator dot
  const renderStatusDot = () => {
    if (unit.failureState) {
      return (
        <span 
          style={{ color: '#ff3333', marginRight: '6px', cursor: 'help', fontWeight: 'bold' }} 
          title={unit.failureState.description}
        >
          [!]
        </span>
      );
    }
    if (unit.isActive && unit.count > 0) {
      return <span style={{ color: '#00ff88', marginRight: '6px' }}>●</span>;
    }
    return <span style={{ color: '#555555', marginRight: '6px' }}>○</span>;
  };

  // Helper to format cost string
  const formatCost = () => {
    const list: string[] = [];
    for (const resKey in unit.purchaseCost) {
      const k = resKey as ResourceKey;
      const amt = unit.purchaseCost[k];
      if (amt > 0) {
        let name = k.substring(0, 6);
        if (k === 'staticNoise') name = 'Static';
        if (k === 'gridWatts') name = 'Watts';
        if (k === 'structuredLogic') name = 'Logic';
        if (k === 'quantumFoam') name = 'Foam';
        list.push(`${amt} ${name}`);
      }
    }
    return list.join(', ');
  };

  if (!isUnlocked) {
    // If not purchased, display "Unlockable" row if parent requirement met, or lock
    // For simplicity, we make all tiers unlockable if player reaches Static > unlock requirement,
    // or just show them in the list as locked until resources allow.
    // Let's show a locked node block
    const canUnlock = () => {
      for (const resKey in unit.unlockCost) {
        const k = resKey as ResourceKey;
        if (resources[k].amount < unit.unlockCost[k]) return false;
      }
      return true;
    };

    const handleUnlock = () => {
      if (!canUnlock()) return;

      useGameStore.setState(state => {
        const nextResources = { ...state.resources };
        for (const resKey in unit.unlockCost) {
          const k = resKey as ResourceKey;
          nextResources[k] = {
            ...nextResources[k],
            amount: Math.max(0, nextResources[k].amount - unit.unlockCost[k]),
          };
        }

        const nextUnits = state.automationUnits.map(u => {
          if (u.id === unit.id) {
            return { ...u, count: 1, isActive: true };
          }
          return u;
        });

        return {
          resources: nextResources,
          automationUnits: nextUnits,
        };
      });

      eventBus.emit('notification', { message: `${unit.name} unlocked!`, type: 'success' });
    };

    return (
      <div 
        className="automation-node locked"
        style={{
          border: '1px dashed #444444',
          padding: '8px',
          marginBottom: '6px',
          fontFamily: 'Share Tech Mono, monospace',
          color: '#555555',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontWeight: 'bold' }}>[LOCKED: {revealName ? unit.name : `Tier ${unit.tier}`}]</span>
          <div style={{ fontSize: '0.8rem' }}>Unlock cost: {
            Object.entries(unit.unlockCost)
              .filter(([_, amt]) => amt > 0)
              .map(([key, amt]) => `${amt} ${key === 'staticNoise' ? 'Static' : key === 'gridWatts' ? 'Watts' : 'Logic'}`)
              .join(', ')
          }</div>
        </div>
        <button 
          onClick={handleUnlock}
          disabled={!canUnlock()}
          style={{
            background: 'transparent',
            border: '1px solid ' + (canUnlock() ? 'var(--terminal-green)' : '#444444'),
            color: canUnlock() ? 'var(--terminal-green)' : '#555555',
            cursor: canUnlock() ? 'pointer' : 'default',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '0.85rem',
            padding: '2px 6px',
          }}
        >
          [UNLOCK]
        </button>
      </div>
    );
  }

  const tooltipText = `${metadata.description}\n\nYields: ${metadata.productionText}\n\nRisk: ${metadata.failureText}\n\n"${metadata.lore}"`;

  return (
    <div 
      className={`automation-node ${unit.failureState ? 'failed' : ''}`}
      style={{
        border: '1px solid ' + (unit.failureState ? 'var(--amber-warning)' : 'var(--terminal-green)'),
        padding: '8px',
        marginBottom: '6px',
        fontFamily: 'Share Tech Mono, monospace',
        color: unit.failureState ? 'var(--amber-warning)' : 'var(--terminal-green)',
        background: unit.failureState ? 'rgba(30,10,0,0.4)' : 'rgba(0,10,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {renderStatusDot()}
          <Tooltip text={tooltipText} position="right">
            <span style={{ fontWeight: 'bold', textDecoration: 'underline', cursor: 'help' }}>
              {unit.name}
            </span>
          </Tooltip>
          <span style={{ marginLeft: '8px', fontSize: '0.85rem', opacity: 0.8 }}>
            x{unit.count}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={unit.isActive} 
              onChange={toggleActive} 
              style={{ marginRight: '4px', cursor: 'pointer' }}
            />
            {unit.isActive ? 'ACTIVE' : 'IDLE'}
          </label>

          <button
            onClick={handleBuy}
            disabled={!canBuy()}
            style={{
              background: 'transparent',
              border: '1px solid ' + (canBuy() ? 'var(--terminal-green)' : '#336633'),
              color: canBuy() ? 'var(--terminal-green)' : '#336633',
              cursor: canBuy() ? 'pointer' : 'default',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.85rem',
              padding: '2px 6px',
            }}
          >
            [BUY (+1)]
          </button>
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.75, display: 'flex', justifyContent: 'space-between' }}>
        <span>Cost: {formatCost()}</span>
        {unit.failureState && (
          <span 
            className="blink-red" 
            style={{ 
              color: '#ff3333', 
              fontWeight: 'bold',
              animation: 'blink-halt 1.2s step-end infinite'
            }}
          >
            ⚠️ SYSTEM HALTED: {unit.failureState.type} (Purge / Reboot in FAILURES tab!)
          </span>
        )}
      </div>
      <style>{`
        @keyframes blink-halt {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
export default AutomationNode;
