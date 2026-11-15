import { BardDisposedError, BardUnsupportedError } from './errors';
import type { BardState } from './types';

/** Gestures that count as user activation for audio unlock on every engine. */
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'keydown', 'click'] as const;

function mapState(state: string): BardState {
  switch (state) {
    case 'running':
      return 'running';
    case 'interrupted':
      return 'interrupted';
    case 'closed':
      return 'closed';
    default:
      return 'suspended';
  }
}

export interface ContextManager {
  readonly context: AudioContext | null;
  dispose(): void;
  /** Lazily creates the context; throws `BardUnsupportedError` without Web Audio. */
  ensure(): AudioContext;
  resume(): Promise<void>;
  readonly state: BardState;
  suspend(): Promise<void>;
}

/**
 * Owns the lazy `AudioContext`: creation, gesture unlock, visibility handling,
 * state reporting, and teardown. Listeners attach only once a context exists,
 * so importing and constructing on a server touches nothing global.
 */
export function createContextManager(options: {
  readonly factory?: () => AudioContext;
  readonly autoUnlock?: boolean;
  readonly autoSuspendOnHidden?: boolean;
  readonly onState: (state: BardState) => void;
}): ContextManager {
  const owned = options.factory === undefined;
  let ctx: AudioContext | null = null;
  let disposed = false;
  let suspendedByVisibility = false;
  let unlockAttached = false;

  const win: Window | undefined = typeof window === 'undefined' ? undefined : window;
  const doc: Document | undefined = typeof document === 'undefined' ? undefined : document;

  const detachUnlock = (): void => {
    if (!unlockAttached || !win) return;
    unlockAttached = false;
    for (const type of UNLOCK_EVENTS) {
      win.removeEventListener(type, onUnlock, { capture: true });
    }
  };

  function onUnlock(): void {
    // resume() must be called synchronously inside the gesture handler to
    // count as user activation; the rejection (autoplay still blocked) is
    // retried on the next gesture.
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') {
      void ctx.resume().catch(() => {});
    }
  }

  const onVisibility = (): void => {
    if (!ctx || !doc || ctx.state === 'closed') return;
    if (doc.hidden) {
      suspendedByVisibility = true;
      void ctx.suspend().catch(() => {});
    } else if (suspendedByVisibility) {
      suspendedByVisibility = false;
      void ctx.resume().catch(() => {});
    }
  };

  const onStateChange = (): void => {
    if (!ctx) return;
    const state = mapState(ctx.state);
    options.onState(state);
    if (state === 'running') detachUnlock();
  };

  return {
    get context() {
      return ctx;
    },
    dispose(): void {
      disposed = true;
      detachUnlock();
      if (doc) doc.removeEventListener('visibilitychange', onVisibility);
      if (ctx) {
        ctx.removeEventListener('statechange', onStateChange);
        // Closing is fire-and-forget; a context that fails to close is
        // abandoned by the browser once the graph is disconnected.
        if (owned && ctx.state !== 'closed') void ctx.close().catch(() => {});
      }
    },
    ensure(): AudioContext {
      if (disposed) throw new BardDisposedError('The audio engine has been disposed.');
      if (ctx) return ctx;
      if (options.factory) {
        ctx = options.factory();
      } else {
        if (typeof AudioContext === 'undefined') {
          throw new BardUnsupportedError('This runtime does not provide an AudioContext.');
        }
        ctx = new AudioContext();
      }
      ctx.addEventListener('statechange', onStateChange);
      if (options.autoUnlock !== false && win) {
        unlockAttached = true;
        for (const type of UNLOCK_EVENTS) {
          win.addEventListener(type, onUnlock, { capture: true, passive: true });
        }
      }
      if (options.autoSuspendOnHidden && doc) {
        doc.addEventListener('visibilitychange', onVisibility);
      }
      options.onState(mapState(ctx.state));
      return ctx;
    },
    async resume(): Promise<void> {
      const context = this.ensure();
      if (context.state !== 'running') await context.resume();
    },
    get state(): BardState {
      if (disposed) return 'closed';
      return ctx ? mapState(ctx.state) : 'idle';
    },
    async suspend(): Promise<void> {
      const context = this.ensure();
      if (context.state === 'running') await context.suspend();
    },
  };
}
