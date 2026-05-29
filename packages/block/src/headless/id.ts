// ── Stable ID generation ──────────────────────────────────────────────────────
// Local alternative to craft's createId — keeps the headless layer's ID
// generation independent of the rendering framework. IDs are unique per page
// load; the short random tag prevents collisions across multiple app instances.

let _counter = 0;
const _tag = Math.random().toString(36).slice(2, 6);

/**
 * Generates a stable, unique ID with an optional semantic prefix.
 * Format: `${prefix}-${tag}${counter}` — e.g. `field-a3k21`.
 */
export const createStableId = (prefix = 'id'): string => `${prefix}-${_tag}${++_counter}`;

/**
 * Resets the ID counter to 0. Use in test `beforeEach` hooks when you need
 * deterministic IDs across test runs.
 *
 * @example
 * ```ts
 * beforeEach(() => resetIdCounter());
 * ```
 */
export const resetIdCounter = (): void => {
  _counter = 0;
};
