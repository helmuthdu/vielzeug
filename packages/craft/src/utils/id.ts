/**
 * Unique ID generation for runtime use (component IDs, label associations, etc.).
 * Template binding no longer uses this for marker IDs — binding targets are resolved
 * via path navigation on cloned template nodes.
 */

let _idCounter = 0;
let _counter = 0;
const _tag = Math.random().toString(36).slice(2, 6);

export const _resetIdCounter = (): void => {
  _idCounter = 0;
};

export const createId = (prefix?: string): string => `${prefix ? `${prefix}-` : 'cft-'}${++_idCounter}`;

/**
 * Generates a stable, unique ID with an optional semantic prefix.
 * Includes a short random tag to prevent collisions across multiple app instances.
 * Format: `${prefix}-${tag}${counter}` — e.g. `field-a3k21`.
 */
export const createStableId = (prefix = 'id'): string => `${prefix}-${_tag}${++_counter}`;

/**
 * Resets the stable ID counter to 0. Use in test `beforeEach` hooks when you need
 * deterministic IDs across test runs.
 */
export const resetIdCounter = (): void => {
  _counter = 0;
};
