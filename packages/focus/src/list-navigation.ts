export type MaybeGetter<T> = T | (() => T);

export type ListNavigationAction = 'first' | 'last' | 'next' | 'prev';
export type ListKeyAction = ListNavigationAction | 'typeahead';

const DEFAULT_KEYS: Record<'both' | 'horizontal' | 'vertical', Record<ListNavigationAction, string[]>> = {
  both: { first: ['Home'], last: ['End'], next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
  horizontal: { first: ['Home'], last: ['End'], next: ['ArrowRight'], prev: ['ArrowLeft'] },
  vertical: { first: ['Home'], last: ['End'], next: ['ArrowDown'], prev: ['ArrowUp'] },
};

const DEFAULT_KEYS_RTL: Record<'both' | 'horizontal' | 'vertical', Record<ListNavigationAction, string[]>> = {
  both: { first: ['Home'], last: ['End'], next: ['ArrowDown', 'ArrowLeft'], prev: ['ArrowUp', 'ArrowRight'] },
  horizontal: { first: ['Home'], last: ['End'], next: ['ArrowLeft'], prev: ['ArrowRight'] },
  vertical: DEFAULT_KEYS.vertical,
};

export type ListNavigationOptions<T> = {
  direction?: 'ltr' | 'rtl' | (() => 'ltr' | 'rtl');
  disabled?: MaybeGetter<boolean | undefined>;
  getItemLabel?: (item: T, index: number) => string;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListNavigationAction, string[]>>;
  loop?: boolean;
  onNavigate?: (action: ListKeyAction, index: number, event?: KeyboardEvent) => void;
  orientation?: 'both' | 'horizontal' | 'vertical' | (() => 'both' | 'horizontal' | 'vertical');
  signal?: AbortSignal;
  typeaheadDelayMs?: number;
};

export type ListNavigation<T> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getActiveItem(): T | undefined;
  getIndex(): number;
  handleKeydown(event: KeyboardEvent): boolean;
  navigate(action: ListNavigationAction): number;
  reset(): void;
  set(index: number): number;
};

type TypeaheadOptions<T> = {
  delay?: number;
  getIndex: () => number;
  getItemLabel: (item: T, index: number) => string;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  onNavigate: (index: number, event: KeyboardEvent) => void;
  signal?: AbortSignal;
};

type Typeahead = {
  handleKeydown(event: KeyboardEvent): boolean;
  reset(): void;
};

const read = <T>(value: MaybeGetter<T> | undefined, fallback: T): T =>
  typeof value === 'function' ? (value as () => T)() : (value ?? fallback);

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

const hasDisabledProp = (item: unknown): item is { disabled: boolean } =>
  typeof item === 'object' && item !== null && 'disabled' in item;

