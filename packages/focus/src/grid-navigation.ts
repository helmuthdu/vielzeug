import { matchKey } from '@vielzeug/keymap';

import { FocusConfigError } from './errors.js';
import type { MaybeGetter } from './list-navigation.js';

export type GridNavigationAction = 'first' | 'last' | 'next' | 'nextRow' | 'prev' | 'prevRow';

export type GridNavigationChange<T> = {
  readonly action: GridNavigationAction;
  readonly event?: KeyboardEvent;
  readonly index: number;
  readonly item: T;
};

export type GridKeyResult<T> = {
  readonly change: GridNavigationChange<T> | null;
  readonly handled: true;
};

/**
 * Columns per row: a fixed count, or a getter resolved on every navigation. Responsive grids
 * read a media query or computed style; measured grids read the rendered row length.
 */
export type GridColumns = number | (() => number);

export type GridNavigationOptions<T> = {
  /** Columns per row, resolved on every navigation. */
  columns: GridColumns;
  direction?: MaybeGetter<'ltr' | 'rtl'>;
  disabled?: MaybeGetter<boolean>;
  /**
   * Reads the active index from the outside (usually the index of `document.activeElement`
   * among the items), so focus moved by pointer or Tab stays in sync. When omitted, the
   * navigation tracks the index internally through `set()`.
   */
  getActiveIndex?: () => number;
  getItems: () => readonly T[];
  keys?: Partial<Record<GridNavigationAction, readonly string[]>>;
  /** Wrap moves around the grid's edges by flat index. Default clamps at the edges. */
  loop?: boolean;
};

export type GridNavigation<T> = {
  getActiveItem(): T | undefined;
  getIndex(): number;
  handleKeydown(event: KeyboardEvent): GridKeyResult<T> | null;
  navigate(action: GridNavigationAction): GridNavigationChange<T> | null;
  reset(): void;
  set(index: number): void;
};

const DEFAULT_KEYS: Record<GridNavigationAction, readonly string[]> = {
  first: ['Home'],
  last: ['End'],
  next: ['ArrowRight'],
  nextRow: ['ArrowDown'],
  prev: ['ArrowLeft'],
  prevRow: ['ArrowUp'],
};

const DEFAULT_KEYS_RTL: typeof DEFAULT_KEYS = {
  ...DEFAULT_KEYS,
  next: ['ArrowLeft'],
  prev: ['ArrowRight'],
};

const GRID_ACTIONS = ['first', 'last', 'next', 'nextRow', 'prev', 'prevRow'] as const;

const resolve = <V>(value: MaybeGetter<V> | undefined, fallback: V): V =>
  typeof value === 'function' ? (value as () => V)() : (value ?? fallback);

/**
 * Keyboard navigation over a two-dimensional grid of items: horizontal arrows step one
 * item, vertical arrows step one row (the column count), Home/End jump to the ends.
 *
 * Unlike `createListNavigation`, items are not skipped when disabled: skipping in two
 * dimensions would break row alignment. Focus (or otherwise activate) the item reported
 * by the returned change; `handleKeydown` calls `preventDefault()` for every recognized
 * key so unhandled arrows never scroll the page.
 */
export const createGridNavigation = <T>(options: GridNavigationOptions<T>): GridNavigation<T> => {
  const owners = new Map<string, GridNavigationAction>();

  for (const action of GRID_ACTIONS) {
    for (const key of options.keys?.[action] ?? []) {
      const owner = owners.get(key);
      if (owner && owner !== action)
        throw new FocusConfigError(`Key "${key}" is assigned to both ${owner} and ${action}`);
      owners.set(key, action);
    }
  }

  let index = -1;

  const resolveColumns = (): number => {
    const columns = resolve(options.columns, 1);
    if (!Number.isInteger(columns) || columns < 1)
      throw new FocusConfigError(`columns must resolve to a positive integer, got: ${columns}`);
    return columns;
  };

  const activeIndex = (items: readonly T[]): number => {
    const derived = options.getActiveIndex?.();
    if (derived !== undefined) index = derived >= 0 && derived < items.length ? derived : -1;
    return index;
  };

  const commitIndex = (
    items: readonly T[],
    nextIndex: number,
    action: GridNavigationAction,
    event?: KeyboardEvent,
  ): GridNavigationChange<T> => {
    index = nextIndex;
    return Object.freeze({ action, event, index: nextIndex, item: items[nextIndex] });
  };

  const navigateWithItems = (
    items: readonly T[],
    action: GridNavigationAction,
    event?: KeyboardEvent,
  ): GridNavigationChange<T> | null => {
    if (!items.length) {
      index = -1;
      return null;
    }

    if (action === 'first') return commitIndex(items, 0, action, event);
    if (action === 'last') return commitIndex(items, items.length - 1, action, event);

    const columns = resolveColumns();
    const offset = action === 'next' ? 1 : action === 'prev' ? -1 : action === 'nextRow' ? columns : -columns;
    const current = activeIndex(items);
    const base = current < 0 ? (offset > 0 ? 0 : items.length - 1) : current + offset;

    if (options.loop) {
      return commitIndex(items, ((base % items.length) + items.length) % items.length, action, event);
    }

    const clamped = Math.min(items.length - 1, Math.max(0, base));
    if (clamped === current) return null;

    return commitIndex(items, clamped, action, event);
  };

  const resolveKeyAction = (event: KeyboardEvent): GridNavigationAction | undefined => {
    const keyTable = resolve(options.direction, 'ltr') === 'rtl' ? DEFAULT_KEYS_RTL : DEFAULT_KEYS;

    for (const action of GRID_ACTIONS) {
      if ((options.keys?.[action] ?? keyTable[action]).some((pattern) => matchKey(event, pattern))) return action;
    }

    return undefined;
  };

  const handleKeydown = (event: KeyboardEvent): GridKeyResult<T> | null => {
    if (event.defaultPrevented || event.isComposing || resolve(options.disabled, false)) return null;

    const action = resolveKeyAction(event);
    if (!action) return null;

    const change = navigateWithItems(options.getItems(), action, event);
    event.preventDefault();
    return Object.freeze({ change, handled: true });
  };

  const navigate = (action: GridNavigationAction): GridNavigationChange<T> | null =>
    navigateWithItems(options.getItems(), action);

  const set = (nextIndex: number): void => {
    const items = options.getItems();

    if (!Number.isInteger(nextIndex) || nextIndex < 0 || !items.length) {
      index = -1;
      return;
    }

    index = Math.min(nextIndex, items.length - 1);
  };

  const reset = (): void => {
    index = -1;
  };

  const getIndex = (): number => activeIndex(options.getItems());

  const getActiveItem = (): T | undefined => {
    const items = options.getItems();
    const current = activeIndex(items);
    return current >= 0 ? items[current] : undefined;
  };

  return {
    getActiveItem,
    getIndex,
    handleKeydown,
    navigate,
    reset,
    set,
  };
};
