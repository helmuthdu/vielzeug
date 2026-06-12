/**
 * Shared 1D axis primitive: prefix-sum offset table, O(log n) binary search,
 * incremental rebuild, measurement batching via microtask, and dedup guards.
 *
 * Used directly by grid-virtualizer (numeric row/col indices) and composed
 * into virtualizer (which layers VirtualKey translation on top).
 */

/** A single rendered virtual item — position and size on one axis. */
export interface VirtualItem {
  end: number;
  index: number;
  size: number;
  start: number;
}

export interface Axis1DRange {
  renderEnd: number;
  renderStart: number;
}

/**
 * Create a self-contained 1D offset-table axis.
 *
 * @param initialCount - Number of items.
 * @param sizeAtFn     - Returns the resolved size for a given index (measured or estimated).
 *                       The virtualizer passes a closure that reads the live measurement cache,
 *                       so changes to the cache are reflected automatically without re-setting.
 * @param initialGap   - Gap between consecutive items (non-negative integer, pixels).
 */
export function createAxis1D(initialCount: number, sizeAtFn: (index: number) => number, initialGap: number) {
  let count = initialCount;
  let gap = initialGap;
  const sizeAt = sizeAtFn;

  let offsets: number[] = [];
  let totalSize = 0;

  // ─── Dedup guards ───────────────────────────────────────────────────────────
  // Track the last-emitted render range and total size so computeVisible() can
  // skip re-rendering when nothing changed.

  let prevStart = -1;
  let prevEnd = -1;
  let prevTotalSize = -1;

  // ─── Pending measurement flush ─────────────────────────────────────────────

  let pendingBuild = false;
  let minChangedIndex = Infinity;

  // ─── Offset helpers ─────────────────────────────────────────────────────────

  function startAt(i: number): number {
    return offsets[i] ?? 0;
  }

  function endAt(i: number): number {
    return startAt(i) + sizeAt(i);
  }

  // ─── Full rebuild ───────────────────────────────────────────────────────────

  /**
   * Full O(n) prefix-sum rebuild.
   * Pass `forceEmit = true` to reset dedup guards, ensuring computeVisible()
   * emits on the next call even if the rendered range is unchanged.
   */
  function rebuild(forceEmit = false): void {
    if (forceEmit) {
      prevStart = -1;
      prevEnd = -1;
      prevTotalSize = -1;
    }

    const next: number[] = [0];
    let pos = 0;

    for (let i = 0; i < count; i++) {
      pos += sizeAt(i) + (i < count - 1 ? gap : 0);
      next.push(pos);
    }

    offsets = next;
    totalSize = pos;
  }

  // ─── Incremental rebuild ────────────────────────────────────────────────────

  /**
   * O(count - fromIndex) incremental rebuild — used after measurement.
   * Always resets dedup guards because measurements change layout.
   */
  function rebuildFrom(fromIndex: number): void {
    if (!Number.isFinite(fromIndex) || fromIndex >= count) return;

    prevStart = -1;
    prevEnd = -1;
    prevTotalSize = -1;

    let pos = offsets[fromIndex] ?? 0;

    for (let i = fromIndex; i < count; i++) {
      offsets[i] = pos;
      pos += sizeAt(i) + (i < count - 1 ? gap : 0);
    }

    offsets[count] = pos;
    totalSize = pos;
  }

  // ─── Binary search ──────────────────────────────────────────────────────────

  function findFirst(viewportStart: number): number {
    let lo = 0;
    let hi = count - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (endAt(mid) <= viewportStart) lo = mid + 1;
      else hi = mid;
    }

    return lo;
  }

  function findLast(viewportEnd: number, from: number): number {
    let lo = from;
    let hi = count - 1;

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if (startAt(mid) < viewportEnd) lo = mid;
      else hi = mid - 1;
    }

    return lo;
  }

  /**
   * Compute the render range for a given viewport window and overscan values.
   * Returns indices clamped to [0, count - 1].
   */
  function computeRange(
    viewportStart: number,
    viewportEnd: number,
    overscanStart: number,
    overscanEnd: number,
  ): Axis1DRange {
    const first = findFirst(viewportStart);
    const last = findLast(viewportEnd, first);

    return {
      renderEnd: Math.min(count - 1, last + overscanEnd),
      renderStart: Math.max(0, first - overscanStart),
    };
  }

  // ─── Dedup helpers ──────────────────────────────────────────────────────────

  /** Returns `true` when start/end/totalSize are all identical to the last commit. */
  function isDedupSame(start: number, end: number): boolean {
    return start === prevStart && end === prevEnd && totalSize === prevTotalSize;
  }

  function commitDedup(start: number, end: number): void {
    prevStart = start;
    prevEnd = end;
    prevTotalSize = totalSize;
  }

  function resetDedup(): void {
    prevStart = -1;
    prevEnd = -1;
    prevTotalSize = -1;
  }

  // ─── Microtask scheduling ───────────────────────────────────────────────────

  /**
   * Schedule an incremental rebuild on the next microtask, then call `onFlush`.
   * Multiple calls before the microtask fires are coalesced into one rebuild.
   * Returns without scheduling if a build is already pending.
   */
  function scheduleBuild(onFlush: () => void): void {
    if (pendingBuild) return;

    pendingBuild = true;
    queueMicrotask(() => {
      pendingBuild = false;

      const from = minChangedIndex;

      minChangedIndex = Infinity;
      rebuildFrom(from);
      onFlush();
    });
  }

  /** Mark an item index as having a changed measurement. Drives incremental rebuilds. */
  function markChanged(index: number): void {
    if (index < minChangedIndex) minChangedIndex = index;
  }

  // ─── Item descriptor ────────────────────────────────────────────────────────

  /** Build a VirtualItem for a given index using current offset table. */
  function itemAt(index: number): VirtualItem {
    const start = startAt(index);
    const size = sizeAt(index);

    return { end: start + size, index, size, start };
  }

  // ─── Returned object ────────────────────────────────────────────────────────

  return {
    commitDedup,
    computeRange,
    /**
     * Atomically read and reset minChangedIndex to Infinity.
     * Used by grid-virtualizer's coordinated flush so it can consume the
     * changed-index without going through axis1d's own scheduleBuild.
     */
    consumeMinChangedIndex(): number {
      const idx = minChangedIndex;

      minChangedIndex = Infinity;

      return idx;
    },
    get count(): number {
      return count;
    },
    endAt,
    findFirst,
    findLast,
    /** Current gap between items (pixels). Used by callers to dedup gap changes. */
    get gap(): number {
      return gap;
    },
    isDedupSame,
    itemAt,
    markChanged,
    get minChangedIndex(): number {
      return minChangedIndex;
    },
    get pendingBuild(): boolean {
      return pendingBuild;
    },
    get prevEnd(): number {
      return prevEnd;
    },
    get prevStart(): number {
      return prevStart;
    },
    get prevTotalSize(): number {
      return prevTotalSize;
    },
    rebuild,
    rebuildFrom,
    resetDedup,
    scheduleBuild,
    setCount(n: number): void {
      count = n;
    },
    setGap(n: number): void {
      gap = n;
    },
    sizeAt(i: number): number {
      return sizeAt(i);
    },
    startAt,
    get totalSize(): number {
      return totalSize;
    },
  };
}

export type Axis1D = ReturnType<typeof createAxis1D>;
