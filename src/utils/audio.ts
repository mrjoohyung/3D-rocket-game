/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SpaceSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private ambientOscs: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode }[] = [];
  private isMuted: boolean = false;
  private chordIndex: number = 0;
  private chordIntervalId: any = null;

  // Space drone chords (expressed as frequency sets for nice ambient pads)
  // Major7th, Minor7th lush voicing chords
  private chords = [
    [110, 165, 220, 330], // Am7 base (A2, E3, A3, E4)
    [116.54, 174.61, 233.08, 349.23], // A#Maj7 / BbMaj7 (Bb2, F3, Bb3, F4)
    [98, 146.83, 196, 293.66], // G (G2, D3, G3, D4)
    [130.81, 196, 261.63, 392], // C6/9 (C3, G3, C4, G4)
  ];

  constructor() {
    // Left empty. Lazily initialized on user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Start engine rumble and ambient pads
      this.startEngineHum();
      this.startAmbientLushMusic();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const val = muted ? 0 : 0.8;
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    }
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  private startEngineHum() {
    if (!this.ctx || !this.masterGain) return;

    try {
      // Combines flat triangle at 45Hz and sine at 90Hz for rich spaceship vibration
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.setValueAtTime(42, this.ctx.currentTime); // low sub base

      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // gentle hum

      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();
    } catch (e) {
      console.error(e);
    }
  }

  public updateEngineHum(speedRatio: number, pitchOffset: number) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || this.isMuted) return;

    // Pitch increases with speed and tilt steering
    const targetFreq = 42 + speedRatio * 35 + pitchOffset * 10;
    const targetVolume = 0.06 + speedRatio * 0.08;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.15);
  }

  public playCollect(streak: number = 0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // High-pitched crystal dynamic scale
      const baseFreq = 587.33; // D5
      // Increase note on streak count
      const steps = [1, 1.2, 1.25, 1.33, 1.5, 1.66, 1.875, 2.0];
      const stepIdx = Math.min(streak, steps.length - 1);
      const frequency = baseFreq * (steps[stepIdx] || 1);

      // Main chime
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(frequency, now);
      // Sweep pitch up slightly for happy feeling
      chimeOsc.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + 0.18);

      chimeGain.gain.setValueAtTime(0.25, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain);
      chimeOsc.start(now);
      chimeOsc.stop(now + 0.45);

      // Harmonious auxiliary sparkle note (fifth)
      const sparkleOsc = this.ctx.createOscillator();
      const sparkleGain = this.ctx.createGain();

      sparkleOsc.type = 'triangle';
      sparkleOsc.frequency.setValueAtTime(frequency * 1.5, now + 0.04);
      sparkleGain.gain.setValueAtTime(0.12, now + 0.04);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(this.masterGain);
      sparkleOsc.start(now + 0.04);
      sparkleOsc.stop(now + 0.28);
    } catch (e) {
      console.error(e);
    }
  }

  public playStreakBonus() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, now); // C6 clear swell
      osc.frequency.exponentialRampToValueAtTime(2093.00, now + 0.3); // Arpeggiates to C7

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.error(e);
    }
  }

  public playEngineSwell(isActivelyMoving: boolean) {
    if (!this.ctx || !this.masterGain || !this.engineOsc || this.isMuted) return;
    const now = this.ctx.currentTime;
    const boostPitch = isActivelyMoving ? 58 : 42;
    this.engineOsc.frequency.setTargetAtTime(boostPitch, now, 0.2);
  }

  private startAmbientLushMusic() {
    if (!this.ctx || !this.masterGain) return;

    // We cycle pads dynamically
    const runChordCycle = () => {
      if (!this.ctx || !this.masterGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const chord = this.chords[this.chordIndex];

      // Spawn two oscillators for lush pad harmonics
      chord.forEach((freq, idx) => {
        // Fade in chord note
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        // Alternate waveforms for celestial filtering effect
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Slow vibrato (LFO)
        const lfo = this.ctx!.createOscillator();
        const lfoGain = this.ctx!.createGain();
        lfo.frequency.value = 0.5 + Math.random() * 0.5; // low frequency
        lfoGain.gain.value = 4; // vibrato range

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        // Pad styling (envelope filtering)
        gain.gain.setValueAtTime(0.0, now);
        // Fade in slowly over 2.5 seconds
        gain.gain.linearRampToValueAtTime(0.035, now + 2.5);
        // Fade out slowly after 5 seconds
        gain.gain.setValueAtTime(0.035, now + 4.5);
        gain.gain.linearRampToValueAtTime(0.0, now + 7.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        lfo.stop(now + 8);
        osc.stop(now + 8);
      });

      this.chordIndex = (this.chordIndex + 1) % this.chords.length;
    };

    // Run first immediately
    runChordCycle();
    // Run every 7.5 seconds
    this.chordIntervalId = setInterval(runChordCycle, 7500);
  }

  public shutdown() {
    if (this.chordIntervalId) {
      clearInterval(this.chordIntervalId);
    }
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch (e) {}
    }
    this.ambientOscs.forEach(o => {
      try { o.osc1.stop(); o.osc2.stop(); } catch (e) {}
    });
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const spaceAudio = new SpaceSoundSynthesizer();
