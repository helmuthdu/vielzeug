// ── DevTools hook — core stub ─────────────────────────────────────────────────
//
// This module is intentionally minimal: it only holds the module-level _hook
// variable and exposes getDevToolsHook() for the hot paths in signal.ts,
// computed.ts, effect.ts, and store.ts.
//
// installDevTools() lives in the @vielzeug/ripple/devtools sub-path and is
// tree-shaken from production bundles when that sub-path is never imported.
// setDevToolsHook() is the internal bridge called by installDevTools().

import type { RippleDevToolsHook } from './types';

let _hook: RippleDevToolsHook | null = null;

/** Returns the currently installed DevTools hook, or `null` if none is installed. */
export const getDevToolsHook = (): RippleDevToolsHook | null => _hook;

/** @internal Called only by `installDevTools` in `@vielzeug/ripple/devtools`. */
export const setDevToolsHook = (hook: RippleDevToolsHook | null): void => {
  _hook = hook;
};
