/**
 * Shared validation utilities for control factories.
 * Only genuinely useful abstractions - trivial wrappers removed.
 */

/**
 * Find index of first item matching predicate (forward scan).
 */
export const findForward = <T>(items: T[], start: number, predicate: (item: T, index: number) => boolean): number => {
  for (let idx = start; idx < items.length; idx++) {
    if (predicate(items[idx], idx)) return idx;
  }

  return -1;
};

/**
 * Find index of first item matching predicate (backward scan).
 */
export const findBackward = <T>(items: T[], start: number, predicate: (item: T, index: number) => boolean): number => {
  for (let idx = start; idx >= 0; idx--) {
    if (predicate(items[idx], idx)) return idx;
  }

  return -1;
};
