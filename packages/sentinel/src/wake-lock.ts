import { resolveWindow } from './_platform.ts';
import { createSentinel } from './core.ts';
import type { SentinelOptions, WakeLockSentinel, WakeLockState } from './types.ts';

type WakeLockWindow = Window & { document: Document };

export function createWakeLock(options?: SentinelOptions & { readonly target?: WakeLockWindow }): WakeLockSentinel {
  const target = resolveWindow(options?.target);
  const navigator = target.navigator;
  const supported = typeof navigator.wakeLock?.request === 'function';

  let handle: globalThis.WakeLockSentinel | null = null;
  let pending = false;
  let wantsLock = false;

  const read = (): WakeLockState => ({ active: handle !== null, supported });
  let updateState: (value: WakeLockState) => void = () => {};

  async function acquire(): Promise<void> {
    if (!supported || !navigator.wakeLock) return;
    pending = true;
    try {
      const requested = await navigator.wakeLock.request('screen');
      // release()/dispose() during the pending request must not leave the lock held.
      if (!wantsLock) {
        void requested.release();

        return;
      }
      handle = requested;
      handle.addEventListener('release', () => {
        handle = null;
        updateState(read());
      });
      updateState(read());
    } catch {
      // Not supported, denied, or not in a secure context: degrade silently.
    } finally {
      pending = false;
    }
  }

  const sentinel = createSentinel<WakeLockState>({ initialValue: read(), ...options }, (update) => {
    updateState = update;

    const onVisibilityChange = (): void => {
      if (target.document.visibilityState === 'visible' && wantsLock && !handle && !pending) {
        void acquire();
      }
    };

    target.document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      target.document.removeEventListener('visibilitychange', onVisibilityChange);
      if (handle) void handle.release();
      handle = null;
      wantsLock = false;
    };
  });

  return {
    ...sentinel,
    release(): void {
      wantsLock = false;
      if (handle) {
        void handle.release();
        handle = null;
        updateState(read());
      }
    },
    request(): void {
      if (handle || pending || !supported) return;
      wantsLock = true;
      void acquire();
    },
  };
}
