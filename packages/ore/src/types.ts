/**
 * Shared component phase and lifecycle event constants.
 * Extracted to a standalone module to break the circular dependency
 * between registration.ts and errors.ts.
 */

// ─── ComponentPhase ───────────────────────────────────────────────────────────

export const ComponentPhase = {
  LOADING: 'loading',
  SETUP_DONE: 'setup_done',
  SETUP_RUNNING: 'setup_running',
  UNINITIALIZED: 'uninitialized',
  UNMOUNTED: 'unmounted',
} as const;

export type ComponentPhase = (typeof ComponentPhase)[keyof typeof ComponentPhase];

// ─── Lifecycle events ─────────────────────────────────────────────────────────

export const LIFECYCLE_EVENTS = {
  CONNECT: 'ore:connect',
  DISCONNECT: 'ore:disconnect',
} as const;

export type LifecycleEventName = (typeof LIFECYCLE_EVENTS)[keyof typeof LIFECYCLE_EVENTS];
