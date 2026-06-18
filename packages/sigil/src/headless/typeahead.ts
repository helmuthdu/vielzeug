// ── Typeahead ─────────────────────────────────────────────────────────────────
// Standalone typeahead primitive: accumulates printable keystrokes, then finds
// the first enabled item whose label starts with the buffer.
//
// Extracted from nav.ts so it can be reused independently (e.g. combobox input).

// ── Types ─────────────────────────────────────────────────────────────────────

export type TypeaheadOptions<T> = {
  /**
   * Milliseconds of inactivity before the buffer resets.
   * ARIA APG recommended window. Default: `500`.
   */
  delay?: number;
  /** Returns the current focused index (used to search forward from current + 1). */
  getIndex: () => number;
  /** Returns a plain-text label for the item at `index`. */
  getItemLabel: (item: T, index: number) => string;
  /** Returns all items in the current list. */
  getItems: () => T[];
  /** Returns `true` for items that should be skipped during typeahead search. */
  isItemDisabled?: (item: T, index: number) => boolean;
  /** Called when typeahead navigation lands on an item. */
  onNavigate: (index: number, event: KeyboardEvent) => void;
  /**
   * When provided, the pending reset timer is cancelled automatically when the
   * signal aborts (e.g. when the owning component disconnects).
   */
  signal?: AbortSignal;
};

export type Typeahead = {
  /**
   * Process a keyboard event. Returns `true` if the event was consumed by
   * typeahead (a printable character matched or was buffered).
   */
  handleKeydown(event: KeyboardEvent): boolean;
  /** Reset the buffer immediately. Call on list close to clear stale input. */
  reset(): void;
};

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Creates a standalone typeahead handler for keyboard-navigable lists.
 *
 * Accumulates printable keystrokes into a buffer; on each keystroke searches
 * for the first enabled item whose label starts with the buffer. Cycles past
 * the current item on repeated same-character presses. Buffer resets after
 * `delay` ms of inactivity (default 500 — the ARIA APG recommended window).
 *
 * @example
 * ```ts
 * const typeahead = createTypeahead({
 *   getIndex: () => focusedIndex,
 *   getItemLabel: (item) => item.label,
 *   getItems: () => items,
 *   onNavigate: (index) => { focusedIndex = index; },
 * });
 *
 * listEl.addEventListener('keydown', (e) => typeahead.handleKeydown(e));
 * ```
 */
export const createTypeahead = <T>(options: TypeaheadOptions<T>): Typeahead => {
  const delay = options.delay ?? 500;
  let _buffer = '';
  let _timer: ReturnType<typeof setTimeout> | null = null;

  const reset = (): void => {
    _buffer = '';

    if (_timer !== null) {
      clearTimeout(_timer);
      _timer = null;
    }
  };

  options.signal?.addEventListener('abort', reset, { once: true });

  const handleKeydown = (event: KeyboardEvent): boolean => {
    // Single printable character only; exclude modifier combos.
    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return false;

    _buffer += event.key.toLowerCase();

    if (_timer !== null) clearTimeout(_timer);

    _timer = setTimeout(reset, delay);

    const items = options.getItems();
    const current = options.getIndex();
    const startAfter = current >= 0 ? current + 1 : 0;

    for (let n = 0; n < items.length; n++) {
      const i = (startAfter + n) % items.length;

      if (options.isItemDisabled?.(items[i], i)) continue;

      if (options.getItemLabel(items[i], i).toLowerCase().startsWith(_buffer)) {
        options.onNavigate(i, event);

        return true;
      }
    }

    return false;
  };

  return { handleKeydown, reset };
};
