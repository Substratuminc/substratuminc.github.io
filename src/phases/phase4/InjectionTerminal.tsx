// src/phases/phase4/InjectionTerminal.tsx

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { validateSubScript, type ParseResult } from './ScriptValidator';
import { resolveMetaVariable, isBossDamageInverted } from './ParadigmShift';
import { eventBus } from '../../engine/EventBus';
import type { MetaInjection } from '../../store/types';

export const InjectionTerminal: React.FC = () => {
  const state = useGameStore();
  const { resources, activeInjections } = state;

  const [script, setScript] = useState('SET PLAYER_SPEED TO 6');
  const [scope, setScope] = useState<'SESSION' | 'PERMANENT' | 'GLOBAL'>('SESSION');
  const [validation, setValidation] = useState<ParseResult | null>(null);
  
  // Confirmation state for RED injections
  const [needsConfirmText, setNeedsConfirmText] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  
  // Cascade animation states
  const [flicker, setFlicker] = useState(false);
  const [updatedVar, setUpdatedVar] = useState<string | null>(null);

  // Auto-validate whenever script or scope changes
  useEffect(() => {
    const res = validateSubScript(script, scope);
    setValidation(res);
    setNeedsConfirmText(false);
  }, [script, scope]);

  const handleValidate = () => {
    const res = validateSubScript(script, scope);
    setValidation(res);
    if (res.success) {
      eventBus.emit('notification', { message: 'SubScript syntax validated successfully.', type: 'info' });
    } else {
      eventBus.emit('notification', { message: `SubScript error: ${res.error}`, type: 'warn' });
    }
  };

  const handleExecute = () => {
    if (!validation || !validation.success || !validation.effect) return;

    const shardCost = validation.cost || 0;
    if (resources.paradigmShards.amount < shardCost) {
      eventBus.emit('notification', { message: `Insufficient Paradigm Shards. Requires ${shardCost} Shards.`, type: 'warn' });
      return;
    }

    // RED injections require typing "CONFIRM IRREVERSIBLE"
    if (validation.safety === 'RED' && !needsConfirmText) {
      setNeedsConfirmText(true);
      eventBus.emit('notification', { message: 'RED-safety override detected. Confirmation required.', type: 'warn' });
      return;
    }

    if (needsConfirmText && confirmInput !== 'CONFIRM IRREVERSIBLE') {
      eventBus.emit('notification', { message: 'Confirmation text incorrect.', type: 'warn' });
      return;
    }

    // Play Execute Cascade animation (Section 1.6.5)
    setFlicker(true);
    setTimeout(() => {
      setFlicker(false);
      setUpdatedVar(validation.effect!.targetVariable);
      
      // Deduct Shards and apply injection
      useGameStore.setState(s => {
        const nextResources = { ...s.resources };
        nextResources.paradigmShards = {
          ...nextResources.paradigmShards,
          amount: Math.max(0, nextResources.paradigmShards.amount - shardCost),
        };

        // Glitch-Mother intrusion hazard: 20% chance on RED/GLOBAL injection
        let effect = { ...validation.effect! };
        let warningLog = '';

        if (validation.safety === 'RED' && Math.random() < 0.20) {
          // Intrude and distort value!
          if (effect.targetVariable === 'ENEMY_HEAL_RATE') {
            effect.value = 1.5; // turned negative to positive!
          } else {
            effect.value = Math.max(0.1, effect.value * -0.5 + 2.0); // reverse or modify
          }
          warningLog = '>> [WARNING] GLITCH-MOTHER INTRUSION INJECTED RANDOM MULTIPLIERS.';
        }

        const newInjection: MetaInjection = {
          id: `inj_${Date.now()}`,
          scriptFragment: script,
          validatedEffect: effect,
          applicationCount: 1,
          maxApplications: 1,
          energyCost: shardCost,
        };

        // If duplicate target, remove old one
        const filteredInjections = s.activeInjections.filter(
          i => i.validatedEffect?.targetVariable !== effect.targetVariable
        );

        const terminalHistory = [...s.terminalHistory];
        terminalHistory.push(`> INJECT: ${script}`);
        if (warningLog) terminalHistory.push(warningLog);
        terminalHistory.push(`>> EFFECT: ${effect.operation} ${effect.targetVariable} TO ${effect.value} successfully processed.`);

        return {
          resources: nextResources,
          activeInjections: [...filteredInjections, newInjection],
          terminalHistory: terminalHistory.slice(-200),
        };
      });

      // Clear update flash
      setTimeout(() => {
        setUpdatedVar(null);
      }, 1000);

      eventBus.emit('notification', { message: 'Script injection running.', type: 'success' });
      setNeedsConfirmText(false);
      setConfirmInput('');
    }, 200);
  };

  const removeInjection = (id: string) => {
    useGameStore.setState(s => {
      const nextInjections = s.activeInjections.filter(i => i.id !== id);
      return { activeInjections: nextInjections };
    });
    eventBus.emit('notification', { message: 'Injection removed. Variables restored.', type: 'info' });
  };

  // List of variables to display in the Variable Browser
  const variables = [
    'PLAYER_SPEED',
    'GRAVITY_CONSTANT',
    'CRIT_MULTIPLIER',
    'FOG_RADIUS',
    'COST_SCALING_EXPONENT',
    'ENEMY_HEAL_RATE',
    'STATIC_PRODUCTION_RATE',
  ] as const;

  return (
    <div 
      className="paradigm-interface"
      style={{
        border: '2px solid var(--terminal-green)',
        background: 'var(--panel-bg)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'row',
        height: '420px',
        fontFamily: 'Share Tech Mono, monospace',
        color: 'var(--terminal-green)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        gap: '12px',
        filter: flicker ? 'invert(1)' : 'none',
        transition: 'filter 0.1s ease',
      }}
    >
      {/* Script Editor Column */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '8px' }}>
          INJECTION TERMINAL
        </div>
        
        {/* Editor Area */}
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="// Enter SubScript..."
          style={{
            flex: 1,
            background: 'rgba(0,10,0,0.3)',
            border: '1px solid var(--terminal-green)',
            outline: 'none',
            color: 'var(--terminal-green)',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '0.9rem',
            padding: '8px',
            resize: 'none',
          }}
        />

        {/* Scope and buttons */}
        <div style={{ display: 'flex', gap: '8px', margin: '8px 0', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem' }}>SCOPE:</span>
          {['SESSION', 'PERMANENT', 'GLOBAL'].map(sc => (
            <button
              key={sc}
              onClick={() => setScope(sc as any)}
              style={{
                background: scope === sc ? 'var(--terminal-green)' : 'transparent',
                color: scope === sc ? '#000000' : 'var(--terminal-green)',
                border: '1px solid var(--terminal-green)',
                cursor: 'pointer',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '0.8rem',
                padding: '2px 6px',
              }}
            >
              {sc === 'SESSION' ? 'SESSION' : sc === 'PERMANENT' ? 'FLOOR' : 'GLOBAL'}
            </button>
          ))}
        </div>

        {/* Confirmation row for RED injections */}
        {needsConfirmText && (
          <div style={{ border: '1px solid var(--amber-warning)', padding: '5px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--amber-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>
              [CAUTION] TYPE "CONFIRM IRREVERSIBLE" TO INJECT RED MODULE:
            </span>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              style={{
                background: '#1a0d00',
                border: '1px solid var(--amber-warning)',
                color: 'var(--amber-warning)',
                outline: 'none',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '0.85rem',
                padding: '2px 5px',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleValidate}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--terminal-green)',
              color: 'var(--terminal-green)',
              cursor: 'pointer',
              fontFamily: 'Share Tech Mono, monospace',
              padding: '4px',
            }}
          >
            [VALIDATE]
          </button>
          <button 
            onClick={handleExecute}
            disabled={!validation?.success}
            style={{
              flex: 1,
              background: validation?.success ? 'var(--terminal-green)' : 'transparent',
              color: validation?.success ? '#000000' : '#444444',
              border: '1px solid ' + (validation?.success ? 'var(--terminal-green)' : '#444444'),
              cursor: validation?.success ? 'pointer' : 'default',
              fontFamily: 'Share Tech Mono, monospace',
              padding: '4px',
              fontWeight: 'bold',
            }}
          >
            [EXECUTE]
          </button>
        </div>

        {/* Validation Output */}
        <div style={{ height: '60px', marginTop: '8px', fontSize: '0.8rem', opacity: 0.85 }}>
          {validation ? (
            validation.success ? (
              <div style={{ color: '#00ff88' }}>
                &gt;&gt; VALID: Shard Cost: {validation.cost} &middot; Safety: [{validation.safety}]
              </div>
            ) : (
              <div style={{ color: 'var(--amber-warning)' }}>
                &gt;&gt; SYNTAX ERROR: {validation.error}
              </div>
            )
          ) : (
            <div>&gt;&gt; Ready to validate...</div>
          )}
        </div>
      </div>

      {/* Variables & Active Injections Column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px dashed var(--terminal-green)', paddingLeft: '10px' }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--terminal-green)', marginBottom: '8px' }}>
          VARIABLE BROWSER
        </div>
        <div style={{ flex: 0.8, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
          {variables.map(v => {
            const val = resolveMetaVariable(state, v);
            const isMod = activeInjections.some(i => i.validatedEffect?.targetVariable === v);
            
            return (
              <div 
                key={v} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  color: isMod ? 'var(--amber-warning)' : 'var(--terminal-green)',
                  background: updatedVar === v ? 'rgba(255,185,151,0.2)' : 'transparent',
                  transition: 'background 0.3s ease',
                  padding: '2px 4px'
                }}
              >
                <span>{v}:</span>
                <span style={{ fontWeight: 'bold' }}>[{val}]</span>
              </div>
            );
          })}
          {/* Boss damage array */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: isBossDamageInverted(state) ? 'var(--amber-warning)' : 'var(--terminal-green)' }}>
            <span>BOSS_DAMAGE_ARRAY:</span>
            <span style={{ fontWeight: 'bold' }}>[{isBossDamageInverted(state) ? 'INVERTED' : 'NORMAL'}]</span>
          </div>
        </div>

        {/* Active Injections */}
        <div style={{ flex: 1, borderTop: '1px solid var(--terminal-green)', paddingTop: '8px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>ACTIVE INJECTIONS</div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
            {activeInjections.length === 0 ? (
              <div style={{ color: '#555555' }}>No active script injections in memory.</div>
            ) : (
              activeInjections.map(inj => (
                <div key={inj.id} style={{ border: '1px solid #336633', padding: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'var(--amber-warning)' }}>{inj.scriptFragment}</div>
                    <div style={{ opacity: 0.7 }}>Cost: {inj.energyCost} &middot; Scope: {inj.validatedEffect?.scopedTo}</div>
                  </div>
                  <button 
                    onClick={() => removeInjection(inj.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--amber-warning)',
                      color: 'var(--amber-warning)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontFamily: 'Share Tech Mono, monospace',
                      padding: '1px 4px',
                    }}
                  >
                    [X]
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default InjectionTerminal;
