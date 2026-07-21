import { type Readable, signal } from '@vielzeug/ripple';

import { dispatchKeyboardAction } from './keyboard';
import { createTypeahead } from './typeahead';

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

/**
 * RTL mirror of `DEFAULT_KEYS`'s horizontal component (per WAI-ARIA APG — tabs/radiogroup
 * flip Left/Right in `dir="rtl"` so "next" always advances in reading order, not screen-space
 * direction). Only the Left/Right bindings differ; Home/End and the vertical arrows are
 * direction-independent and stay identical to `DEFAULT_KEYS`.
 */
const DEFAULT_KEYS_RTL: Record<'both' | 'horizontal' | 'vertical', Record<ListNavigationAction, string[]>> = {
  both: { first: ['Home'], last: ['End'], next: ['ArrowDown', 'ArrowLeft'], prev: ['ArrowUp', 'ArrowRight'] },
  horizontal: { first: ['Home'], last: ['End'], next: ['ArrowLeft'], prev: ['ArrowRight'] },
  vertical: DEFAULT_KEYS.vertical,
};

export type ListNavigationOptions<T> = {
  /**
   * Text direction, used to mirror the default Left/Right arrow-key bindings for
   * `'horizontal'`/`'both'` orientation (WAI-ARIA APG: `dir="rtl"` flips which arrow key
   * means "next" vs "prev"). Pass a getter for dynamic/reactive direction (e.g. derived from
   * `elementDirection(getHost())`, since a `dir` ancestor attribute can change at runtime).
   * Has no effect when an explicit `keys` override is provided. Defaults to `'ltr'`.
   */
  direction?: 'ltr' | 'rtl' | (() => 'ltr' | 'rtl');
  disabled?: Readable<boolean | undefined>;
  /**
   * Returns a plain-text label for an item used by typeahead search.
   * When provided, pressing a printable character key jumps to the first enabled
   * item whose label starts with the accumulated type buffer (500 ms reset window).
   * Omit for contexts where the host element is a text input (e.g. combobox).
   */
  getItemLabel?: (item: T, index: number) => string;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  /** Override default key bindings for navigation actions. */
  keys?: Partial<Record<ListNavigationAction, string[]>>;
  loop?: boolean;
  /**
   * Called when navigation lands on a new index.
   * `event` is the originating `KeyboardEvent`, or `undefined` for programmatic navigation.
   * Use to sync side-effects such as focusing a DOM element.
   */
  onNavigate?: (action: ListKeyAction, index: number, event?: KeyboardEvent) => void;
  /**
   * Axis the list navigates along. Controls which arrow keys are treated as
   * `next`/`prev` when no explicit `keys` override is provided.
   * Pass a getter function for dynamic/reactive orientation (e.g. driven by a prop signal).
   *
   * - `'vertical'` (default): ↑↓ arrows
   * - `'horizontal'`: ←→ arrows
   * - `'both'`: all four arrow keys
   */
  orientation?: 'both' | 'horizontal' | 'vertical' | (() => 'both' | 'horizontal' | 'vertical');
  /** `AbortSignal` from the component lifecycle. Disposes typeahead timer on abort. */
  signal?: AbortSignal;
};

export type ListControl<T> = {
  [Symbol.dispose](): void;
  /** Disposes the internal typeahead timer. Alias for `dispose()`. Conforms to the monorepo disposal convention. */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** Current focused index. `-1` when nothing is focused. */
  readonly focusedIndex: Readable<number>;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  /**
   * Programmatically navigate to a named position.
   * Always fires `onNavigate` — consistent with keyboard navigation.
   * Returns the resolved index, or `-1` if no enabled item was found.
   */
  navigate(action: ListNavigationAction): number;
  /** Reset focused index to `-1`. */
  reset(): void;
  /**
   * Set focus to the item at `index`. Returns the resolved index.
   * Pass a negative index to clear focus (same as `reset()`).
   */
  set(index: number): number;
};

const hasDisabledProp = (item: unknown): item is { disabled: boolean } =>
  typeof item === 'object' && item !== null && 'disabled' in item;

