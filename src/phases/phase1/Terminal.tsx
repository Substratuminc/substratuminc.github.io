// src/phases/phase1/Terminal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { parseCommand } from './CommandParser';
import { useAsciiFrame } from '../../engine/AsciiAnimator';
import { eventBus } from '../../engine/EventBus';

export const Terminal: React.FC = () => {
  const [input, setInput] = useState('');

  const [animatingLines, setAnimatingLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [displayedHistory, setDisplayedHistory] = useState<React.ReactNode[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdIndex, setCmdIndex] = useState(-1);

  const terminalHistory = useGameStore(state => state.terminalHistory);
  const textSpeed = useGameStore(state => state.settings.textSpeed);
  const cursorBlink = useAsciiFrame('cursor');
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize initial terminal history from store
  useEffect(() => {
    // We want to dump the starting history from the store into the display
    const formatted = terminalHistory.map((line, idx) => (
      <div key={`init-${idx}-${Math.random().toString(36).substring(2, 9)}`} style={{ color: line.startsWith('>') ? 'var(--terminal-green)' : '#cccccc', whiteSpace: 'pre-wrap' }}>
        {line}
      </div>
    ));
    setDisplayedHistory(formatted);
  }, []);

  // Scroll to bottom whenever displayed history changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedHistory]);

  // Handle typing speed configuration
  const getCharDelay = () => {
    if (textSpeed === 'SLOW') return 15;
    if (textSpeed === 'FAST') return 3;
    if (textSpeed === 'INSTANT') return 0;
    return 8; // MEDIUM
  };

  // Process printing queue for typewriter effect
  useEffect(() => {
    if (animatingLines.length === 0) return;

    const delay = getCharDelay();
    if (delay === 0) {
      // Print everything instantly
      const newNodes = animatingLines.map((line, idx) => renderLine(line, `anim-inst-${idx}-${Math.random().toString(36).substring(2, 9)}`));
      setDisplayedHistory(prev => [...prev, ...newNodes]);
      setAnimatingLines([]);
      return;
    }

    const currentText = animatingLines[currentLineIndex];
    if (currentCharIndex < currentText.length) {
      const timer = setTimeout(() => {
        setCurrentCharIndex(c => c + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      // Completed one line, add it to history
      const completedLine = renderLine(currentText, `anim-done-${currentLineIndex}-${Math.random().toString(36).substring(2, 9)}`);
      setDisplayedHistory(prev => [...prev, completedLine]);

      if (currentLineIndex + 1 < animatingLines.length) {
        setCurrentLineIndex(idx => idx + 1);
        setCurrentCharIndex(0);
      } else {
        // All lines printed
        setAnimatingLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
      }
    }
  }, [animatingLines, currentLineIndex, currentCharIndex, textSpeed]);

  // Render a single line, checking for special items like Save Code data blocks
  const renderLine = (line: string, key: string) => {
    const isSaveCode = line.length > 100 && !line.includes(' ');
    
    if (isSaveCode) {
      return (
        <div key={key} style={{ margin: '8px 0', border: '1px solid var(--amber-warning)', padding: '5px', background: '#110a05', position: 'relative' }}>
          <div style={{ color: 'var(--amber-warning)', fontSize: '0.8rem', marginBottom: '4px' }}>[ SAVE PROFILE CODE ]</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.75rem', color: '#ffb997', overflowX: 'auto', maxBlockSize: '120px', wordBreak: 'break-all' }}>
            {line}
          </pre>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(line);
              // Trigger a small notice
              alert('Save code copied to clipboard!');
            }}
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              background: 'var(--amber-warning)',
              border: 'none',
              color: '#0a0a0a',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '0.8rem',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            [COPY]
          </button>
        </div>
      );
    }

    let color = '#cccccc';
    if (line.startsWith('>> [ALERT]') || line.startsWith('>> [!!]') || line.includes('Error:')) {
      color = 'var(--amber-warning)';
    } else if (line.startsWith('>> [SUCCESS]') || line.startsWith('>> [PHASE')) {
      color = '#00ff88';
    } else if (line.startsWith('>> [SECRET]')) {
      color = '#ff00ff';
    } else if (line.startsWith('>')) {
      color = 'var(--terminal-green)';
    }

    return (
      <div key={key} style={{ color, whiteSpace: 'pre-wrap' }}>
        {line}
      </div>
    );
  };

  const runAndPrintCommand = (command: string, echo: boolean = true) => {
    if (echo) {
      const echoNode = (
        <div key={`echo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`} style={{ color: 'var(--terminal-green)' }}>
          {`> ${command}`}
        </div>
      );
      setDisplayedHistory(prev => [...prev, echoNode]);
    }

    const results = parseCommand(command);

    if (results.length > 0) {
      if (animatingLines.length > 0) {
        const dumped = animatingLines.slice(currentLineIndex).map((line, idx) => renderLine(line, `dump-${idx}-${Math.random().toString(36).substring(2, 9)}`));
        setDisplayedHistory(prev => [...prev, ...dumped]);
      }
      
      setAnimatingLines(results);
      setCurrentLineIndex(0);
      setCurrentCharIndex(0);
    }
  };

  useEffect(() => {
    const unsub = eventBus.on('terminal-command', (command: string) => {
      runAndPrintCommand(command, true);
    });
    return unsub;
  }, [animatingLines, currentLineIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = input.trim();
      if (!command) return;

      runAndPrintCommand(command, true);
      
      // Add command to navigation history
      const nextCmdHistory = [command, ...cmdHistory.filter(c => c !== command)].slice(0, 50);
      setCmdHistory(nextCmdHistory);
      setCmdIndex(-1);

      setInput('');
    } else if (e.key === 'ArrowUp') {
      // History navigation
      if (cmdHistory.length > 0 && cmdIndex + 1 < cmdHistory.length) {
        const nextIdx = cmdIndex + 1;
        setCmdIndex(nextIdx);
        setInput(cmdHistory[nextIdx]);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (cmdIndex > 0) {
        const nextIdx = cmdIndex - 1;
        setCmdIndex(nextIdx);
        setInput(cmdHistory[nextIdx]);
      } else if (cmdIndex === 0) {
        setCmdIndex(-1);
        setInput('');
      }
      e.preventDefault();
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div 
      className="terminal-view" 
      onClick={focusInput}
      style={{
        border: '2px solid var(--terminal-green)',
        background: 'var(--panel-bg)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: '0.95rem',
        cursor: 'text',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div 
        className="terminal-output" 
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '5px',
          marginBottom: '8px',
        }}
      >
        {displayedHistory}
        
        {/* Currently animating typewriter line */}
        {animatingLines.length > 0 && (
          <div style={{ color: animatingLines[currentLineIndex].startsWith('>') ? 'var(--terminal-green)' : '#cccccc', whiteSpace: 'pre-wrap' }}>
            {animatingLines[currentLineIndex].substring(0, currentCharIndex)}
            {cursorBlink}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="terminal-input-row" style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ color: 'var(--terminal-green)', marginRight: '8px', fontWeight: 'bold' }}>&gt;_</span>
        <input 
          ref={inputRef}
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command... (optional)"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--terminal-green)',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '0.95rem',
          }}
        />
      </div>
    </div>
  );
};
