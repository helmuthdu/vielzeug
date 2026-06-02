import { dispatchKeyboardAction } from './keyboard';

// ── Private array search helpers ────────────────────────────────────────────
const findForward = <T>(items: T[], start: number, predicate: (item: T, index: number) => boolean): number => {
  for (let idx = start; idx < items.length; idx++) {
    if (predicate(items[idx], idx)) return idx;
  }

  return -1;
};

const findBackward = <T>(items: T[], start: number, predicate: (item: T, index: number) => boolean): number => {
  for (let idx = start; idx >= 0; idx--) {
    if (predicate(items[idx], idx)) return idx;
  }

  return -1;
};

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Arrow-key and Home/End navigation actions. Separate from `ListKeyAction` so
 * keymap declarations never need `Exclude<ListKeyAction, 'typeahead'>`.
 */
export type ListNavigationAction = 'first' | 'last' | 'next' | 'prev';

/**
 * All possible navigation action names, including `'typeahead'` (character-key
 * search). Used in `onNavigate` callbacks where both nav and typeahead are valid.
 */
export type ListKeyAction = ListNavigationAction | 'typeahead';

/**
 * Orientation-aware default key bindings for list navigation.
 * - `'vertical'` (default): Up/Down arrows, Home/End
 * - `'horizontal'`: Left/Right arrows, Home/End
 * - `'both'`: all four arrow keys + Home/End
 */
