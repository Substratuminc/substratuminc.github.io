// src/engine/AsciiAnimator.ts
// Manages frame-indexed character cycle animations, updated per render frame.

import { useState, useEffect } from 'react';

export interface CharCycleAnimation {
  id: string;
  frames: string[];       // Array of character strings to cycle through
  intervalMs: number;     // How often to advance a frame
  currentFrame: number;
  lastAdvanceTime: number;
}

export class AsciiAnimator {
  private animations = new Map<string, CharCycleAnimation>();
  private listeners = new Set<(id: string, frame: string) => void>();

  constructor() {
    // Register some default animations from Section 1.6
    // Blinking cursor
    this.register({
      id: 'cursor',
      frames: ['_', ' '],
      intervalMs: 530,
    });

    // Pipeline flow animations
    this.register({
      id: 'pipeline_flow',
      frames: ['───►', '──►─', '─►──', '►───'],
      intervalMs: 200,
    });

    // Status dots
    this.register({
      id: 'status_active',
      frames: ['●', '•'], // subtle pulse
      intervalMs: 600,
    });
    
    this.register({
      id: 'status_failed',
      frames: ['●', ' '], // rapid flash
      intervalMs: 400,
    });
  }

  public register(anim: Omit<CharCycleAnimation, 'currentFrame' | 'lastAdvanceTime'>): void {
    this.animations.set(anim.id, { ...anim, currentFrame: 0, lastAdvanceTime: 0 });
  }

  public tick(nowMs: number): void {
    for (const [id, anim] of this.animations.entries()) {
      if (nowMs - anim.lastAdvanceTime >= anim.intervalMs) {
        anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length;
        anim.lastAdvanceTime = nowMs;
        this.notify(id, anim.frames[anim.currentFrame]);
      }
    }
  }

  public getFrame(id: string): string {
    const anim = this.animations.get(id);
    if (!anim) return '';
    return anim.frames[anim.currentFrame];
  }

  public subscribe(cb: (id: string, frame: string) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(id: string, frame: string): void {
    this.listeners.forEach(cb => cb(id, frame));
  }
}

export const asciiAnimator = new AsciiAnimator();

// React hook to subscribe to animations
export function useAsciiFrame(animId: string): string {
  const [frame, setFrame] = useState(() => asciiAnimator.getFrame(animId));

  useEffect(() => {
    // Initial fetch
    setFrame(asciiAnimator.getFrame(animId));

    const unsubscribe = asciiAnimator.subscribe((id, newFrame) => {
      if (id === animId) {
        setFrame(newFrame);
      }
    });

    return unsubscribe;
  }, [animId]);

  return frame;
}
