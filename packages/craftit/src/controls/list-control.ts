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
  onInvoke?: (action: ListKeyAction, result: ListControlResult, event: KeyboardEvent) => void;
  setIndex: (index: number) => void;
};

export type ListControlResultReason = 'empty' | 'moved' | 'no-enabled-item' | 'unchanged';

export type ListControlResult = {
  index: number;
  moved: boolean;
  reason: ListControlResultReason;
  wrapped: boolean;
};

export type ListControl<T> = {
  first(): ListControlResult;
  getActiveItem(): T | undefined;
  getEnabledIndex(index: number): ListControlResult;
  handleKeydown(event: KeyboardEvent): boolean;
  last(): ListControlResult;
  next(): ListControlResult;
  prev(): ListControlResult;
  reset(): void;
  set(index: number): ListControlResult;
};

export const createListControl = <T>(options: ListNavigationOptions<T>): ListControl<T> => {
  const isDisabled = (item: T, index: number): boolean =>
    options.isItemDisabled?.(item, index) ?? (item as any).disabled;

  const result = (idx: number, current: number, wrapped = false): ListControlResult => {
    const clamped = Math.max(idx, -1);
    const moved = clamped >= 0 && clamped !== current;

    return {
      index: clamped,
      moved,
      reason: clamped < 0 ? 'empty' : moved ? 'moved' : 'unchanged',
      wrapped,
    };
  };

  const commitIndex = (idx: number, current: number, wrapped = false): ListControlResult => {
    if (idx >= 0) options.setIndex(idx);

    return result(idx, current, wrapped);
  };

  const findEnabledIndex = (items: T[], start: number, direction: 'forward' | 'backward'): number => {
    if (direction === 'forward') return findForward(items, start, (item, i) => !isDisabled(item, i));

    return findBackward(items, start, (item, i) => !isDisabled(item, i));
  };

  const first = (): ListControlResult => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return result(-1, current);

    const idx = findEnabledIndex(items, 0, 'forward');

    if (idx < 0) return { index: -1, moved: false, reason: 'no-enabled-item', wrapped: false };

    return commitIndex(idx, current);
  };

  const last = (): ListControlResult => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return result(-1, current);

    const idx = findEnabledIndex(items, items.length - 1, 'backward');

    if (idx < 0) return { index: -1, moved: false, reason: 'no-enabled-item', wrapped: false };

    return commitIndex(idx, current);
  };

  const set = (index: number): ListControlResult => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return result(-1, current);

    const clamped = Math.min(Math.max(index, 0), items.length - 1);

    if (isDisabled(items[clamped], clamped)) {
      return { index: clamped, moved: false, reason: 'no-enabled-item', wrapped: false };
    }

    return commitIndex(clamped, current);
  };

  const getEnabledIndex = (index: number): ListControlResult => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return result(-1, current);

    const clamped = Math.min(Math.max(index, 0), items.length - 1);
    const idx = findEnabledIndex(items, clamped, 'forward');

    if (idx < 0) return { index: -1, moved: false, reason: 'no-enabled-item', wrapped: false };

    return commitIndex(idx, current);
  };

  const move = (direction: 'forward' | 'backward'): ListControlResult => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return result(-1, current);

    const start = direction === 'forward' ? Math.max(0, current + 1) : current - 1;
    const idx = findEnabledIndex(items, start, direction);

    if (idx >= 0) return commitIndex(idx, current);

    if (options.loop) {
      const wrapStart = direction === 'forward' ? 0 : items.length - 1;
      const wrapped = findEnabledIndex(items, wrapStart, direction);

      if (wrapped >= 0) return commitIndex(wrapped, current, true);
    }

    return { index: current, moved: false, reason: 'unchanged', wrapped: false };
  };

  const next = (): ListControlResult => move('forward');

  const prev = (): ListControlResult => move('backward');

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
          const navResult = { first, last, next, prev }[action]();

          options.onInvoke?.(action, navResult, keyboardEvent);
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
    getEnabledIndex,
    handleKeydown,
    last,
    next,
    prev,
    reset,
    set,
  };
};
