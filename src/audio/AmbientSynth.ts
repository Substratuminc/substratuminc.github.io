// src/audio/AmbientSynth.ts
// Generates low-frequency procedural drones with LFO modulation.

import * as Tone from 'tone';

class AmbientSynth {
  private oscillator: Tone.Oscillator | null = null;
  private filter: Tone.Filter | null = null;
  private lfo: Tone.LFO | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private isStarted = false;

  public async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    try {
      // Unlock audio context if needed
      await Tone.start();

      // Create a low dark synth loop
      this.filter = new Tone.Filter({
        type: 'lowpass',
        frequency: 150,
        Q: 2,
      }).toDestination();

      this.oscillator = new Tone.Oscillator({
        frequency: 55, // A1 note
        type: 'sawtooth',
      }).connect(this.filter);

      this.lfo = new Tone.LFO({
        frequency: 0.1, // very slow cutoff sweep
        min: 80,
        max: 200,
      }).connect(this.filter.frequency);

      this.delay = new Tone.FeedbackDelay({
        delayTime: 0.8,
        feedback: 0.6,
      }).connect(this.filter);

      // Start the components
      this.lfo.start();
      this.oscillator.start();
      
      // Set volume
      Tone.getDestination().volume.value = -12; // lower volume by default
    } catch (e) {
      console.warn('Tone.js synth start failed (waiting for user interaction):', e);
      this.isStarted = false;
    }
  }

  public stop(): void {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.dispose();
    }
    if (this.lfo) {
      this.lfo.stop();
      this.lfo.dispose();
    }
    if (this.delay) {
      this.delay.dispose();
    }
    if (this.filter) {
      this.filter.dispose();
    }
    
    this.oscillator = null;
    this.filter = null;
    this.lfo = null;
    this.delay = null;
    this.isStarted = false;
  }

  public setVolume(volRatio: number): void {
    // Translate ratio 0..1 to decibels -40..0
    if (volRatio <= 0) {
      Tone.getDestination().mute = true;
    } else {
      Tone.getDestination().mute = false;
      const db = Tone.gainToDb(volRatio) - 6; // adjust range
      Tone.getDestination().volume.value = db;
    }
  }
}

export const ambientSynth = new AmbientSynth();
export default ambientSynth;