const createTypeahead = <T>(options: TypeaheadOptions<T>): Typeahead => {
  const delayCandidate = options.delay;
  const delay =
    typeof delayCandidate === 'number' && Number.isFinite(delayCandidate) && delayCandidate > 0 ? delayCandidate : 500;
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const reset = (): void => {
    buffer = '';

    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  options.signal?.addEventListener('abort', reset, { once: true });

  const handleKeydown = (event: KeyboardEvent): boolean => {
    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return false;

    buffer += event.key.toLowerCase();

    if (timer !== null) clearTimeout(timer);

    timer = setTimeout(reset, delay);

    const items = options.getItems();
    const current = options.getIndex();
    const startAfter = current >= 0 ? current + 1 : 0;

    for (let n = 0; n < items.length; n++) {
      const i = (startAfter + n) % items.length;

      if (options.isItemDisabled?.(items[i], i)) continue;

      if (options.getItemLabel(items[i], i).toLowerCase().startsWith(buffer)) {
        options.onNavigate(i, event);

        return true;
      }
    }

    return false;
  };

  return { handleKeydown, reset };
};

export const createListNavigation = <T>(options: ListNavigationOptions<T>): ListNavigation<T> => {
  const disposalController = new AbortController();
  let index = -1;
  let disposed = false;

  const isItemDisabled = (item: T, itemIndex: number): boolean =>
    options.isItemDisabled?.(item, itemIndex) ?? (hasDisabledProp(item) ? item.disabled : false);

  const isUsableIndex = (items: T[], itemIndex: number): boolean =>
    itemIndex >= 0 && itemIndex < items.length && !isItemDisabled(items[itemIndex], itemIndex);

  const normalizeIndex = (items: T[]): number => {
    if (!isUsableIndex(items, index)) index = -1;

    return index;
  };

  const commitIndex = (nextIndex: number, action: ListKeyAction, event?: KeyboardEvent): number => {
    const items = options.getItems();

    if (isUsableIndex(items, nextIndex)) {
      index = nextIndex;
      options.onNavigate?.(action, nextIndex, event);
    } else {
      index = -1;
    }

    return index;
  };

  const findEnabledIndex = (items: T[], start: number, direction: 'forward' | 'backward'): number => {
    if (direction === 'forward') return findForward(items, start, (item, i) => !isItemDisabled(item, i));

    return findBackward(items, start, (item, i) => !isItemDisabled(item, i));
  };

  const set = (nextIndex: number): number => {
    const items = options.getItems();

    normalizeIndex(items);

    if (nextIndex < 0) {
      reset();

      return -1;
    }

    if (!items.length) {
      reset();

      return -1;
    }

    const clamped = Math.min(nextIndex, items.length - 1);

    if (!isUsableIndex(items, clamped)) {
      reset();

      return -1;
    }

    index = clamped;

    return index;
  };

  const move = (direction: 'forward' | 'backward', event?: KeyboardEvent): number => {
    const items = options.getItems();
    const current = normalizeIndex(items);

    if (!items.length) {
      reset();

      return -1;
    }

    const start =
      current < 0
        ? direction === 'forward'
          ? 0
          : items.length - 1
        : direction === 'forward'
          ? current + 1
          : current - 1;

    const nextIndex = findEnabledIndex(items, start, direction);
    const action: ListNavigationAction = direction === 'forward' ? 'next' : 'prev';

    if (nextIndex >= 0) return commitIndex(nextIndex, action, event);

    if (options.loop) {
      const wrapStart = direction === 'forward' ? 0 : items.length - 1;
      const wrapped = findEnabledIndex(items, wrapStart, direction);

      if (wrapped >= 0) return commitIndex(wrapped, action, event);
    }

    return index;
  };

  const navigate = (action: ListNavigationAction): number => {
    const items = options.getItems();

    normalizeIndex(items);

    if (!items.length) {
      reset();

      return -1;
    }

    if (action === 'first') {
      const nextIndex = findEnabledIndex(items, 0, 'forward');

      return commitIndex(nextIndex, 'first');
    }

    if (action === 'last') {
      const nextIndex = findEnabledIndex(items, items.length - 1, 'backward');

      return commitIndex(nextIndex, 'last');
    }

    return move(action === 'next' ? 'forward' : 'backward');
  };

  const getActiveItem = (): T | undefined => {
    const items = options.getItems();
    const current = normalizeIndex(items);

    return current >= 0 ? items[current] : undefined;
  };

  const reset = (): void => {
    index = -1;
  };

  const getIndex = (): number => normalizeIndex(options.getItems());

  const isKeyDisabled = (): boolean => Boolean(read(options.disabled, false));

  const resolveOrientation = (): 'both' | 'horizontal' | 'vertical' => read(options.orientation, 'vertical');

  const resolveDirection = (): 'ltr' | 'rtl' => read(options.direction, 'ltr');

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
    const keymap: Record<string, (keyboardEvent: KeyboardEvent) => void> = {};

    for (const action of ['next', 'prev', 'first', 'last'] as const) {
      for (const key of resolved[action]) {
        keymap[key] = (keyboardEvent: KeyboardEvent) => {
          if (action === 'first' || action === 'last') {
            const items = options.getItems();

            if (!items.length) return;

            const nextIndex =
              action === 'first'
                ? findEnabledIndex(items, 0, 'forward')
                : findEnabledIndex(items, items.length - 1, 'backward');

            commitIndex(nextIndex, action, keyboardEvent);
          } else {
            move(action === 'next' ? 'forward' : 'backward', keyboardEvent);
          }
        };
      }
    }

    return keymap;
  };

  const typeahead = options.getItemLabel
    ? createTypeahead({
        delay: options.typeaheadDelayMs,
        getIndex,
        getItemLabel: options.getItemLabel,
        getItems: options.getItems,
        isItemDisabled: (item, itemIndex) => isItemDisabled(item, itemIndex),
        onNavigate: (nextIndex, event) => {
          if (!isKeyDisabled()) {
            commitIndex(nextIndex, 'typeahead', event);
          }
        },
      })
    : null;

  const isDynamicKeymap = typeof options.orientation === 'function' || typeof options.direction === 'function';
  const staticKeymap: Record<string, (event: KeyboardEvent) => void> | null = isDynamicKeymap ? null : buildKeymap();

  const handleKeydown = (event: KeyboardEvent): boolean => {
    normalizeIndex(options.getItems());

    if (isKeyDisabled()) return false;

    const keymap = staticKeymap ?? buildKeymap();
    const action = Object.hasOwn(keymap, event.key) ? keymap[event.key] : undefined;

    if (action) {
      event.preventDefault();
      action(event);

      return true;
    }

    return typeahead?.handleKeydown(event) ?? false;
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    disposalController.abort();
    typeahead?.reset();
  };

  if (options.signal) {
    options.signal.addEventListener('abort', dispose, { once: true });
  }

  return {
    get disposalSignal() {
      return disposalController.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    getActiveItem,
    getIndex,
    handleKeydown,
    navigate,
    reset,
    set,
    [Symbol.dispose]: dispose,
  };
};
