import { DEFAULT_ATTACK, DEFAULT_RELEASE, MICRO_FADE, rampParam } from './_ramp';
import { BardError } from './errors';
import type { BusController, DuckingRule } from './types';

export interface Bus {
  readonly controller: BusController;
  /** Current duck level (1 = unducked). */
  readonly duckLevel: number;
  /** Where voices connect; the bus's input gain. */
  readonly input: GainNode;
  readonly name: string;
}

interface BusInternal extends Bus {
  /** Active voice count per ducking source (this bus as ducking target's partner). */
  disconnect(): void;
  readonly duckGain: GainNode;
  duckLevel: number;
  muted: boolean;
  userVolume: number;
  readonly volumeGain: GainNode;
}

export interface BusManager {
  dispose(): void;
  get(name: string): Bus;
  readonly master: GainNode;
  /** All routable bus names including `'master'`. */
  names(): readonly string[];
  /** Adjusts the active-voice count on `source` and ramps every ducked target. */
  voiceCount(source: string, delta: number): void;
}

/**
 * The routing graph: `voice -> [panner] -> bus input -> bus duck -> bus volume
 * -> master -> destination`. Ducking gets its own gain stage so user volume
 * automation and duck automation never fight over one `AudioParam`.
 */
export function createBusManager(options: {
  readonly context: AudioContext;
  readonly buses: readonly string[];
  readonly volume: number;
  readonly ducking: readonly DuckingRule[];
  readonly onDuck?: (bus: string, level: number, ramp: number) => void;
}): BusManager {
  const ctx = options.context;
  const master = ctx.createGain();
  master.gain.value = options.volume;
  master.connect(ctx.destination);

  const buses = new Map<string, BusInternal>();

  const createBus = (name: string): BusInternal => {
    const input = ctx.createGain();
    const duckGain = ctx.createGain();
    const volumeGain = ctx.createGain();
    input.connect(duckGain);
    duckGain.connect(volumeGain);
    volumeGain.connect(master);
    const internal: BusInternal = {
      get controller(): BusController {
        return controller;
      },
      disconnect(): void {
        input.disconnect();
        duckGain.disconnect();
        volumeGain.disconnect();
      },
      duckGain,
      duckLevel: 1,
      input,
      muted: false,
      name,
      userVolume: 1,
      volumeGain,
    };
    const controller: BusController = {
      get duckLevel() {
        return internal.duckLevel;
      },
      mute(): void {
        internal.muted = true;
        applyVolume();
      },
      get muted() {
        return internal.muted;
      },
      name,
      setVolume(volume, fadeOptions): void {
        internal.userVolume = Math.min(Math.max(volume, 0), 1);
        rampParam(
          volumeGain.gain,
          internal.muted ? 0 : internal.userVolume,
          fadeOptions?.fade ?? MICRO_FADE,
          ctx.currentTime,
        );
      },
      unmute(): void {
        internal.muted = false;
        applyVolume();
      },
      get volume() {
        return internal.userVolume;
      },
    };
    const applyVolume = (): void => {
      rampParam(volumeGain.gain, internal.muted ? 0 : internal.userVolume, MICRO_FADE, ctx.currentTime);
    };
    return internal;
  };

  for (const name of options.buses) {
    buses.set(name, createBus(name));
  }

  let masterMuted = false;
  let masterVolume = options.volume;
  const masterController: BusController = {
    get duckLevel() {
      return 1;
    },
    mute(): void {
      masterMuted = true;
      rampParam(master.gain, 0, MICRO_FADE, ctx.currentTime);
    },
    get muted() {
      return masterMuted;
    },
    name: 'master',
    setVolume(volume, fadeOptions): void {
      masterVolume = Math.min(Math.max(volume, 0), 1);
      rampParam(master.gain, masterMuted ? 0 : masterVolume, fadeOptions?.fade ?? MICRO_FADE, ctx.currentTime);
    },
    unmute(): void {
      masterMuted = false;
      rampParam(master.gain, masterVolume, MICRO_FADE, ctx.currentTime);
    },
    get volume() {
      return masterVolume;
    },
  };

  /** Active voices per bus name, for ducking sources. */
  const voiceCounts = new Map<string, number>();
  /** Current duck multiplier per ducked target bus. */
  const duckLevels = new Map<string, number>();

  const applyDuck = (target: string): void => {
    const bus = buses.get(target);
    if (!bus) return;
    const active = options.ducking
      .filter((rule) => rule.target === target)
      .map((rule) => ({ ducking: (voiceCounts.get(rule.source) ?? 0) > 0, rule }))
      .filter((entry) => entry.ducking)
      .map((entry) => entry.rule.gain);
    const wanted = active.length > 0 ? Math.min(...active) : 1;
    const current = duckLevels.get(target) ?? 1;
    if (wanted === current) return;
    duckLevels.set(target, wanted);
    bus.duckLevel = wanted;
    const rule = options.ducking.find((r) => r.target === target && (r.gain === wanted || wanted === 1));
    const ramp = wanted < current ? (rule?.attack ?? DEFAULT_ATTACK) : (rule?.release ?? DEFAULT_RELEASE);
    rampParam(bus.duckGain.gain, wanted, ramp, ctx.currentTime);
    options.onDuck?.(target, wanted, ramp);
  };

  return {
    dispose(): void {
      for (const bus of buses.values()) bus.disconnect();
      master.disconnect();
    },
    get(name: string): Bus {
      if (name === 'master') {
        return {
          controller: masterController,
          duckLevel: 1,
          input: master,
          name: 'master',
        };
      }
      const bus = buses.get(name);
      if (!bus) throw new BardError(`Unknown bus "${name}".`);
      return bus;
    },
    master,
    names(): readonly string[] {
      return [...buses.keys(), 'master'];
    },
    voiceCount(source, delta): void {
      if (!buses.has(source)) return;
      const next = Math.max(0, (voiceCounts.get(source) ?? 0) + delta);
      voiceCounts.set(source, next);
      for (const target of new Set(
        options.ducking.filter((rule) => rule.source === source).map((rule) => rule.target),
      )) {
        applyDuck(target);
      }
    },
  };
}
