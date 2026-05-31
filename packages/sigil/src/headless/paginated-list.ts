import { computed, type ReadonlySignal, signal } from '@vielzeug/ripple';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaginatedListOptions<T> = {
  /** All items to paginate. Can be a reactive signal accessor. */
  getItems: () => T[];
  /** Number of items per page. Defaults to 10. */
  pageSize?: ReadonlySignal<number> | number;
};

export type PaginatedListHandle<T> = {
  /** Navigate to an absolute page index (clamped). */
  goTo(index: number): void;
  /** Whether there is a next page. */
  readonly hasNext: ReadonlySignal<boolean>;
  /** Whether there is a previous page. */
  readonly hasPrev: ReadonlySignal<boolean>;

  /** Navigate to the next page. No-op on last page. */
  next(): void;
  /** Total number of pages. */
  readonly pageCount: ReadonlySignal<number>;
  /** Current 0-based page index. */
  readonly pageIndex: ReadonlySignal<number>;
  /** Items visible on the current page. */
  readonly pageItems: ReadonlySignal<T[]>;
  /** Navigate to the previous page. No-op on first page. */
  prev(): void;
  /** Reset to the first page. */
  reset(): void;
};

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Reactive pagination state for a list of items.
 *
 * Decoupled from option rendering so it can be used with any sorted/filtered
 * item array (e.g., the `filteredOptions` signal in combobox).
 *
 * @example
 * ```ts
 * const paged = createPaginatedList({ getItems: () => allOptions.value, pageSize: 20 });
 * // render paged.pageItems.value
 * // navigation: paged.next(), paged.prev(), paged.goTo(0)
 * ```
 */
export const createPaginatedList = <T>(options: PaginatedListOptions<T>): PaginatedListHandle<T> => {
  const pageIndex = signal(0);
  const resolvedPageSize = (): number => {
    const ps = options.pageSize;

    if (ps === undefined) return 10;

    return typeof ps === 'number' ? ps : (ps.value ?? 10);
  };

  const pageCount = computed(() => Math.max(1, Math.ceil(options.getItems().length / resolvedPageSize())));

  // Clamp page index when total page count shrinks (e.g. after filter change).
  const safePage = computed(() => Math.min(pageIndex.value, pageCount.value - 1));

  const pageItems = computed(() => {
    const pg = safePage.value;
    const size = resolvedPageSize();
    const start = pg * size;

    return options.getItems().slice(start, start + size);
  });

  const goTo = (index: number): void => {
    // Lower-bound guard only — safePage handles the upper-bound clamp reactively
    // so that any subsequent pageCount reduction is also handled automatically.
    pageIndex.value = Math.max(0, index);
  };

  const next = (): void => {
    if (safePage.value < pageCount.value - 1) pageIndex.value = safePage.value + 1;
  };

  const prev = (): void => {
    if (safePage.value > 0) pageIndex.value = safePage.value - 1;
  };

  const reset = (): void => {
    pageIndex.value = 0;
  };

  const hasNext = computed(() => safePage.value < pageCount.value - 1);
  const hasPrev = computed(() => safePage.value > 0);

  return {
    goTo,
    hasNext,
    hasPrev,
    next,
    pageCount,
    pageIndex: safePage,
    pageItems,
    prev,
    reset,
  };
};
