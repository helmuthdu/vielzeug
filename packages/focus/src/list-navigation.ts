export type MaybeGetter<T> = T | (() => T);

export type ListNavigationAction = 'first' | 'last' | 'next' | 'prev';
export type ListKeyAction = ListNavigationAction | 'typeahead';

export type ListNavigationChange<T> = {
  action: ListKeyAction;
  event?: KeyboardEvent;
  index: number;
  item: T;
};

export type ListNavigationTypeaheadOptions<T> = {
  delayMs?: number;
  getLabel: (item: T, index: number) => string;
};

export type ListNavigationOptions<T> = {
  direction?: MaybeGetter<'ltr' | 'rtl'>;
  disabled?: MaybeGetter<boolean | undefined>;
  getItems: () => readonly T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListNavigationAction, readonly string[]>>;
  loop?: boolean;
  onNavigate?: (change: ListNavigationChange<T>) => void;
  orientation?: MaybeGetter<'both' | 'horizontal' | 'vertical'>;
  signal?: AbortSignal;
  typeahead?: ListNavigationTypeaheadOptions<T>;
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

const DEFAULT_KEYS: Record<'both' | 'horizontal' | 'vertical', Record<ListNavigationAction, readonly string[]>> = {
  both: { first: ['Home'], last: ['End'], next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
  horizontal: { first: ['Home'], last: ['End'], next: ['ArrowRight'], prev: ['ArrowLeft'] },
  vertical: { first: ['Home'], last: ['End'], next: ['ArrowDown'], prev: ['ArrowUp'] },
};

const DEFAULT_KEYS_RTL: typeof DEFAULT_KEYS = {
  both: { first: ['Home'], last: ['End'], next: ['ArrowDown', 'ArrowLeft'], prev: ['ArrowUp', 'ArrowRight'] },
  horizontal: { first: ['Home'], last: ['End'], next: ['ArrowLeft'], prev: ['ArrowRight'] },
  vertical: DEFAULT_KEYS.vertical,
};

const DEFAULT_TYPEAHEAD_DELAY_MS = 500;

const read = <T>(value: MaybeGetter<T> | undefined, fallback: T): T =>
  typeof value === 'function' ? (value as () => T)() : (value ?? fallback);

const findForward = <T>(items: readonly T[], start: number, predicate: (item: T, index: number) => boolean): number => {
  for (let index = start; index < items.length; index++) {
    if (predicate(items[index], index)) return index;
  }

  return -1;
};

const findBackward = <T>(
  items: readonly T[],
  start: number,
  predicate: (item: T, index: number) => boolean,
): number => {
  for (let index = start; index >= 0; index--) {
    if (predicate(items[index], index)) return index;
  }

  return -1;
};

const resolveTypeaheadDelay = (delay: number | undefined): number =>
  typeof delay === 'number' && Number.isFinite(delay) && delay > 0 ? delay : DEFAULT_TYPEAHEAD_DELAY_MS;

export const createListNavigation = <T>(options: ListNavigationOptions<T>): ListNavigation<T> => {
  const disposalController = new AbortController();
  let index = -1;
  let disposed = false;
  let typeaheadBuffer = '';
  let lastTypeaheadAt = 0;
  let removeExternalAbortListener: (() => void) | undefined;

  const isItemDisabled = (item: T, itemIndex: number): boolean => options.isItemDisabled?.(item, itemIndex) ?? false;

  const isUsableIndex = (items: readonly T[], itemIndex: number): boolean =>
    itemIndex >= 0 && itemIndex < items.length && !isItemDisabled(items[itemIndex], itemIndex);

  const normalizeIndex = (items: readonly T[]): number => {
    if (!isUsableIndex(items, index)) index = -1;

    return index;
  };

  const resetTypeahead = (): void => {
    typeaheadBuffer = '';
    lastTypeaheadAt = 0;
  };

  const commitIndex = (
    items: readonly T[],
    nextIndex: number,
    action: ListKeyAction,
    event?: KeyboardEvent,
  ): number => {
    if (!isUsableIndex(items, nextIndex)) {
      index = -1;

      return index;
    }

    index = nextIndex;
    options.onNavigate?.({ action, event, index: nextIndex, item: items[nextIndex] });

    return index;
  };

  const findEnabledIndex = (items: readonly T[], start: number, direction: 'forward' | 'backward'): number => {
    if (direction === 'forward')
      return findForward(items, start, (item, itemIndex) => !isItemDisabled(item, itemIndex));

    return findBackward(items, start, (item, itemIndex) => !isItemDisabled(item, itemIndex));
  };

  const move = (items: readonly T[], direction: 'forward' | 'backward', event?: KeyboardEvent): number => {
    const current = normalizeIndex(items);

    if (!items.length) {
      index = -1;

      return index;
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

    if (nextIndex >= 0) return commitIndex(items, nextIndex, action, event);

    if (options.loop) {
      const wrapStart = direction === 'forward' ? 0 : items.length - 1;
      const wrapped = findEnabledIndex(items, wrapStart, direction);

      if (wrapped >= 0) return commitIndex(items, wrapped, action, event);
    }

    return index;
  };

  const navigateWithItems = (items: readonly T[], action: ListNavigationAction, event?: KeyboardEvent): number => {
    resetTypeahead();
    normalizeIndex(items);

    if (!items.length) {
      index = -1;

      return index;
    }

    if (action === 'first') {
      return commitIndex(items, findEnabledIndex(items, 0, 'forward'), action, event);
    }

    if (action === 'last') {
      return commitIndex(items, findEnabledIndex(items, items.length - 1, 'backward'), action, event);
    }

    return move(items, action === 'next' ? 'forward' : 'backward', event);
  };

  const findTypeaheadMatch = (items: readonly T[], search: string, includeCurrent: boolean): number => {
    const current = normalizeIndex(items);
    const start = current < 0 ? 0 : includeCurrent ? current : current + 1;

    for (let offset = 0; offset < items.length; offset++) {
      const itemIndex = (start + offset) % items.length;
      const item = items[itemIndex];

      if (isItemDisabled(item, itemIndex)) continue;

      if (options.typeahead?.getLabel(item, itemIndex).toLocaleLowerCase().startsWith(search)) {
        return itemIndex;
      }
    }

    return -1;
  };

  const handleTypeahead = (event: KeyboardEvent, items: readonly T[]): boolean => {
    if (!options.typeahead || event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return false;

    const now = Date.now();
    const key = event.key.toLocaleLowerCase();
    const delay = resolveTypeaheadDelay(options.typeahead.delayMs);

    if (now - lastTypeaheadAt >= delay) typeaheadBuffer = '';

    lastTypeaheadAt = now;

    const candidate = typeaheadBuffer + key;
    const repeatedCharacter = candidate.length > 1 && [...candidate].every((character) => character === key);
    typeaheadBuffer = repeatedCharacter ? key : candidate;

    let nextIndex = findTypeaheadMatch(items, typeaheadBuffer, typeaheadBuffer.length > 1);

    if (nextIndex < 0 && typeaheadBuffer.length > 1) {
      typeaheadBuffer = key;
      nextIndex = findTypeaheadMatch(items, typeaheadBuffer, false);
    }

    if (nextIndex < 0) return false;

    commitIndex(items, nextIndex, 'typeahead', event);

    return true;
  };

  const set = (nextIndex: number): number => {
    if (disposed) return -1;

    const items = options.getItems();
    normalizeIndex(items);
    resetTypeahead();

    if (nextIndex < 0 || !items.length) {
      index = -1;

      return index;
    }

    const clamped = Math.min(nextIndex, items.length - 1);

    if (!isUsableIndex(items, clamped)) {
      index = -1;

      return index;
    }

    index = clamped;

    return index;
  };

  const navigate = (action: ListNavigationAction): number => {
    if (disposed) return -1;

    return navigateWithItems(options.getItems(), action);
  };

  const getActiveItem = (): T | undefined => {
    if (disposed) return undefined;

    const items = options.getItems();
    const current = normalizeIndex(items);

    return current >= 0 ? items[current] : undefined;
  };

  const reset = (): void => {
    if (disposed) return;

    index = -1;
    resetTypeahead();
  };

  const getIndex = (): number => {
    if (disposed) return -1;

    return normalizeIndex(options.getItems());
  };

  const resolveKeyAction = (eventKey: string): ListNavigationAction | undefined => {
    const keys = options.keys;
    const keyTable = read(options.direction, 'ltr') === 'rtl' ? DEFAULT_KEYS_RTL : DEFAULT_KEYS;
    const defaults = keyTable[read(options.orientation, 'vertical')];

    for (const action of ['next', 'prev', 'first', 'last'] as const) {
      if ((keys?.[action] ?? defaults[action]).includes(eventKey)) return action;
    }

    return undefined;
  };

  const handleKeydown = (event: KeyboardEvent): boolean => {
    if (disposed || read(options.disabled, false)) return false;

    const items = options.getItems();
    normalizeIndex(items);

    const action = resolveKeyAction(event.key);

    if (action) {
      event.preventDefault();
      navigateWithItems(items, action, event);

      return true;
    }

    return handleTypeahead(event, items);
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    index = -1;
    resetTypeahead();
    removeExternalAbortListener?.();
    removeExternalAbortListener = undefined;
    disposalController.abort();
  };

  if (options.signal?.aborted) {
    dispose();
  } else if (options.signal) {
    options.signal.addEventListener('abort', dispose, { once: true });
    removeExternalAbortListener = () => options.signal?.removeEventListener('abort', dispose);
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
