// useRefineHmr.ts
//
// Encapsulates the Vite HMR subscription for refine CSS hot-patching.
// Centralising this here means REFINE_CSS_HMR_EVENT and its payload shape
// are handled in one place — consumers just pass a callback.

import { REFINE_CSS_HMR_EVENT } from '../../../plugins/component-preview/constants';

/**
 * Subscribes to the refine CSS HMR event in dev mode and calls `onUpdate`
 * with the new CSS string whenever refine's dist CSS changes.
 * No-ops in production (import.meta.hot is undefined).
 */
export function useRefineHmr(onUpdate: (css: string) => void): void {
  if (import.meta.hot) {
    import.meta.hot.on(REFINE_CSS_HMR_EVENT, ({ css }: { css: string }) => {
      onUpdate(css);
    });
  }
}
