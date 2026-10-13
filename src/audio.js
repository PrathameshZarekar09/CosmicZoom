/**
 * CosmicAudioEngine - Procedural Web Audio Synthesizer
 * Zero external audio files required, ultra-low latency, tailored for WebXR Meta Quest 3.
 */

class CosmicAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.isMuted = false;
    this.currentStage = 0;

    // Ambient nodes
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientFilter = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.setupAmbientDrone();
      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext initialization failed:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupAmbientDrone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Deep cosmic resonant base
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc1.type = 'sine';
    this.ambientOsc1.frequency.setValueAtTime(55, t);

    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientOsc2.type = 'triangle';
    this.ambientOsc2.frequency.setValueAtTime(110, t);

    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.setValueAtTime(220, t);
    this.ambientFilter.Q.setValueAtTime(3.0, t);

    this.ambientOsc1.connect(this.ambientFilter);
    this.ambientOsc2.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientGain);

    this.ambientOsc1.start();
    this.ambientOsc2.start();
  }

  updateStageAmbient(stageIndex) {
    if (!this.ctx || !this.ambientFilter) return;
    this.currentStage = stageIndex;
    const t = this.ctx.currentTime;

    // Smoothly blend drone characteristics based on scale
    // 0: Universe (deep 40Hz) -> 4: Human (warm 120Hz) -> 8: Quantum (ethereal high 440Hz shimmer)
    const baseFreqs = [45, 55, 65, 82, 110, 146, 220, 330, 440];
    const targetFreq = baseFreqs[stageIndex] || 55;

    this.ambientOsc1.frequency.exponentialRampToValueAtTime(targetFreq, t + 1.2);
    this.ambientOsc2.frequency.exponentialRampToValueAtTime(targetFreq * 1.5, t + 1.2);
    this.ambientFilter.frequency.exponentialRampToValueAtTime(targetFreq * 2.8, t + 1.2);
  }

  playPinch(pitch = 1.0) {
    if (!this.ensurePlayable()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(240 * pitch, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  playZoom(speed = 1.0) {
    if (!this.ensurePlayable()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(320 * Math.max(0.5, speed), t + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.35);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  playClick() {
    if (!this.ensurePlayable()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  playChirp(type = 'happy') {
    if (!this.ensurePlayable()) return;
    const t = this.ctx.currentTime;

    const notes = type === 'happy' ? [523.25, 659.25, 783.99, 1046.5] :
                  type === 'curious' ? [440, 554.37, 659.25] :
                  type === 'excited' ? [659.25, 880, 1174.66, 1318.51] :
                  [392, 440, 523.25];

    notes.forEach((freq, idx) => {
      const start = t + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, start + 0.05);

      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.055);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.06);
    });
  }

  playQuantumHit(collapsed = false) {
    if (!this.ensurePlayable()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = collapsed ? 'sine' : 'triangle';
    const freq = collapsed ? 320 : (600 + Math.random() * 400);
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.06);

    gain.gain.setValueAtTime(collapsed ? 0.22 : 0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  playOrbitalShift() {
    if (!this.ensurePlayable()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.28);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  playHeartbeat() {
    if (!this.ensurePlayable()) return;
    const t = this.ctx.currentTime;

    // Lub (low deep pulse)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(65, t);
    osc1.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.14);

    // Dub (slightly higher pulse shortly after)
    const t2 = t + 0.18;
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(80, t2);
    osc2.frequency.exponentialRampToValueAtTime(40, t2 + 0.1);
    gain2.gain.setValueAtTime(0.25, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.11);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.12);
  }

  playSuccess() {
    if (!this.ensurePlayable()) return;
    const t = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C major 9th
    chord.forEach((freq, idx) => {
      const start = t + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  ensurePlayable() {
    if (this.isMuted) return false;
    this.ensureContext();
    return this.initialized && this.ctx && this.ctx.state === 'running';
  }
}

export const audio = new CosmicAudioEngine();
