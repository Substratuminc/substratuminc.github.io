// src/components/AchievementsModal.tsx

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENTS } from '../store/achievements';

interface AchievementsModalProps {
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ onClose }) => {
  const unlockedIds = useGameStore(state => state.unlockedAchievements || []);
  const [filter, setFilter] = useState<string>('ALL');

  const categories = ['ALL', 'PROGRESS', 'RESOURCE', 'LORE', 'SECRET', 'COMBAT'];

  const filteredAchievements = ACHIEVEMENTS.filter(ach => {
    if (filter === 'ALL') return true;
    return ach.category === filter;
  });

  const totalUnlocked = ACHIEVEMENTS.filter(ach => unlockedIds.includes(ach.id)).length;
  const percentUnlocked = Math.round((totalUnlocked / ACHIEVEMENTS.length) * 100);

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 5, 5, 0.95)',
        zIndex: 2000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'Share Tech Mono, monospace',
      }}
    >
      <div 
        className="modal-container"
        style={{
          width: '100%',
          maxWidth: '850px',
          height: '90vh',
          maxHeight: '650px',
          border: '2px solid #ffd700',
          background: '#0a0a0a',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: '0 0 25px rgba(255, 215, 0, 0.2)',
        }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: '1px solid #ffd700',
            color: '#ffd700',
            cursor: 'pointer',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '1rem',
            padding: '2px 8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          [✕] CLOSE
        </button>

        {/* Title */}
        <div style={{ fontSize: '1.4rem', color: '#ffd700', borderBottom: '1px dashed #ffd700', paddingBottom: '10px', marginBottom: '15px', fontWeight: 'bold' }}>
          🏆 OPERATOR RECORD LOG &mdash; ACHIEVEMENT SYSTEM
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.95rem' }}>
            <span>UNLOCKED DATA NODES:</span>
            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{totalUnlocked} / {ACHIEVEMENTS.length} ({percentUnlocked}%)</span>
          </div>
          <div style={{ height: '12px', border: '1px solid #ffd700', background: '#000', padding: '1px' }}>
            <div style={{ height: '100%', width: `${percentUnlocked}%`, background: 'linear-gradient(90deg, #ffd700, #ffaa00)', boxShadow: '0 0 8px #ffd700' }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                background: filter === cat ? '#ffd700' : 'transparent',
                color: filter === cat ? '#000' : '#ffd700',
                border: '1px solid #ffd700',
                padding: '4px 8px',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              [{cat}]
            </button>
          ))}
        </div>

        {/* Grid Area */}
        <div 
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            paddingRight: '6px',
          }}
        >
          {filteredAchievements.map(ach => {
            const isUnlocked = unlockedIds.includes(ach.id);
            const isHidden = ach.hidden;

            if (!isUnlocked && isHidden) {
              return (
                <div
                  key={ach.id}
                  style={{
                    border: '1px dashed #333',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.4)',
                    color: '#444',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    height: '80px',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', opacity: 0.3 }}>🔒</div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555' }}>[CLASSIFIED]</div>
                    <div style={{ fontSize: '0.8rem', color: '#444' }}>Decryption key missing.</div>
                  </div>
                </div>
              );
            }

            if (!isUnlocked) {
              return (
                <div
                  key={ach.id}
                  style={{
                    border: '1px solid #222',
                    padding: '10px',
                    background: 'rgba(10, 10, 10, 0.8)',
                    color: '#666',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    height: '80px',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', filter: 'grayscale(100%)', opacity: 0.2 }}>{ach.icon}</div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#777' }}>{ach.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#555' }}>{ach.description} (Locked)</div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={ach.id}
                style={{
                  border: '1px solid #ffd700',
                  padding: '10px',
                  background: 'rgba(25, 20, 5, 0.7)',
                  color: '#ffd700',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  height: '80px',
                  boxShadow: '0 0 8px rgba(255, 215, 0, 0.1)',
                }}
              >
                <div style={{ fontSize: '1.8rem', textShadow: '0 0 5px #ffd700' }}>{ach.icon}</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', textShadow: '0 0 2px #fff' }}>{ach.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#ffd700', opacity: 0.9 }}>{ach.description}</div>
                  <span style={{ display: 'inline-block', fontSize: '0.65rem', border: '1px solid #ffd700', padding: '0px 3px', marginTop: '4px', opacity: 0.7 }}>
                    {ach.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AchievementsModal;
