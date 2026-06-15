// src/engine/GameLoop.ts

const TICK_RATE_MS = 50; // 20 ticks per second

export class GameLoop {
  private lastTimestamp: number = 0;
  private accumulator: number = 0;
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private tickCallbacks: Array<(tickDelta: number) => void> = [];
  private renderCallbacks: Array<(frameDelta: number) => void> = [];

  public onTick(cb: (tickDelta: number) => void): void {
    this.tickCallbacks.push(cb);
  }

  public onRender(cb: (frameDelta: number) => void): void {
    this.renderCallbacks.push(cb);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  public stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.isRunning = false;
    this.rafId = null;
  }

  private frame = (timestamp: number): void => {
    const frameDelta = Math.min(timestamp - this.lastTimestamp, 200); // Cap at 200ms to avoid spiral of death
    this.lastTimestamp = timestamp;
    this.accumulator += frameDelta;

    // Fixed-step tick dispatch
    while (this.accumulator >= TICK_RATE_MS) {
      this.tickCallbacks.forEach(cb => cb(TICK_RATE_MS));
      this.accumulator -= TICK_RATE_MS;
    }

    // Variable-step render dispatch (once per frame)
    this.renderCallbacks.forEach(cb => cb(frameDelta));

    if (this.isRunning) {
      this.rafId = requestAnimationFrame(this.frame);
    }
  };
}

export const gameLoop = new GameLoop();
