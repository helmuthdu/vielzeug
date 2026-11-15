import type { BusManager } from './_bus';
import type { Loader } from './_loader';
import { parseSpriteKey, resolveSprite } from './_loader';
import { MICRO_FADE, MIN_GAIN, rampParam, sampleRange } from './_ramp';
import { BardError } from './errors';
import type { PlayOptions, SoundHandle } from './types';

interface VoiceRecord {
  readonly bus: string;
  readonly finish: () => void;
  readonly gain: GainNode;
  readonly key: string;
  readonly panner: StereoPannerNode | null;
  readonly source: AudioBufferSourceNode;
  stopped: boolean;
}

export interface VoicePool {
  dispose(): void;
  /** Starts a buffered sound; throws `BardError` for unknown keys. */
  play(key: string, options?: PlayOptions): SoundHandle;
  stopAll(fade: number): void;
  /** Stops every voice for the given asset keys (used by `unload`). */
  stopKeys(keys: readonly string[]): void;
  /** Registers an externally built voice (deck slots) under the pool's caps and ducking. */
  track(record: VoiceRecord): void;
  /** Removes a tracked voice (called when the owner ends it). */
  untrack(record: VoiceRecord): void;
}

/**
 * Voice registry: per-key and global caps with oldest-first stealing (a 10 ms
 * fade before the hard stop, so stealing does not click), organic detune/rate
 * variance, and the `SoundHandle` contract.
 */
export function createVoicePool(deps: {
  readonly context: () => AudioContext;
  readonly loader: Loader;
  readonly buses: () => BusManager;
  readonly maxVoices: number;
  readonly onSteal: (key: string | null) => void;
}): VoicePool {
  const voices = new Set<VoiceRecord>();
  let disposed = false;

  const release = (record: VoiceRecord): void => {
    if (!voices.delete(record)) return;
    deps.buses().voiceCount(record.bus, -1);
    record.finish();
  };

  const teardown = (record: VoiceRecord): void => {
    try {
      record.source.disconnect();
    } catch {
      // Already disconnected.
    }
    record.gain.disconnect();
    record.panner?.disconnect();
  };

  const fadeOut = (record: VoiceRecord, fade: number): void => {
    if (record.stopped) return;
    record.stopped = true;
    const ctx = deps.context();
    rampParam(record.gain.gain, 0, fade, ctx.currentTime);
    const stopAt = ctx.currentTime + fade;
    try {
      record.source.stop(stopAt);
    } catch {
      // Already stopped.
    }
    // Teardown happens on 'ended'; a source that never started ends on its own.
    record.source.addEventListener(
      'ended',
      () => {
        teardown(record);
        release(record);
      },
      { once: true },
    );
  };

  /** Steals the oldest voice matching `predicate`, if any. */
  const stealOldest = (predicate: (v: VoiceRecord) => boolean): boolean => {
    for (const record of voices) {
      if (predicate(record) && !record.stopped) {
        deps.onSteal(record.key);
        fadeOut(record, MICRO_FADE);
        return true;
      }
    }
    return false;
  };

  return {
    dispose(): void {
      disposed = true;
      for (const record of [...voices]) {
        try {
          record.source.stop();
        } catch {
          // Already stopped.
        }
        teardown(record);
        release(record);
      }
      voices.clear();
    },
    play(key, options = {}): SoundHandle {
      if (disposed) throw new BardError('The voice pool is disposed.');
      const ctx = deps.context();
      const sprite = parseSpriteKey(key);
      const assetKey = sprite?.asset ?? key;
      const asset = deps.loader.get(assetKey);
      if (!asset) throw new BardError(`Sound "${key}" is not loaded.`);
      const busName = options.bus ?? 'sfx';
      const bus = deps.buses().get(busName);

      const region = sprite ? resolveSprite(asset, sprite.sprite, key) : undefined;
      const loop = options.loop ?? false;
      const offset = options.offset ?? region?.offset ?? 0;

      const source = ctx.createBufferSource();
      source.buffer = asset.buffer;
      if (loop) {
        source.loop = true;
        if (options.loopStart !== undefined) source.loopStart = options.loopStart;
        else if (region) source.loopStart = region.offset;
        if (options.loopEnd !== undefined) source.loopEnd = options.loopEnd;
        else if (region) source.loopEnd = region.offset + region.duration;
      }
      const rate = sampleRange(options.rate, options.random ?? Math.random);
      if (rate !== undefined) source.playbackRate.value = rate;
      const detune = sampleRange(options.detune, options.random ?? Math.random);
      if (detune !== undefined) source.detune.value = detune;

      const gain = ctx.createGain();
      const volume = options.volume ?? 1;
      if (options.fadeIn && options.fadeIn > 0) {
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(Math.max(volume, MIN_GAIN), ctx.currentTime + options.fadeIn);
      } else {
        gain.gain.value = volume;
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
      source.connect(gain);

      let resolveFinished!: () => void;
      const finished = new Promise<void>((resolve) => {
        resolveFinished = resolve;
      });
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        resolveFinished();
      };

      const record: VoiceRecord = {
        bus: busName,
        finish,
        gain,
        key,
        panner,
        source,
        stopped: false,
      };

      const handle: SoundHandle = {
        dispose(): void {
          if (record.stopped) {
            finish();
            return;
          }
          record.stopped = true;
          try {
            record.source.stop();
          } catch {
            // Already stopped.
          }
          teardown(record);
          release(record);
        },
        get disposed() {
          return record.stopped;
        },
        finished,
        setPan(panValue): void {
          if (panner) panner.pan.value = Math.min(Math.max(panValue, -1), 1);
        },
        setVolume(volumeValue, fadeOptions): void {
          rampParam(gain.gain, Math.min(Math.max(volumeValue, 0), 1), fadeOptions?.fade ?? MICRO_FADE, ctx.currentTime);
        },
        stop(fadeOptions): void {
          fadeOut(record, fadeOptions?.fade ?? MICRO_FADE);
        },
        [Symbol.dispose](): void {
          handle.dispose();
        },
      };

      // Enforce caps before starting: per-key first, then global.
      if (options.maxVoices !== undefined) {
        while ([...voices].filter((v) => v.key === key && !v.stopped).length >= options.maxVoices) {
          if (!stealOldest((v) => v.key === key)) break;
        }
      }
      for (;;) {
        const active = [...voices].filter((v) => !v.stopped).length;
        if (active < deps.maxVoices) break;
        if (!stealOldest((v) => !v.stopped)) break;
      }

      voices.add(record);
      deps.buses().voiceCount(busName, 1);
      source.addEventListener(
        'ended',
        () => {
          teardown(record);
          release(record);
        },
        { once: true },
      );
      // A looping source never ends on its own; it releases on stop/dispose.
      source.start(ctx.currentTime, offset, loop ? undefined : region?.duration);
      return handle;
    },
    stopAll(fade): void {
      for (const record of [...voices]) fadeOut(record, fade);
    },
    stopKeys(keys): void {
      for (const record of [...voices]) {
        const assetKey = parseSpriteKey(record.key)?.asset ?? record.key;
        if (keys.includes(assetKey)) fadeOut(record, MICRO_FADE);
      }
    },
    track(record): void {
      voices.add(record);
      deps.buses().voiceCount(record.bus, 1);
    },
    untrack(record): void {
      release(record);
    },
  };
}
