import type { BusManager } from './_bus';
import type { Loader } from './_loader';
import type { MediaSessionManager, MediaSessionOwner } from './_media-session';
import { MICRO_FADE, rampParam } from './_ramp';
import type { StreamManager } from './_stream';
import type { VoicePool } from './_voices';
import { BardError } from './errors';
import type { DeckOptions, MusicDeck, QueueOptions, SoundHandle, TransitionOptions } from './types';

interface Slot {
  /** Control handle for the slot's voice; assigned for every slot kind. */
  handle: SoundHandle | null;
  readonly key: string;
  /** Resolves `crossfade` seconds before the track ends; never resolves for loops. */
  nearlyOver(crossfade: number): Promise<void>;
  /** Pauses playback and returns the current offset in seconds. */
  pause(): number;
  /**
   * Fades out and releases the slot's audible output. `keepElement` tells a
   * streamed slot its element was handed to a replacement slot for the same
   * track (pause -> play reuses the cached `<audio>` element), so teardown must
   * disconnect the old gain stage without pausing the shared element.
   */
  stop(fade: number, keepElement?: boolean): void;
}

interface DeckDeps {
  readonly buses: () => BusManager;
  readonly context: () => AudioContext;
  readonly loader: Loader;
  readonly mediaSession: MediaSessionManager;
  readonly onTrack: (key: string | null) => void;
  readonly pool: VoicePool;
  readonly streams: StreamManager;
}

/**
 * Two-slot crossfading music deck: game-state transitions (`transition`),
 * continuous ambient playback (`queue`), and optional Media Session ownership.
 * Buffered assets play through the voice pool; streamed assets through their
 * owned `<audio>` element with a per-slot gain stage.
 */
