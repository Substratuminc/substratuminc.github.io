// src/main.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initializeTick } from './engine/Tick';
import { gameLoop } from './engine/GameLoop';
import { asciiAnimator } from './engine/AsciiAnimator';
import { saveManager } from './persistence/SaveManager';
import { useGameStore } from './store/gameStore';

// Initialize the 20Hz Tick loop
initializeTick();

// Bind ASCII animator tick to the render callback (60fps animation)
gameLoop.onRender((_delta) => {
  asciiAnimator.tick(performance.now());
});

// Start the game loop
gameLoop.start();

// Start the triple-layer auto save (every 30 seconds)
saveManager.startAutoSave(() => useGameStore.getState());

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
