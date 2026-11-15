/**
 * Public types for `@vielzeug/bard`.
 */

/** Lifecycle state of the engine's audio context. */
export type BardState = 'idle' | 'suspended' | 'running' | 'interrupted' | 'closed';

/** One artwork entry for Media Session metadata. */
export interface MediaImage {
  readonly sizes?: string;
  readonly src: string;
  readonly type?: string;
}

/** Descriptive metadata for an asset, used by Media Session integration. */
export interface AssetMeta {
  readonly album?: string;
  readonly artist?: string;
  readonly artwork?: readonly MediaImage[];
  readonly title?: string;
}

/** Full form of a manifest entry. */
export interface AssetDefinition {
  readonly meta?: AssetMeta;
  /** Named regions `[startSec, durationSec]` inside the file, played as `"key:name"`. */
  readonly sprites?: Readonly<Record<string, readonly [start: number, duration: number]>>;
  readonly src: string;
  /**
   * Stream through an owned `HTMLAudioElement` instead of decoding into an
   * `AudioBuffer`. Deck-only: `play()` on a streamed key throws.
   */
  readonly stream?: boolean;
}

/** A manifest maps sound keys to a URL or a full definition. */
export type AssetManifest = Readonly<Record<string, string | AssetDefinition>>;

/** Options for {@link SoundHandle.stop} and volume ramps. */
export interface FadeOptions {
  /** Crossfade seconds; defaults to a 15 ms micro-fade that avoids clicks. */
  readonly fade?: number;
}

/** A lightweight control over one started sound. */
export interface SoundHandle {
  /** Stops immediately and releases the owned nodes. */
  dispose(): void;
  readonly disposed: boolean;
  /** Resolves once the sound has ended, been stopped, or been disposed. */
  readonly finished: Promise<void>;
  /** Sets the stereo pan (-1..1). */
  setPan(pan: number): void;
  /** Ramps the voice volume (linear 0..1). */
  setVolume(volume: number, options?: FadeOptions): void;
  /** Fades out and stops the sound; the fade defaults to a click-free micro-fade. */
  stop(options?: FadeOptions): void;
  /** Calls {@link SoundHandle.dispose}. */
  [Symbol.dispose](): void;
}

/** Options for {@link Bard.play}. */
export interface PlayOptions {
  /** Destination bus; defaults to `'sfx'`. */
  readonly bus?: string;
  /** Detune in cents, or a `[min, max]` range sampled per voice. */
  readonly detune?: number | readonly [min: number, max: number];
  /** Fade-in seconds from 0 to `volume`. */
  readonly fadeIn?: number;
  /** Loop the buffer (or the sprite region when combined with `loopStart`/`loopEnd`). */
  readonly loop?: boolean;
  /** Loop end in buffer seconds (absolute, not sprite-relative). */
  readonly loopEnd?: number;
  /** Loop start in buffer seconds (absolute, not sprite-relative). */
  readonly loopStart?: number;
  /** Concurrent voice cap for this key; unlimited when omitted (the global cap still applies). */
  readonly maxVoices?: number;
  /** Start offset in seconds. */
  readonly offset?: number;
  /** Initial stereo pan (-1..1). */
  readonly pan?: number;
  /** Random source for range sampling; inject a deterministic one in tests. */
  readonly random?: () => number;
  /**
   * Playback rate, or a `[min, max]` range sampled per voice. Note: rate
   * shifts pitch on buffer sources; pitch-preserving playback belongs on an
   * `HTMLAudioElement`.
   */
  readonly rate?: number | readonly [min: number, max: number];
  /** Linear volume 0..1; defaults to 1. */
  readonly volume?: number;
}

/** A cross-bus ducking rule: while `source` has active voices, `target` ducks to `gain`. */
export interface DuckingRule {
  /** Seconds to reach the duck level; defaults to 0.2. */
  readonly attack?: number;
  /** Duck level as linear gain 0..1. */
  readonly gain: number;
  /** Seconds to return to 1; defaults to 0.8. */
  readonly release?: number;
  readonly source: string;
  readonly target: string;
}

/** Control over one mixing bus. */
export interface BusController {
  /** Current duck level (linear gain; 1 means unducked). */
  readonly duckLevel: number;
  mute(): void;
  readonly muted: boolean;
  readonly name: string;
  setVolume(volume: number, options?: FadeOptions): void;
  unmute(): void;
  /** Current user volume (linear 0..1). */
  readonly volume: number;
}

/** Waveform for {@link SynthOptions}; `'noise'` plays a cached white-noise buffer. */
export type SynthWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

/** ADSR envelope in seconds; `sustain` is a 0..1 level. */
export interface SynthEnvelope {
  readonly attack?: number;
  readonly decay?: number;
  readonly release?: number;
  readonly sustain?: number;
}

/** Biquad filter stage for {@link SynthOptions}. A tuple sweeps the cutoff. */
export interface SynthFilter {
  readonly frequency: number | readonly [from: number, to: number];
  readonly q?: number;
  readonly type: BiquadFilterType;
}