export function createDeck(deps: DeckDeps, options: DeckOptions = {}): MusicDeck {
  const busName = options.bus ?? 'music';
  const defaultFade = options.fade ?? 2;
  let slot: Slot | null = null;
  let queue: readonly string[] = [];
  let queueIndex = -1;
  let queueOptions: QueueOptions = {};
  let queueToken = 0;
  let session: MediaSessionOwner | null = null;
  let disposed = false;
  let paused = false;
  let pausedKey: string | null = null;
  let pausedOffset = 0;

  if (options.mediaSession) {
    session = deps.mediaSession.claim({
      onNextTrack: () => deck.next(),
      onPause: () => deck.pause(),
      onPlay: () => deck.play(),
      onPreviousTrack: () => deck.previous(),
      onStop: () => deck.stop(),
    });
  }

  const setSessionState = (state: MediaSessionPlaybackState): void => {
    session?.setPlaybackState(state);
  };

  const setSessionMeta = (key: string | null): void => {
    if (!session) return;
    if (key === null) {
      session.setMetadata(undefined, '');
      return;
    }
    session.setMetadata(deps.loader.definitionOf(key)?.meta, key);
  };

  /** A handle for streamed slots, which have no pooled voice. */
  const streamHandle = (target: Slot): SoundHandle => {
    let stopped = false;
    const finished = new Promise<void>((resolve) => {
      void target.nearlyOver(0).then(resolve);
    });
    const handle: SoundHandle = {
      dispose(): void {
        handle.stop({ fade: 0 });
      },
      get disposed() {
        return stopped;
      },
      finished,
      setPan(): void {
        // Streamed slot pan follows the bus routing.
      },
      setVolume(): void {
        // Streamed slot volume follows the bus.
      },
      stop(fadeOptions): void {
        if (stopped) return;
        stopped = true;
        target.stop(fadeOptions?.fade ?? defaultFade);
      },
      [Symbol.dispose](): void {
        handle.dispose();
      },
    };
    return handle;
  };

  /** Starts one asset into a new slot; throws for unknown keys. */
  const startSlot = (key: string, transition: TransitionOptions, fadeIn: number): Slot => {
    const ctx = deps.context();
    const bus = deps.buses().get(busName);
    const definition = deps.loader.definitionOf(key);
    if (definition?.stream) {
      if (transition.loopStart !== undefined || transition.loopEnd !== undefined) {
        throw new BardError(
          `Streamed track "${key}" cannot use loopStart/loopEnd; streamed loops cover the whole file.`,
        );
      }
      const stream = deps.streams.ensure(key, definition);
      const gain = ctx.createGain();
      stream.source.connect(gain);
      gain.connect(bus.input);
      if (fadeIn > 0) {
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeIn);
      } else {
        gain.gain.value = 1;
      }
      const element = stream.element;
      element.loop = transition.loop ?? false;
      if (transition.offset !== undefined) element.currentTime = transition.offset;
      void element.play().catch(() => {
        // Autoplay rejection; the unlock gesture path retries playback.
      });
      let stopped = false;
      const streamSlot: Slot = {
        handle: null,
        key,
        async nearlyOver(crossfade): Promise<void> {
          if (element.loop) return new Promise<void>(() => {});
          const total = element.duration;
          if (Number.isFinite(total)) {
            const wait = Math.max(total - element.currentTime - crossfade, 0) * 1000;
            await new Promise<void>((resolve) => setTimeout(resolve, wait));
            return;
          }
          // Metadata not ready yet: fall back to timeupdate polling.
          await new Promise<void>((resolve) => {
            const onTime = (): void => {
              const dur = element.duration;
              if (Number.isFinite(dur) && dur - element.currentTime <= crossfade) {
                element.removeEventListener('timeupdate', onTime);
                resolve();
              }
            };
            element.addEventListener('timeupdate', onTime);
            element.addEventListener(
              'ended',
              () => {
                element.removeEventListener('timeupdate', onTime);
                resolve();
              },
              { once: true },
            );
          });
        },
        pause(): number {
          element.pause();
          return element.currentTime;
        },
        stop(fade, keepElement): void {
          if (stopped) return;
          stopped = true;
          const teardown = (): void => {
            if (!keepElement) element.pause();
            try {
              gain.disconnect();
            } catch {
              // Already disconnected.
            }
          };
          if (fade <= 0) {
            if (!keepElement) element.pause();
            gain.gain.value = 0;
            teardown();
            return;
          }
          rampParam(gain.gain, 0, fade, ctx.currentTime);
          setTimeout(teardown, fade * 1000);
        },
      };
      streamSlot.handle = streamHandle(streamSlot);
      return streamSlot;
    }

    // Buffered path through the voice pool.
    if (!deps.loader.has(key)) throw new BardError(`Track "${key}" is not loaded.`);
    const startedAt = ctx.currentTime;
    const handle = deps.pool.play(key, {
      bus: busName,
      fadeIn: fadeIn > 0 ? fadeIn : undefined,
      loop: transition.loop,
      loopEnd: transition.loopEnd,
      loopStart: transition.loopStart,
      offset: transition.offset,
    });
    let stopped = false;
    return {
      handle,
      key,
      async nearlyOver(crossfade): Promise<void> {
        if (transition.loop) return new Promise<void>(() => {});
        const asset = deps.loader.get(key);
        const total = asset ? asset.buffer.duration : Infinity;
        const wait = Math.max(total - (transition.offset ?? 0) - crossfade, 0) * 1000;
        await new Promise<void>((resolve) => setTimeout(resolve, wait));
      },
      pause(): number {
        if (stopped) return pausedOffset;
        stopped = true;
        handle.stop({ fade: MICRO_FADE });
        return (transition.offset ?? 0) + (ctx.currentTime - startedAt);
      },
      stop(fade): void {
        if (stopped) return;
        stopped = true;
        handle.stop({ fade });
      },
    };
  };

  const beginTrack = (key: string, transition: TransitionOptions): SoundHandle => {
    const fade = transition.fade ?? defaultFade;
    const previous = slot;
    const next = startSlot(key, transition, fade);
    slot = next;
    paused = false;
    // Restarting the same key (pause -> play, or transition while paused) reuses the
    // cached stream element: the outgoing slot must not pause what the new slot just resumed.
    if (previous) previous.stop(fade, previous.key === key);
    deps.onTrack(key);
    setSessionMeta(key);
    setSessionState('playing');
    const handle = next.handle;
    if (!handle) throw new BardError(`Slot "${key}" was created without a handle.`);
    return handle;
  };

  /** Schedules the automatic crossfade to the next queued track. */
  const scheduleAdvance = (active: Slot): void => {
    const token = queueToken;
    const crossfade = queueOptions.crossfade ?? defaultFade;
    void active.nearlyOver(crossfade).then(() => {
      if (disposed || token !== queueToken || slot !== active) return;
      advance(1);
    });
  };

  const advance = (delta: number): void => {
    if (queue.length === 0) return;
    let index = queueIndex + delta;
    if (index >= queue.length) {
      if (!queueOptions.repeat) {
        queue = [];
        return;
      }
      index = 0;
    } else if (index < 0) {
      index = queueOptions.repeat ? queue.length - 1 : 0;
    }
    queueIndex = index;
    const key = queue[index];
    if (key === undefined) return;
    beginTrack(key, { fade: queueOptions.crossfade ?? defaultFade, loop: false });
    if (slot) scheduleAdvance(slot);
  };

  const deck: MusicDeck = {
    get current() {
      return slot?.key ?? null;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      queueToken += 1;
      if (slot) slot.stop(0);
      slot = null;
      session?.release();
      session = null;
    },
    get disposed() {
      return disposed;
    },
    next(): void {
      if (disposed) throw new BardError('The deck is disposed.');
      if (queue.length === 0) return;
      queueToken += 1;
      advance(1);
    },
    pause(): void {
      if (disposed || !slot || paused) return;
      // Invalidate any pending queue auto-advance: a track "ending" while paused
      // must not silently resume playback with the next queued track.
      queueToken += 1;
      pausedKey = slot.key;
      pausedOffset = slot.pause();
      paused = true;
      setSessionState('paused');
    },
    play(): void {
      if (disposed || !paused || pausedKey === null) return;
      const key = pausedKey;
      const offset = pausedOffset;
      pausedKey = null;
      beginTrack(key, { fade: MICRO_FADE, offset });
      // Reschedule the queue auto-advance that pause() cancelled, for the fresh slot.
      if (queue.length > 0 && slot) scheduleAdvance(slot);
    },
    get playing() {
      return slot !== null && !paused;
    },
    previous(): void {
      if (disposed) throw new BardError('The deck is disposed.');
      if (queue.length === 0) return;
      queueToken += 1;
      advance(-1);
    },
    queue(keys, queueOpts = {}): void {
      if (disposed) throw new BardError('The deck is disposed.');
      queue = [...keys];
      queueOptions = queueOpts;
      queueToken += 1;
      if (queueOpts.shuffle) {
        const random = queueOpts.random ?? Math.random;
        const shuffled = [...queue];
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
          const j = Math.min(Math.floor(random() * (i + 1)), i);
          const a = shuffled[i];
          const b = shuffled[j];
          if (a !== undefined && b !== undefined) {
            shuffled[i] = b;
            shuffled[j] = a;
          }
        }
        queue = shuffled;
      }
      queueIndex = -1;
      if (queue.length > 0) advance(1);
    },
    stop(options = {}): void {
      if (disposed) return;
      queue = [];
      queueIndex = -1;
      queueToken += 1;
      if (slot) slot.stop(options.fade ?? defaultFade);
      slot = null;
      paused = false;
      pausedKey = null;
      deps.onTrack(null);
      setSessionMeta(null);
      setSessionState('none');
    },
    transition(key, transition = {}): SoundHandle {
      if (disposed) throw new BardError('The deck is disposed.');
      if (key === slot?.key && !paused && slot.handle && !slot.handle.disposed) {
        return slot.handle;
      }
      // A manual transition takes over from the queue.
      queue = [];
      queueIndex = -1;
      queueToken += 1;
      return beginTrack(key, transition);
    },
    [Symbol.dispose](): void {
      deck.dispose();
    },
  };
  return deck;
}
