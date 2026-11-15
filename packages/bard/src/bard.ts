import { type BusManager, createBusManager } from './_bus';
import { type ContextManager, createContextManager } from './_context';
import { createDeck } from './_deck';
import { createLoader, type Loader, parseSpriteKey } from './_loader';
import { createMediaSession, type MediaSessionManager } from './_media-session';
import { createStreams, type StreamManager } from './_stream';
import { playSynth } from './_synth';
import { createTappers } from './_tappers';
import { createVoicePool, type VoicePool } from './_voices';
import { BardDisposedError, BardError } from './errors';
import type {
  AssetManifest,
  Bard,
  BardEvent,
  BardOptions,
  BardState,
  BusController,
  DeckOptions,
  MusicDeck,
  SoundHandle,
  SynthOptions,
} from './types';

const DEFAULT_BUSES = ['music', 'sfx', 'voice'] as const;

/**
 * Creates a lifecycle-owned Web Audio engine. Nothing touches `window`,
 * `document`, or `AudioContext` until the first method that needs audio runs
 * in the browser, so importing on a server is safe.
 */
export function createBard(options: BardOptions = {}): Bard {
  const tappers = createTappers<BardEvent>();
  const disposal = new AbortController();
  let disposed = false;
  let state: BardState = 'idle';

  const busNames = options.buses ? [...options.buses] : [...DEFAULT_BUSES];
  if (busNames.includes('master')) {
    throw new BardError('"master" is a reserved bus name and cannot be declared in options.buses.');
  }

  // navigator.mediaSession is only touched when a deck opts in.
  let mediaSessionRef: MediaSessionManager | null = null;
  const mediaSession: MediaSessionManager = {
    claim(handlers) {
      mediaSessionRef ??= createMediaSession();
      return mediaSessionRef.claim(handlers);
    },
  };

  let contextManager: ContextManager | null = null;
  let loader: Loader | null = null;
  let streams: StreamManager | null = null;
  let buses: BusManager | null = null;
  let pool: VoicePool | null = null;
  const decks = new Set<MusicDeck>();

  const ensureContext = (): AudioContext => {
    if (disposed) throw new BardDisposedError('The audio engine has been disposed.');
    if (!contextManager) {
      contextManager = createContextManager({
        autoSuspendOnHidden: options.autoSuspendOnHidden,
        autoUnlock: options.autoUnlock,
        factory: options.context,
        onState: (next) => {
          state = next;
          tappers.emit({ state: next, type: 'state' });
        },
      });
    }
    const ctx = contextManager.ensure();
    if (!loader || !buses || !pool || !streams) {
      loader = createLoader(ctx);
      streams = createStreams(ctx);
      buses = createBusManager({
        buses: busNames,
        context: ctx,
        ducking: options.ducking ?? [],
        onDuck: (bus, level, ramp) => tappers.emit({ bus, level, ramp, type: 'duck' }),
        volume: options.volume ?? 1,
      });
      pool = createVoicePool({
        buses: () => buses as BusManager,
        context: () => ctx,
        loader,
        maxVoices: options.maxVoices ?? 32,
        onSteal: (key) => tappers.emit({ key, type: 'steal' }),
      });
    }
    return ctx;
  };

  const requirePool = (): VoicePool => {
    ensureContext();
    return pool as VoicePool;
  };

  const playSynthSound = (synthOptions: SynthOptions): SoundHandle => {
    const ctx = ensureContext();
    return playSynth({
      buses: () => buses as BusManager,
      context: () => ctx,
      onEnded: (bus) => (buses as BusManager).voiceCount(bus, -1),
      onStarted: (bus) => (buses as BusManager).voiceCount(bus, 1),
    })(synthOptions);
  };

  const bard: Bard = {
    bus(name): BusController {
      ensureContext();
      return (buses as BusManager).get(name).controller;
    },
    get context() {
      return contextManager?.context ?? null;
    },
    createDeck(deckOptions: DeckOptions = {}): MusicDeck {
      const ctx = ensureContext();
      const deck = createDeck(
        {
          buses: () => buses as BusManager,
          context: () => ctx,
          loader: loader as Loader,
          mediaSession,
          onTrack: (key) => tappers.emit({ key, type: 'track' }),
          pool: pool as VoicePool,
          streams: streams as StreamManager,
        },
        deckOptions,
      );
      decks.add(deck);
      return deck;
    },
    get disposalSignal() {
      return disposal.signal;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      tappers.emit({ type: 'dispose' });
      tappers.stop();
      disposal.abort();
      for (const deck of decks) deck.dispose();
      decks.clear();
      pool?.dispose();
      streams?.dispose();
      loader?.dispose();
      buses?.dispose();
      contextManager?.dispose();
      state = 'closed';
    },
    get disposed() {
      return disposed;
    },
    has(key): boolean {
      if (!loader) return false;
      const assetKey = parseSpriteKey(key)?.asset ?? key;
      return loader.has(assetKey);
    },
    async load(manifest: AssetManifest, loadOptions): Promise<void> {
      ensureContext();
      try {
        const streamKeys = Object.entries(manifest)
          .filter(([, entry]) => typeof entry === 'object' && entry.stream === true)
          .map(([key]) => key);
        await (loader as Loader).load(manifest, loadOptions);
        for (const key of streamKeys) {
          const definition = (loader as Loader).definitionOf(key);
          if (definition) (streams as StreamManager).ensure(key, definition);
        }
        for (const key of Object.keys(manifest)) tappers.emit({ key, type: 'load' });
      } catch (error) {
        for (const key of Object.keys(manifest)) tappers.emit({ error, key, type: 'load-error' });
        throw error;
      }
    },
    play(key, playOptions): SoundHandle {
      return requirePool().play(key, playOptions);
    },
    async resume(): Promise<void> {
      await contextManager?.resume();
    },
    get state() {
      return contextManager?.state ?? state;
    },
    async suspend(): Promise<void> {
      await contextManager?.suspend();
    },
    synth(synthOptions): SoundHandle {
      return playSynthSound(synthOptions);
    },
    tap: tappers.tap,
    unload(keys): void {
      if (disposed) return;
      const list = keys === undefined ? (loader?.keys() ?? []) : typeof keys === 'string' ? [keys] : keys;
      pool?.stopKeys(list);
      for (const key of list) {
        const stream = streams?.get(key);
        if (stream) stream.disconnect();
      }
      loader?.unload(list);
    },
    async unlock(): Promise<void> {
      ensureContext();
      await contextManager?.resume();
    },
    [Symbol.dispose](): void {
      bard.dispose();
    },
  };
  return bard;
}
