import type { BurstKind, GameState } from "../sim/index";

interface Tone {
  frequency: number;
  endFrequency?: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
}

const burstTones: Partial<Record<BurstKind, Tone>> = {
  jump: { frequency: 330, endFrequency: 520, duration: 0.12, volume: 0.1 },
  dash: {
    frequency: 180,
    endFrequency: 90,
    duration: 0.1,
    volume: 0.09,
    type: "sawtooth",
  },
  sigil: { frequency: 740, endFrequency: 1120, duration: 0.28, volume: 0.11 },
  transform: {
    frequency: 220,
    endFrequency: 440,
    duration: 0.24,
    volume: 0.1,
    type: "triangle",
  },
  break: {
    frequency: 110,
    endFrequency: 55,
    duration: 0.26,
    volume: 0.15,
    type: "square",
  },
  anchor: { frequency: 480, endFrequency: 820, duration: 0.2, volume: 0.1 },
  slam: {
    frequency: 150,
    endFrequency: 70,
    duration: 0.18,
    volume: 0.12,
    type: "sawtooth",
  },
  shockwave: {
    frequency: 90,
    endFrequency: 45,
    duration: 0.32,
    volume: 0.17,
    type: "square",
  },
  defeat: {
    frequency: 260,
    endFrequency: 80,
    duration: 0.3,
    volume: 0.13,
    type: "triangle",
  },
  hit: {
    frequency: 120,
    endFrequency: 65,
    duration: 0.22,
    volume: 0.14,
    type: "square",
  },
  pulse: {
    frequency: 190,
    endFrequency: 120,
    duration: 0.25,
    volume: 0.1,
    type: "sine",
  },
  dispel: { frequency: 520, endFrequency: 860, duration: 0.2, volume: 0.1 },
  strike: {
    frequency: 240,
    endFrequency: 130,
    duration: 0.14,
    volume: 0.12,
    type: "triangle",
  },
};

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastBurstId = 0;
  private wonPlayed = false;
  private muted = false;
  private paused = false;
  private lastSeed: number | null = null;
  private lastTick = 0;

  get isMuted(): boolean {
    return this.muted;
  }

  get lastConsumedBurstId(): number {
    return this.lastBurstId;
  }

  unlock(): void {
    if (this.context === null) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);
      this.startAmbient();
    }
    if (!this.paused && this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  toggleMuted(): void {
    this.muted = !this.muted;
    this.applyMasterGain();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (this.context === null) return;
    if (paused) void this.context.suspend();
    else if (!this.muted) void this.context.resume();
  }

  sync(state: GameState): void {
    if (
      this.lastSeed !== null &&
      (state.seed !== this.lastSeed || state.tick < this.lastTick)
    ) {
      this.lastBurstId = 0;
      this.wonPlayed = false;
    }
    this.lastSeed = state.seed;
    this.lastTick = state.tick;
    for (const burst of state.bursts) {
      if (burst.id <= this.lastBurstId) continue;
      this.lastBurstId = Math.max(this.lastBurstId, burst.id);
      if (!this.muted && this.context !== null && this.master !== null) {
        const tone = burstTones[burst.kind];
        if (tone) this.playTone(tone);
      }
    }

    if (state.status === "won" && !this.wonPlayed) {
      this.wonPlayed = true;
      if (!this.muted && this.context !== null && this.master !== null) {
        this.playChord([392, 523.25, 659.25], 0.7, 0.07);
      }
    } else if (state.status === "playing") {
      this.wonPlayed = false;
    }
  }

  private applyMasterGain(): void {
    if (this.context === null || this.master === null) return;
    const target = this.muted ? 0 : 0.16;
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.02);
  }

  private startAmbient(): void {
    if (this.context === null || this.master === null) return;
    const ambientGain = this.context.createGain();
    ambientGain.gain.value = 0.035;
    ambientGain.connect(this.master);
    for (const [frequency, detune] of [
      [82.41, -5],
      [123.47, 4],
    ] as const) {
      const oscillator = this.context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      oscillator.connect(ambientGain);
      oscillator.start();
    }
  }

  private playTone(tone: Tone): void {
    if (this.context === null || this.master === null) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = tone.type ?? "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, tone.endFrequency ?? tone.frequency),
      now + tone.duration,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(tone.volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + tone.duration + 0.02);
  }

  private playChord(
    frequencies: number[],
    duration: number,
    volume: number,
  ): void {
    for (const frequency of frequencies) {
      this.playTone({
        frequency,
        endFrequency: frequency * 1.01,
        duration,
        volume,
        type: "triangle",
      });
    }
  }
}