/** Options for {@link Bard.synth}. */
export interface SynthOptions {
  /** Destination bus; defaults to `'sfx'`. */
  readonly bus?: string;
  /** Detune in cents (oscillator only). */
  readonly detune?: number;
  /** Total audible length in seconds including the release; defaults to 0.3. */
  readonly duration?: number;
  readonly envelope?: SynthEnvelope;
  readonly filter?: SynthFilter;
  /** Frequency in Hz, or a `[from, to]` exponential sweep. For `'noise'` it maps to the filter cutoff. */
  readonly freq?: number | readonly [from: number, to: number];
  readonly pan?: number;
  /** Random source for internal sampling; inject a deterministic one in tests. */
  readonly random?: () => number;
  readonly type?: SynthWaveform;
  readonly volume?: number;
}

/** Options for {@link MusicDeck.transition}. */
export interface TransitionOptions {
  /** Crossfade seconds; defaults to the deck's `fade`. */
  readonly fade?: number;
  readonly loop?: boolean;
  readonly loopEnd?: number;
  readonly loopStart?: number;
  /** Start offset in seconds (buffered assets; streamed assets seek too). */
  readonly offset?: number;
}

/** Options for {@link MusicDeck.queue}. */
export interface QueueOptions {
  /** Seconds of overlap before each track end; defaults to the deck's `fade`. */
  readonly crossfade?: number;
  /** Random source for the shuffle; inject a deterministic one in tests. */
  readonly random?: () => number;
  readonly repeat?: boolean;
  readonly shuffle?: boolean;
}

/** A two-slot crossfading music deck. */
export interface MusicDeck {
  /** The key currently playing, or `null`. */
  readonly current: string | null;
  dispose(): void;
  readonly disposed: boolean;
  /** Crossfades to the next queued track; a no-op without a queue. */
  next(): void;
  pause(): void;
  play(): void;
  readonly playing: boolean;
  /** Crossfades to the previous queued track; a no-op without a queue. */
  previous(): void;
  /** Replaces the queue and starts its first track with a crossfade. */
  queue(keys: readonly string[], options?: QueueOptions): void;
  stop(options?: FadeOptions): void;
  /** Crossfades to `key`; transitioning to the current key is a no-op. */
  transition(key: string, options?: TransitionOptions): SoundHandle;
  /** Calls {@link MusicDeck.dispose}. */
  [Symbol.dispose](): void;
}

/** Options for {@link Bard.createDeck}. */
export interface DeckOptions {
  /** Destination bus; defaults to `'music'`. */
  readonly bus?: string;
  /** Default crossfade seconds; defaults to 2. */
  readonly fade?: number;
  /** Claim `navigator.mediaSession` for this deck; at most one deck may own it. */
  readonly mediaSession?: boolean;
}

/** Options for {@link createBard}. */
export interface BardOptions {
  /** Suspend when the page hides and resume when it shows again; defaults to false. */
  readonly autoSuspendOnHidden?: boolean;
  /** Attach gesture listeners that resume a suspended context on first interaction; defaults to true. */
  readonly autoUnlock?: boolean;
  /** User bus names; defaults to `['music', 'sfx', 'voice']`. `'master'` is implicit and reserved. */
  readonly buses?: readonly string[];
  /** Context factory; defaults to a lazily constructed `AudioContext`. Injection seam for tests. */
  readonly context?: () => AudioContext;
  readonly ducking?: readonly DuckingRule[];
  /** Global concurrent voice cap; defaults to 32. */
  readonly maxVoices?: number;
  /** Master volume (linear 0..1); defaults to 1. */
  readonly volume?: number;
}

/** Observability events emitted through {@link Bard.tap}. */
export type BardEvent =
  | { readonly type: 'state'; readonly state: BardState }
  | { readonly type: 'load'; readonly key: string }
  | { readonly type: 'load-error'; readonly key: string; readonly error: unknown }
  | { readonly type: 'steal'; readonly key: string | null }
  | { readonly type: 'duck'; readonly bus: string; readonly level: number; readonly ramp: number }
  | { readonly type: 'track'; readonly key: string | null }
  | { readonly type: 'dispose' };

/** The engine returned by `createBard()`. */
export interface Bard {
  /** The controller for a bus; throws `BardError` for unknown names. */
  bus(name: string): BusController;
  /** The native context for advanced graph work; `null` until first use. */
  readonly context: AudioContext | null;
  createDeck(options?: DeckOptions): MusicDeck;
  readonly disposalSignal: AbortSignal;

  /** Tear down every node, listener, and owned context. Idempotent. */
  dispose(): void;
  readonly disposed: boolean;
  /** Whether `key` (or its parent asset for `'key:sprite'`) is loaded. */
  has(key: string): boolean;
  /** Fetch and decode every manifest entry, deduplicating concurrent loads of the same URL. */
  load(manifest: AssetManifest, options?: { readonly signal?: AbortSignal }): Promise<void>;
  /** Start a loaded sound; throws `BardError` for unknown keys and streamed assets. */
  play(key: string, options?: PlayOptions): SoundHandle;
  resume(): Promise<void>;
  /** Context lifecycle state; `'idle'` until the first lazy creation. */
  readonly state: BardState;

  suspend(): Promise<void>;
  /** Start a procedurally generated sound. */
  synth(options: SynthOptions): SoundHandle;

  /** Observe runtime behavior; see `BardEvent`. */
  tap(handler: (event: BardEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  /** Drop loaded assets (all when omitted), stopping their active voices. */
  unload(keys?: string | readonly string[]): void;

  /** Create the context (when needed) and resume it; rejects with `BardUnsupportedError` without Web Audio. */
  unlock(): Promise<void>;
  /** Calls {@link Bard.dispose}. */
  [Symbol.dispose](): void;
}