export const createListControl = <T>(options: ListNavigationOptions<T>): ListControl<T> => {
  const _index = signal(-1);

  const isItemDisabled = (item: T, index: number): boolean =>
    options.isItemDisabled?.(item, index) ?? (hasDisabledProp(item) ? item.disabled : false);

  const commitIndex = (idx: number, action: ListKeyAction, event?: KeyboardEvent): number => {
    if (idx >= 0) {
      _index.value = idx;
      options.onNavigate?.(action, idx, event);
    }

    return idx;
  };

  const findEnabledIndex = (items: T[], start: number, direction: 'forward' | 'backward'): number => {
    if (direction === 'forward') return findForward(items, start, (item, i) => !isItemDisabled(item, i));

    return findBackward(items, start, (item, i) => !isItemDisabled(item, i));
  };

  const set = (index: number): number => {
    if (index < 0) {
      reset();

      return -1;
    }

    const items = options.getItems();

    if (!items.length) return -1;

    const clamped = Math.min(index, items.length - 1);

    if (isItemDisabled(items[clamped], clamped)) return -1;

    _index.value = clamped;

    return clamped;
  };

  const move = (direction: 'forward' | 'backward', event?: KeyboardEvent): number => {
    const items = options.getItems();
    const current = _index.value;

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
    const action: ListNavigationAction = direction === 'forward' ? 'next' : 'prev';

    if (idx >= 0) return commitIndex(idx, action, event);

    if (options.loop) {
      const wrapStart = direction === 'forward' ? 0 : items.length - 1;
      const wrapped = findEnabledIndex(items, wrapStart, direction);

      if (wrapped >= 0) return commitIndex(wrapped, action, event);
    }

    return current;
  };

  const navigate = (action: ListNavigationAction): number => {
    const items = options.getItems();

    if (!items.length) return -1;

    if (action === 'first') {
      const idx = findEnabledIndex(items, 0, 'forward');

      return commitIndex(idx, 'first');
    }

    if (action === 'last') {
      const idx = findEnabledIndex(items, items.length - 1, 'backward');

      return commitIndex(idx, 'last');
    }

    return move(action === 'next' ? 'forward' : 'backward');
  };

  const getActiveItem = (): T | undefined => {
    const items = options.getItems();
    const index = _index.value;

    return index >= 0 && index < items.length ? items[index] : undefined;
  };

  const reset = (): void => {
    _index.value = -1;
  };

  // ── Keyboard handling ──────────────────────────────────────────────────────

  const isKeyDisabled = (): boolean => Boolean(options.disabled?.value);

  const resolveOrientation = (): 'both' | 'horizontal' | 'vertical' =>
    typeof options.orientation === 'function' ? options.orientation() : (options.orientation ?? 'vertical');

  const resolveDirection = (): 'ltr' | 'rtl' =>
    typeof options.direction === 'function' ? options.direction() : (options.direction ?? 'ltr');

  const buildKeymap = (): Record<string, (keyboardEvent: KeyboardEvent) => void> => {
    const keys = options.keys;
    const keyTable = resolveDirection() === 'rtl' ? DEFAULT_KEYS_RTL : DEFAULT_KEYS;
    const orientationDefaults = keyTable[resolveOrientation()];
    const resolved = {
      first: keys?.first ?? orientationDefaults.first,
      last: keys?.last ?? orientationDefaults.last,
      next: keys?.next ?? orientationDefaults.next,
      prev: keys?.prev ?? orientationDefaults.prev,
    };
    const km: Record<string, (keyboardEvent: KeyboardEvent) => void> = {};

    for (const action of ['next', 'prev', 'first', 'last'] as const) {
      for (const key of resolved[action]) {
        km[key] = (keyboardEvent: KeyboardEvent) => {
          if (action === 'first' || action === 'last') {
            const items = options.getItems();

            if (!items.length) return;

            const idx =
              action === 'first'
                ? findEnabledIndex(items, 0, 'forward')
                : findEnabledIndex(items, items.length - 1, 'backward');

            commitIndex(idx, action, keyboardEvent);
          } else {
            move(action === 'next' ? 'forward' : 'backward', keyboardEvent);
          }
        };
      }
    }

    return km;
  };

  // ── Typeahead ──────────────────────────────────────────────────────────────

  const typeahead = options.getItemLabel
    ? createTypeahead({
        getIndex: () => _index.value,
        getItemLabel: options.getItemLabel,
        getItems: options.getItems,
        isItemDisabled: (item, index) => isItemDisabled(item, index),
        onNavigate: (index, event) => {
          if (!isKeyDisabled()) {
            _index.value = index;
            options.onNavigate?.('typeahead', index, event);
          }
        },
      })
    : null;

  // Keymap depends on both orientation and direction — if either is dynamic, rebuild on every
  // keydown instead of caching once.
  const isDynamicKeymap = typeof options.orientation === 'function' || typeof options.direction === 'function';
  const _staticKeymap: Record<string, (e: KeyboardEvent) => void> | null = isDynamicKeymap ? null : buildKeymap();

  const handleKeydown = (event: KeyboardEvent): boolean => {
    const km = _staticKeymap ?? buildKeymap();

    if (dispatchKeyboardAction(event, { disabled: options.disabled, keymap: km })) return true;

    return typeahead?.handleKeydown(event) ?? false;
  };

  let disposed = false;

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    typeahead?.reset();
  };

  if (options.signal) {
    options.signal.addEventListener('abort', dispose, { once: true });
  }

  return {
    dispose,
    get disposed() {
      return disposed;
    },
    focusedIndex: _index,
    getActiveItem,
    handleKeydown,
    navigate,
    reset,
    set,
    [Symbol.dispose]: dispose,
  };
};