const DEFAULT_KEYS: Record<'both' | 'horizontal' | 'vertical', Record<ListNavigationAction, string[]>> = {
  both: { first: ['Home'], last: ['End'], next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
  horizontal: { first: ['Home'], last: ['End'], next: ['ArrowRight'], prev: ['ArrowLeft'] },
  vertical: { first: ['Home'], last: ['End'], next: ['ArrowDown'], prev: ['ArrowUp'] },
};

// ── Keymap builder ────────────────────────────────────────────────────────────

/**
 * A named keymap object mapping navigation actions to key arrays.
 * Pass as `keys` in `ListNavigationOptions` to override default bindings.
 */
export type Keymap = Partial<Record<ListNavigationAction, string[]>>;

/**
 * Built-in keymap presets. Use `keymap()` to compose or customise them.
 */
export const keymapPresets = {
  /** Horizontal grid / tab-strip: Left/Right + Home/End. */
  horizontal: DEFAULT_KEYS.horizontal,
  /** Four-directional navigation: all arrow keys + Home/End. */
  omni: DEFAULT_KEYS.both,
  /** Standard vertical list: Up/Down + Home/End (default). */
  vertical: DEFAULT_KEYS.vertical,
} as const;

/**
 * Compose a custom keymap from a preset plus per-action overrides.
 *
 * @example
 * ```ts
 * // Add Enter/Space as aliases for "next" in a vertical list:
 * const keys = keymap('vertical', { next: ['ArrowDown', 'Enter'] });
 * createListControl({ ..., keys });
 * ```
 */
export const keymap = (
  preset: keyof typeof keymapPresets,
  overrides?: Keymap,
): Record<ListNavigationAction, string[]> => ({
  ...keymapPresets[preset],
  ...overrides,
});

export type ListNavigationOptions<T> = {
  disabled?: () => boolean;
  getIndex: () => number;
  /**
   * Returns a plain-text label for an item used by typeahead search.
   * When provided, pressing a printable character key jumps to the first enabled
   * item whose label starts with the accumulated type buffer (500 ms reset window).
   * Omit for contexts where the host element is a text input (e.g. combobox).
   */
  getItemLabel?: (item: T, index: number) => string;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  /**
   * Override default key bindings for navigation actions.
   * Pass a static object for the common case; pass a function when bindings
   * must change at runtime.
   */
  keys?: Partial<Record<ListNavigationAction, string[]>> | (() => Partial<Record<ListNavigationAction, string[]>>);
  loop?: boolean;
  onNavigate?: (action: ListKeyAction, index: number, event: KeyboardEvent) => void;
  /**
   * Axis the list navigates along. Controls which arrow keys are treated as
   * `next`/`prev` when no explicit `keys` override is provided.
   *
   * - `'vertical'` (default): ↑↓ arrows
   * - `'horizontal'`: ←→ arrows
   * - `'both'`: all four arrow keys
   */
  orientation?: 'both' | 'horizontal' | 'vertical';
  setIndex: (index: number) => void;
};

export type ListControl<T> = {
  /** Cancels any pending typeahead timer. Call on list cleanup to prevent post-disposal timer fires. */
  cleanup(): void;
  first(): number;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  last(): number;
  next(): number;
  prev(): number;
  reset(): void;
  set(index: number): number;
};

const hasDisabledProp = (item: unknown): item is { disabled: boolean } =>
  typeof item === 'object' && item !== null && 'disabled' in item;

export const createListControl = <T>(options: ListNavigationOptions<T>): ListControl<T> => {
  const isDisabled = (item: T, index: number): boolean =>
    options.isItemDisabled?.(item, index) ?? (hasDisabledProp(item) ? item.disabled : false);

  const commitIndex = (idx: number): number => {
    if (idx >= 0) options.setIndex(idx);

    return idx;
  };

  const findEnabledIndex = (items: T[], start: number, direction: 'forward' | 'backward'): number => {
    if (direction === 'forward') return findForward(items, start, (item, i) => !isDisabled(item, i));

    return findBackward(items, start, (item, i) => !isDisabled(item, i));
  };

  const first = (): number => {
    const items = options.getItems();

    if (!items.length) return -1;

    const idx = findEnabledIndex(items, 0, 'forward');

    if (idx < 0) return -1;

    return commitIndex(idx);
  };

  const last = (): number => {
    const items = options.getItems();

    if (!items.length) return -1;

    const idx = findEnabledIndex(items, items.length - 1, 'backward');

    if (idx < 0) return -1;

    return commitIndex(idx);
  };

  const set = (index: number): number => {
    if (index < 0) {
      reset();

      return -1;
    }

    const items = options.getItems();

    if (!items.length) return -1;

    const clamped = Math.min(index, items.length - 1);

    if (isDisabled(items[clamped], clamped)) {
      return -1;
    }

    return commitIndex(clamped);
  };

  const move = (direction: 'forward' | 'backward'): number => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return -1;

    const start: number =
      current < 0
        ? direction === 'forward'
          ? 0
          : items.length - 1
        : direction === 'forward'
          ? current + 1
          : current - 1;
    const idx = findEnabledIndex(items, start, direction);

    if (idx >= 0) return commitIndex(idx);

    if (options.loop) {
      const wrapStart = direction === 'forward' ? 0 : items.length - 1;
      const wrapped = findEnabledIndex(items, wrapStart, direction);

      if (wrapped >= 0) return commitIndex(wrapped);
    }

    return current;
  };

  const next = (): number => move('forward');

  const prev = (): number => move('backward');

  const getActiveItem = (): T | undefined => {
    const items = options.getItems();
    const index = options.getIndex();

    return index >= 0 && index < items.length ? items[index] : undefined;
  };

  const reset = (): void => {
    options.setIndex(-1);
  };

  // ── Keyboard handling ──────────────────────────────────────────────────────

  const isKeyDisabled = (): boolean => Boolean(options.disabled?.());

  const resolveKeys = (): Record<ListNavigationAction, string[]> => {
    const keys = typeof options.keys === 'function' ? options.keys() : options.keys;
    const orientationDefaults = DEFAULT_KEYS[options.orientation ?? 'vertical'];

    return {
      first: keys?.first ?? orientationDefaults.first,
      last: keys?.last ?? orientationDefaults.last,
      next: keys?.next ?? orientationDefaults.next,
      prev: keys?.prev ?? orientationDefaults.prev,
    };
  };

  const buildKeymap = (): Record<string, (keyboardEvent: KeyboardEvent) => void> => {
    const keys = resolveKeys();
    const keymap: Record<string, (keyboardEvent: KeyboardEvent) => void> = {};

    for (const action of ['next', 'prev', 'first', 'last'] as const) {
      for (const key of keys[action]) {
        keymap[key] = (keyboardEvent: KeyboardEvent) => {
          const index = { first, last, next, prev }[action]();

          options.onNavigate?.(action, index, keyboardEvent);
        };
      }
    }

    return keymap;
  };

  // ── Typeahead ──────────────────────────────────────────────────────────────
  // Accumulates printable keystrokes into a buffer; on each keystroke searches
  // for the first enabled item whose label starts with the buffer. Cycles past
  // the current item on repeated same-character presses. Buffer resets after
  // 500 ms of inactivity (the ARIA APG recommended window).

  const TYPEAHEAD_DELAY = 500;
  let _typeBuffer = '';
  let _typeTimer: ReturnType<typeof setTimeout> | null = null;

  const resetTypeBuffer = (): void => {
    _typeBuffer = '';

    if (_typeTimer !== null) {
      clearTimeout(_typeTimer);
      _typeTimer = null;
    }
  };

  const handleTypeahead = (event: KeyboardEvent): boolean => {
    if (!options.getItemLabel) return false;

    if (isKeyDisabled()) return false;

    // Single printable character only; exclude modifier combos (Ctrl+key, Alt+key, Meta+key).
    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return false;

    _typeBuffer += event.key.toLowerCase();

    if (_typeTimer !== null) clearTimeout(_typeTimer);

    _typeTimer = setTimeout(resetTypeBuffer, TYPEAHEAD_DELAY);

    const items = options.getItems();
    const current = options.getIndex();

    // Search forward from the item after current, wrapping circularly.
    const startAfter = current >= 0 ? current + 1 : 0;

    for (let n = 0; n < items.length; n++) {
      const i = (startAfter + n) % items.length;

      if (isDisabled(items[i], i)) continue;

      if (options.getItemLabel(items[i], i).toLowerCase().startsWith(_typeBuffer)) {
        commitIndex(i);
        options.onNavigate?.('typeahead', i, event);

        return true;
      }
    }

    return false;
  };

  // Cache the keymap when keys is not dynamic. The 99% case is a static config
  // declared at call time — building it once avoids a closure allocation and
  // a 4-entry loop on every keydown event.
  const staticKeymap = typeof options.keys !== 'function' ? buildKeymap() : null;

  const handleKeydown = (event: KeyboardEvent): boolean => {
    if (dispatchKeyboardAction(event, { disabled: isKeyDisabled, keymap: staticKeymap ?? buildKeymap() })) return true;

    return handleTypeahead(event);
  };

  return {
    cleanup: resetTypeBuffer,
    first,
    getActiveItem,
    handleKeydown,
    last,
    next,
    prev,
    reset,
    set,
  };
};
