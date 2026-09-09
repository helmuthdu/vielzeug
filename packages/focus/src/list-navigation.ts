export type ListNavigationAction = 'first' | 'last' | 'next' | 'prev';
export type ListKeyAction = ListNavigationAction | 'typeahead';

export type ListNavigationChange<T> = {
  readonly action: ListKeyAction;
  readonly event?: KeyboardEvent;
  readonly index: number;
  readonly item: T;
};

export type ListKeyResult<T> = {
  readonly change: ListNavigationChange<T> | null;
  readonly handled: true;
};

export type ListNavigationTypeaheadOptions<T> = {
  delayMs?: number;
  getLabel: (item: T, index: number) => string;
  preventDefault?: boolean;
};

export type MaybeGetter<T> = T | (() => T);

export type ListNavigationOptions<T> = {
  direction?: MaybeGetter<'ltr' | 'rtl'>;
  disabled?: MaybeGetter<boolean>;
  getItems: () => readonly T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListNavigationAction, readonly string[]>>;
  loop?: boolean;
  orientation?: MaybeGetter<'both' | 'horizontal' | 'vertical'>;
  typeahead?: ListNavigationTypeaheadOptions<T>;
};

export type ListNavigation<T> = {
  getActiveItem(): T | undefined;
  getIndex(): number;
  handleKeydown(event: KeyboardEvent): ListKeyResult<T> | null;
  navigate(action: ListNavigationAction): ListNavigationChange<T> | null;
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

const resolveTypeaheadDelay = (delay: number | undefined): number => {
  if (delay === undefined) return DEFAULT_TYPEAHEAD_DELAY_MS;
  if (!Number.isFinite(delay) || delay <= 0) throw new RangeError('Typeahead delay must be a positive finite number');
  return delay;
};

export const createListNavigation = <T>(options: ListNavigationOptions<T>): ListNavigation<T> => {
  const typeaheadDelay = resolveTypeaheadDelay(options.typeahead?.delayMs);
  const owners = new Map<string, ListNavigationAction>();

  for (const action of ['next', 'prev', 'first', 'last'] as const) {
    for (const key of options.keys?.[action] ?? []) {
      const owner = owners.get(key);
      if (owner && owner !== action) throw new RangeError(`Key "${key}" is assigned to both ${owner} and ${action}`);
      owners.set(key, action);
    }
  }

  let index = -1;
  let typeaheadBuffer = '';
  let lastTypeaheadAt = 0;

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
  ): ListNavigationChange<T> | null => {
    if (!isUsableIndex(items, nextIndex)) {
      index = -1;

      return null;
    }

    index = nextIndex;

    return Object.freeze({ action, event, index: nextIndex, item: items[nextIndex] });
  };

  const findEnabledIndex = (items: readonly T[], start: number, direction: 'forward' | 'backward'): number => {
    if (direction === 'forward')
      return findForward(items, start, (item, itemIndex) => !isItemDisabled(item, itemIndex));

    return findBackward(items, start, (item, itemIndex) => !isItemDisabled(item, itemIndex));
  };

  const move = (
    items: readonly T[],
    direction: 'forward' | 'backward',
    event?: KeyboardEvent,
  ): ListNavigationChange<T> | null => {
    const current = normalizeIndex(items);

    if (!items.length) {
      index = -1;

      return null;
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

    return null;
  };

  const navigateWithItems = (
    items: readonly T[],
    action: ListNavigationAction,
    event?: KeyboardEvent,
  ): ListNavigationChange<T> | null => {
    resetTypeahead();
    normalizeIndex(items);

    if (!items.length) {
      index = -1;

      return null;
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

  const handleTypeahead = (event: KeyboardEvent, items: readonly T[]): ListNavigationChange<T> | null => {
    if (!options.typeahead || event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return null;

    const now = performance.now();
    const key = event.key.toLocaleLowerCase();

    if (now - lastTypeaheadAt >= typeaheadDelay) typeaheadBuffer = '';

    lastTypeaheadAt = now;

    const candidate = typeaheadBuffer + key;
    const repeatedCharacter = candidate.length > 1 && [...candidate].every((character) => character === key);
    typeaheadBuffer = repeatedCharacter ? key : candidate;

    let nextIndex = findTypeaheadMatch(items, typeaheadBuffer, typeaheadBuffer.length > 1);

    if (nextIndex < 0 && typeaheadBuffer.length > 1) {
      typeaheadBuffer = key;
      nextIndex = findTypeaheadMatch(items, typeaheadBuffer, false);
    }

    if (nextIndex < 0) return null;

    return commitIndex(items, nextIndex, 'typeahead', event);
  };

  const set = (nextIndex: number): number => {
    const items = options.getItems();
    normalizeIndex(items);
    resetTypeahead();

    if (!Number.isInteger(nextIndex) || nextIndex < 0 || !items.length) {
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

  const navigate = (action: ListNavigationAction): ListNavigationChange<T> | null => {
    return navigateWithItems(options.getItems(), action);
  };

  const getActiveItem = (): T | undefined => {
    const items = options.getItems();
    const current = normalizeIndex(items);

    return current >= 0 ? items[current] : undefined;
  };

  const reset = (): void => {
    index = -1;
    resetTypeahead();
  };

  const getIndex = (): number => {
    return normalizeIndex(options.getItems());
  };

  const resolve = <V>(value: MaybeGetter<V> | undefined, fallback: V): V =>
    typeof value === 'function' ? (value as () => V)() : (value ?? fallback);

  const resolveKeyAction = (eventKey: string): ListNavigationAction | undefined => {
    const keys = options.keys;
    const keyTable = resolve(options.direction, 'ltr') === 'rtl' ? DEFAULT_KEYS_RTL : DEFAULT_KEYS;
    const defaults = keyTable[resolve(options.orientation, 'vertical')];

    for (const action of ['next', 'prev', 'first', 'last'] as const) {
      if ((keys?.[action] ?? defaults[action]).includes(eventKey)) return action;
    }

    return undefined;
  };

  const handleKeydown = (event: KeyboardEvent): ListKeyResult<T> | null => {
    if (event.defaultPrevented || event.isComposing || resolve(options.disabled, false)) return null;

    const items = options.getItems();
    normalizeIndex(items);

    const action = resolveKeyAction(event.key);

    if (action) {
      const change = navigateWithItems(items, action, event);
      event.preventDefault();
      return Object.freeze({ change, handled: true });
    }

    const change = handleTypeahead(event, items);
    if (!change) return null;
    if (options.typeahead?.preventDefault) event.preventDefault();
    return Object.freeze({ change, handled: true });
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
