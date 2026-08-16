/**
 * Shared sticky item computation logic.
 * Used by virtualizer and grid-virtualizer for finding and pinning sticky items.
 */

import type { VirtualItem } from './_axis1d';

export interface StickyComputeContext {
  count: number;
  scrollOffset: number;
  sizeAt: (index: number) => number;
  startAt: (index: number) => number;
  stickyFn: ((index: number) => boolean) | null;
}

/**
 * Compute the sticky item(s) for a 1D scroll axis.
 * Returns the single sticky item that should be pinned at the viewport start,
 * accounting for the next sticky item's position.
 *
 * @param ctx Context with functions to query item positions and sizes
 * @returns Array containing at most one sticky item (pinned to viewport)
 */
export function computeStickyItems(ctx: StickyComputeContext): VirtualItem[] {
  if (!ctx.stickyFn || ctx.count === 0 || ctx.scrollOffset <= 0) return [];

  // Binary search to find the last item that starts before the viewport
  let lastAbove = -1;
  let lo = 0;
  let hi = ctx.count - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;

    if (ctx.startAt(mid) < ctx.scrollOffset) {
      lastAbove = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (lastAbove < 0) return [];

  // Scan backwards from lastAbove to find the most recent sticky item
  let activeIdx = -1;

  for (let i = lastAbove; i >= 0; i--) {
    if (ctx.stickyFn(i)) {
      activeIdx = i;
      break;
    }
  }

  if (activeIdx === -1) return [];

  // Find the next sticky item to determine how far we can pin
  const activeSize = ctx.sizeAt(activeIdx);
  let nextStickyStart = Infinity;

  for (let i = activeIdx + 1; i < ctx.count; i++) {
    if (ctx.stickyFn(i)) {
      nextStickyStart = ctx.startAt(i);
      break;
    }
  }

  // Pin the active sticky item, but don't let it push past the next sticky item
  const pinnedStart = Math.min(ctx.scrollOffset, nextStickyStart - activeSize);

  return [{ end: pinnedStart + activeSize, index: activeIdx, size: activeSize, start: pinnedStart }];
}
