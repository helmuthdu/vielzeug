import { createMediaQuery } from '@vielzeug/sentinel';

export type Scheme = 'dark' | 'light';

const STORAGE_KEY = 'brettzeug:scheme';

/** Refine's dark-mode contract: toggle `dark` on `<html>`, nothing else. */
const apply = (scheme: Scheme): void => {
  document.documentElement.classList.toggle('dark', scheme === 'dark');
};

const stored = (): Scheme | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
};

/**
 * Resolves the active scheme (stored choice, else OS preference), applies it,
 * and keeps following the OS until the visitor picks one. Returns the current
 * scheme reader, a setter, and a disposer for the OS subscription.
 */
export function initScheme(): { current: () => Scheme; dispose: () => void; set: (scheme: Scheme) => void } {
  let choice = stored();
  let media: ReturnType<typeof createMediaQuery> | null = null;
  try {
    media = createMediaQuery('(prefers-color-scheme: dark)');
  } catch {
    media = null;
  }

  const system = (): Scheme => (media?.getSnapshot().matches ? 'dark' : 'light');
  const current = (): Scheme => choice ?? system();

  apply(current());
  const unsubscribe = media?.subscribe(() => {
    if (!choice) apply(system());
  });

  return {
    current,
    dispose: () => {
      unsubscribe?.();
      media?.dispose();
    },
    set: (scheme) => {
      choice = scheme;
      apply(scheme);
      try {
        localStorage.setItem(STORAGE_KEY, scheme);
      } catch {
        // Private mode or blocked storage: the choice still applies for this visit.
      }
    },
  };
}
