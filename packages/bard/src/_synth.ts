import type { BusManager } from './_bus';
import { expRampTo, MICRO_FADE, MIN_GAIN, rampParam } from './_ramp';
import { BardError } from './errors';
import type { SoundHandle, SynthOptions } from './types';

/** Cached white-noise buffer per context, reused by every noise voice. */
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseCache.set(ctx, buffer);
  return buffer;
}

interface EnvelopeTimings {
  readonly attack: number;
  readonly decay: number;
  readonly hold: number;
  readonly release: number;
  readonly sustain: number;
}

function envelopeTimings(options: SynthOptions): EnvelopeTimings {
  const duration = options.duration ?? 0.3;
  if (duration <= 0) throw new BardError(`Synth duration must be positive, got ${duration}.`);
  const env = options.envelope ?? {};
  const attack = Math.max(env.attack ?? 0.005, 0);
  const decay = Math.max(env.decay ?? 0.05, 0);
  const sustain = Math.min(Math.max(env.sustain ?? 0.6, 0), 1);
  const release = Math.max(env.release ?? 0.1, MICRO_FADE);
  const hold = Math.max(duration - attack - decay - release, 0);
  return { attack, decay, hold, release, sustain };
}

/**
 * Zero-asset sound generator: oscillator (or cached noise buffer) through an
 * optional biquad into an ADSR gain, straight onto a bus. Nodes disconnect in
 * `onended`, so a fire-and-forget beep leaves nothing behind.
 */
export function playSynth(deps: {
  readonly context: () => AudioContext;
  readonly buses: () => BusManager;
  readonly onEnded: (bus: string) => void;
  readonly onStarted: (bus: string) => void;
}): (options: SynthOptions) => SoundHandle {
  return (options) => {
    const ctx = deps.context();
    const busName = options.bus ?? 'sfx';
    const bus = deps.buses().get(busName);
    const timings = envelopeTimings(options);
    const volume = Math.min(Math.max(options.volume ?? 1, 0), 1);
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(Math.max(volume, MIN_GAIN), now + timings.attack);
    gain.gain.linearRampToValueAtTime(
      Math.max(volume * timings.sustain, MIN_GAIN),
      now + timings.attack + timings.decay,
    );
    const releaseAt = now + timings.attack + timings.decay + timings.hold;
    gain.gain.setValueAtTime(Math.max(volume * timings.sustain, MIN_GAIN), releaseAt);
    gain.gain.linearRampToValueAtTime(0, releaseAt + timings.release);

    let filter: BiquadFilterNode | null = null;
    if (options.filter) {
      filter = ctx.createBiquadFilter();
      filter.type = options.filter.type;
      if (options.filter.q !== undefined) filter.Q.value = options.filter.q;
      const [from, to] =
        typeof options.filter.frequency === 'number'
          ? [options.filter.frequency, options.filter.frequency]
          : options.filter.frequency;
      filter.frequency.setValueAtTime(from, now);
      if (to !== from) expRampTo(filter.frequency, to, timings.attack + timings.decay + timings.hold, now);
      filter.connect(gain);
    }

    let panner: StereoPannerNode | null = null;
    if (options.pan !== undefined) {
      panner = ctx.createStereoPanner();
      panner.pan.value = options.pan;
      gain.connect(panner);
      panner.connect(bus.input);
    } else {
      gain.connect(bus.input);
    }

    const isNoise = options.type === 'noise';
    const source: AudioBufferSourceNode | OscillatorNode = isNoise ? ctx.createBufferSource() : ctx.createOscillator();
    if (isNoise) {
      (source as AudioBufferSourceNode).buffer = noiseBuffer(ctx);
      (source as AudioBufferSourceNode).loop = true;
      if (options.freq !== undefined && !filter) {
        // Without an explicit filter, noise sweeps through a bandpass.
        filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        const [from, to] = typeof options.freq === 'number' ? [options.freq, options.freq] : options.freq;
        filter.frequency.setValueAtTime(from, now);
        if (to !== from) expRampTo(filter.frequency, to, timings.attack + timings.decay + timings.hold, now);
        filter.connect(gain);
      }
    } else {
      const osc = source as OscillatorNode;
      osc.type = (options.type ?? 'sine') as OscillatorType;
      const [from, to] =
        typeof options.freq === 'number' || options.freq === undefined
          ? [options.freq ?? 440, options.freq ?? 440]
          : options.freq;
      osc.frequency.setValueAtTime(Math.max(from, MIN_GAIN), now);
      if (to !== from) expRampTo(osc.frequency, to, timings.attack + timings.decay + timings.hold, now);
      if (options.detune !== undefined) osc.detune.value = options.detune;
    }
    if (filter) {
      source.connect(filter);
    } else {
      source.connect(gain);
    }

    const total = timings.attack + timings.decay + timings.hold + timings.release;
    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    let settled = false;
    let stopped = false;

    const teardown = (): void => {
      try {
        source.disconnect();
      } catch {
        // Already disconnected.
      }
      filter?.disconnect();
      gain.disconnect();
      panner?.disconnect();
    };

    deps.onStarted(busName);
    source.addEventListener(
      'ended',
      () => {
        teardown();
        if (!settled) {
          settled = true;
          deps.onEnded(busName);
          resolveFinished();
        }
      },
      { once: true },
    );

    const handle: SoundHandle = {
      dispose(): void {
        if (stopped) return;
        stopped = true;
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
        teardown();
        if (!settled) {
          settled = true;
          deps.onEnded(busName);
          resolveFinished();
        }
      },
      get disposed() {
        return stopped;
      },
      finished,
      setPan(value): void {
        if (panner) panner.pan.value = Math.min(Math.max(value, -1), 1);
      },
      setVolume(value, fadeOptions): void {
        rampParam(gain.gain, Math.min(Math.max(value, 0), 1), fadeOptions?.fade ?? MICRO_FADE, ctx.currentTime);
      },
      stop(fadeOptions): void {
        if (stopped) return;
        stopped = true;
        const fade = fadeOptions?.fade ?? MICRO_FADE;
        rampParam(gain.gain, 0, fade, ctx.currentTime);
        try {
          source.stop(ctx.currentTime + fade);
        } catch {
          // Already stopped.
        }
      },
      [Symbol.dispose](): void {
        handle.dispose();
      },
    };

    source.start(now);
    // Schedule the natural end so 'ended' fires even for looping noise.
    source.stop(now + total);
    return handle;
  };
}
