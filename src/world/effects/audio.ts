/**
 * Procedural Web Audio API sound generator for winter ambiance:
 * - Howling wind gusts through courtyard buildings
 * - Realistic crunchy snow footsteps when walking and running
 */
export class WinterAudioSystem {
  private ctx: AudioContext | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private isWindPlaying = false;
  private lastFootstepTime = 0;

  public enabled = true;
  public volume = 0.6;
  public bgmVolume = 0.65;

  private bgmAudio: HTMLAudioElement | null = null;
  private isBgmPlaying = false;

  private initContext(): void {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Starts ambient howling wind
   */
  public startWind(): void {
    if (this.isWindPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    // Buffer of white noise
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Resonant bandpass filter to shape wind tone
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // Wind volume gain
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(this.volume * 0.28, this.ctx.currentTime);

    whiteNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);

    whiteNoise.start();
    this.isWindPlaying = true;

    // Random slow wind frequency modulation (gusts)
    setInterval(() => {
      if (this.windFilter && this.ctx && this.isWindPlaying) {
        const targetFreq = 260 + Math.random() * 320;
        this.windFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 1.8);
      }
    }, 2400);
  }

  /**
   * Synthesizes authentic crisp crunch of boots stepping on frozen snow
   */
  public playSnowFootstep(isRunning: boolean = false): void {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = Date.now();
    const interval = isRunning ? 320 : 480; // milliseconds between steps
    if (now - this.lastFootstepTime < interval) return;
    this.lastFootstepTime = now;

    const t = this.ctx.currentTime;
    const duration = isRunning ? 0.12 : 0.16;

    // Filtered noise burst for snow compression crunch
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + (Math.random() - 0.5) * 300, t);
    filter.Q.setValueAtTime(2.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseSource.start(t);
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(this.volume * 0.28, this.ctx.currentTime, 0.2);
    }
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.volume * this.bgmVolume;
    }
  }

  /**
   * Starts background atmospheric music stream from mp3
   */
  public startBgm(): void {
    if (this.isBgmPlaying && this.bgmAudio && !this.bgmAudio.paused) return;

    if (!this.bgmAudio) {
      this.bgmAudio = new Audio('./audio/a-coldcore-playlist-SnapYT.App.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.preload = 'auto';
    }

    this.bgmAudio.volume = this.volume * this.bgmVolume;
    const playPromise = this.bgmAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isBgmPlaying = true;
        })
        .catch((err) => {
          console.warn('Audio autoplay delayed until user click:', err);
        });
    }
  }

  public stopBgm(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.isBgmPlaying = false;
    }
  }

  public setBgmVolume(val: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.volume * this.bgmVolume;
    }
  }
}

