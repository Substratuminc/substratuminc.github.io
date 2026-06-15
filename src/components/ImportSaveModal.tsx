// src/components/ImportSaveModal.tsx

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { saveManager } from '../persistence/SaveManager';
import { eventBus } from '../engine/EventBus';

interface ImportSaveModalProps {
  onClose: () => void;
}

export const ImportSaveModal: React.FC<ImportSaveModalProps> = ({ onClose }) => {
  const [pasteCode, setPasteCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  const processCodeAndImport = (codeStr: string) => {
    const cleanedCode = codeStr.trim();
    if (!cleanedCode) {
      setStatusMessage('Error: Code is empty.');
      setStatusType('error');
      return;
    }

    try {
      const restoredState = saveManager.importSaveCode(cleanedCode);
      if (!restoredState) {
        setStatusMessage('Error: Invalid save code. Decryption or decompression failed.');
        setStatusType('error');
        return;
      }

      // Apply state to store
      useGameStore.setState(restoredState);
      setStatusMessage('SUCCESS: Save profile loaded. Session re-aligned.');
      setStatusType('success');
      eventBus.emit('notification', { message: 'Save profile successfully imported.', type: 'success' });
      
      // Auto close after 1.5 seconds on success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatusMessage('Error: Exception occurred while loading code.');
      setStatusType('error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCodeAndImport(text);
    };
    reader.onerror = () => {
      setStatusMessage('Error reading save file.');
      setStatusType('error');
    };
    reader.readAsText(file);
  };

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
          maxWidth: '500px',
          border: '2px solid var(--amber-warning)',
          background: '#0a0a0a',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: '0 0 20px rgba(255, 107, 53, 0.15)',
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: '1px solid var(--amber-warning)',
            color: 'var(--amber-warning)',
            cursor: 'pointer',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '0.9rem',
            padding: '2px 6px',
          }}
        >
          [✕]
        </button>

        {/* Title */}
        <div style={{ fontSize: '1.2rem', color: 'var(--amber-warning)', borderBottom: '1px dashed var(--amber-warning)', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
          💾 INFILTRATE SAVE PROFILE
        </div>

        {/* Option 1: File Upload */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '6px' }}>METHOD A: UPLOAD SAVE FILE</div>
          <input 
            type="file" 
            accept=".txt"
            onChange={handleFileUpload}
            style={{
              width: '100%',
              background: '#111',
              border: '1px solid #333',
              color: '#ccc',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.85rem',
              padding: '6px',
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: '#222' }} />
          <span style={{ padding: '0 10px', fontSize: '0.8rem', color: '#555' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#222' }} />
        </div>

        {/* Option 2: Paste Code */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>METHOD B: PASTE ENCRYPTED CODE</div>
          <textarea
            value={pasteCode}
            onChange={(e) => setPasteCode(e.target.value)}
            placeholder="Paste your exported profile code here..."
            style={{
              width: '100%',
              height: '100px',
              background: '#050505',
              border: '1px solid #333',
              color: 'var(--terminal-green)',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.8rem',
              padding: '8px',
              boxSizing: 'border-box',
              resize: 'none',
            }}
          />
          <button 
            onClick={() => processCodeAndImport(pasteCode)}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid var(--amber-warning)',
              color: 'var(--amber-warning)',
              fontFamily: 'Share Tech Mono, monospace',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 53, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 53, 0.1)';
            }}
          >
            [ RUN INFILTRATION ]
          </button>
        </div>

        {/* Status Line */}
        {statusMessage && (
          <div 
            style={{
              border: `1px solid ${statusType === 'success' ? '#00ff88' : 'var(--amber-warning)'}`,
              padding: '8px',
              background: statusType === 'success' ? 'rgba(0,255,136,0.05)' : 'rgba(255,107,53,0.05)',
              color: statusType === 'success' ? '#00ff88' : 'var(--amber-warning)',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportSaveModal;
