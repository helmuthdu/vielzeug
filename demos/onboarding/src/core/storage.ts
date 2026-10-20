import type { BeaconProgress, BeaconStorage } from '@vielzeug/beacon';

const KEY_PREFIX = 'vielzeug-onboarding:';

/**
 * A {@link BeaconStorage} over `localStorage`, so tour and coachmark progress
 * survives reloads. Beacon stores plain JSON records, so this is a thin
 * get/remove/set bridge. Every access is guarded: private-mode Safari throws on
 * `localStorage`, and a demo that cannot persist should still run its tours
 * in-memory for the session rather than crash.
 */
export function createLocalBeaconStorage(): BeaconStorage {
  const store = safeLocalStorage();

  return {
    get(key) {
      if (!store) return null;
      try {
        const raw = store.getItem(KEY_PREFIX + key);

        return raw === null ? null : (JSON.parse(raw) as BeaconProgress);
      } catch {
        return null;
      }
    },
    remove(key) {
      try {
        store?.removeItem(KEY_PREFIX + key);
      } catch {
        /* storage unavailable: progress simply is not persisted */
      }
    },
    set(key, value) {
      try {
        store?.setItem(KEY_PREFIX + key, JSON.stringify(value));
      } catch {
        /* quota or private mode: fall back to this session only */
      }
    },
  };
}

function safeLocalStorage(): Storage | null {
  try {
    const probe = '__beacon_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);

    return window.localStorage;
  } catch {
    return null;
  }
}
