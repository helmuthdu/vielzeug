import { dispatchKeyboardAction } from './internal/keyboard-utils';
import { findBackward, findForward } from './internal/validation-utils';

export type ListKeyAction = 'first' | 'last' | 'next' | 'prev';

const DEFAULT_KEYS: Record<ListKeyAction, string[]> = {
  first: ['Home'],
  last: ['End'],
  next: ['ArrowDown'],
  prev: ['ArrowUp'],
};

export type ListNavigationOptions<T> = {
  disabled?: () => boolean;
  getIndex: () => number;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListKeyAction, string[]>> | (() => Partial<Record<ListKeyAction, string[]>>);
  loop?: boolean;
  onNavigate?: (action: ListKeyAction, index: number, event: KeyboardEvent) => void;
  setIndex: (index: number) => void;
};

export type ListControl<T> = {
  first(): number;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  last(): number;
  next(): number;
  prev(): number;
  reset(): void;
  set(index: number): number;
};

export const createListControl = <T>(options: ListNavigationOptions<T>): ListControl<T> => {
  const isDisabled = (item: T, index: number): boolean =>
    options.isItemDisabled?.(item, index) ?? (item as any).disabled;

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
    const items = options.getItems();

    if (!items.length) return -1;

    const clamped = Math.min(Math.max(index, 0), items.length - 1);

    if (isDisabled(items[clamped], clamped)) {
      return options.getIndex();
    }

    return commitIndex(clamped);
  };

  const move = (direction: 'forward' | 'backward'): number => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return -1;

    const start =
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

  const resolveKeys = (): Record<ListKeyAction, string[]> => {
    const keys = typeof options.keys === 'function' ? options.keys() : options.keys;

    return {
      first: keys?.first ?? DEFAULT_KEYS.first,
      last: keys?.last ?? DEFAULT_KEYS.last,
      next: keys?.next ?? DEFAULT_KEYS.next,
      prev: keys?.prev ?? DEFAULT_KEYS.prev,
    };
  };

  let cachedKeymap: Record<string, (keyboardEvent: KeyboardEvent) => void> | null = null;
  let cachedKeysRef: Partial<Record<ListKeyAction, string[]>> | undefined;

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

  const getKeymap = (): Record<string, (keyboardEvent: KeyboardEvent) => void> => {
    if (typeof options.keys === 'function') {
      const currentKeys = options.keys();

      if (currentKeys !== cachedKeysRef) {
        cachedKeysRef = currentKeys;
        cachedKeymap = buildKeymap();
      }
    } else if (!cachedKeymap) {
      cachedKeymap = buildKeymap();
    }

    return cachedKeymap!;
  };

  const handleKeydown = (event: KeyboardEvent): boolean =>
    dispatchKeyboardAction(event, { disabled: isKeyDisabled, keymap: getKeymap() });

  return {
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
