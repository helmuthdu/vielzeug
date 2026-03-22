export type ListNavigationOptions<T> = {
  getIndex: () => number;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  loop?: boolean;
  setIndex: (index: number) => void;
};

export type ListNavigationResultReason = 'empty' | 'moved' | 'no-enabled-item' | 'unchanged';

export type ListNavigationResult = {
  index: number;
  moved: boolean;
  reason: ListNavigationResultReason;
  wrapped: boolean;
};

export type ListNavigationController<T> = {
  first: () => ListNavigationResult;
  getActiveItem: () => T | undefined;
  getEnabledIndex: (index: number) => ListNavigationResult;
  last: () => ListNavigationResult;
  next: () => ListNavigationResult;
  prev: () => ListNavigationResult;
  reset: () => void;
  set: (index: number) => ListNavigationResult;
};

export const createListNavigation = <T>(options: ListNavigationOptions<T>): ListNavigationController<T> => {
  const createResult = (nextIndex: number, currentIndex: number, wrapped = false): ListNavigationResult => {
    if (nextIndex < 0) {
      return {
        index: -1,
        moved: false,
        reason: 'no-enabled-item',
        wrapped,
      };
    }

    if (nextIndex === currentIndex) {
      return {
        index: nextIndex,
        moved: false,
        reason: 'unchanged',
        wrapped,
      };
    }

    return {
      index: nextIndex,
      moved: true,
      reason: 'moved',
      wrapped,
    };
  };

  const emptyResult: ListNavigationResult = {
    index: -1,
    moved: false,
    reason: 'empty',
    wrapped: false,
  };

  const isDisabled = (item: T, index: number): boolean => {
    if (options.isItemDisabled) return options.isItemDisabled(item, index);

    return Boolean((item as { disabled?: boolean }).disabled);
  };

  const findForward = (items: T[], start: number): number => {
    for (let idx = start; idx < items.length; idx++) {
      if (!isDisabled(items[idx], idx)) return idx;
    }

    return -1;
  };

  const findBackward = (items: T[], start: number): number => {
    for (let idx = start; idx >= 0; idx--) {
      if (!isDisabled(items[idx], idx)) return idx;
    }

    return -1;
  };

  const getEnabledIndex = (index: number): ListNavigationResult => {
    const items = options.getItems();

    if (items.length === 0) return emptyResult;

    const current = options.getIndex();
    const forward = findForward(items, Math.max(0, index));

    if (forward !== -1) return createResult(forward, current);

    if (options.loop) {
      const wrapped = findForward(items, 0);

      return createResult(wrapped, current, true);
    }

    return createResult(current, current);
  };

  const set = (index: number): ListNavigationResult => {
    const result = getEnabledIndex(index);

    if (result.index >= 0) options.setIndex(result.index);

    return result;
  };

  const first = (): ListNavigationResult => {
    const items = options.getItems();

    if (items.length === 0) return emptyResult;

    const current = options.getIndex();
    const next = findForward(items, 0);
    const result = createResult(next, current);

    if (result.index >= 0) options.setIndex(result.index);

    return result;
  };

  const last = (): ListNavigationResult => {
    const items = options.getItems();

    if (items.length === 0) return emptyResult;

    const current = options.getIndex();
    const next = findBackward(items, items.length - 1);
    const result = createResult(next, current);

    if (result.index >= 0) options.setIndex(result.index);

    return result;
  };

  const next = (): ListNavigationResult => {
    const items = options.getItems();

    if (items.length === 0) return emptyResult;

    const current = options.getIndex();
    const forward = findForward(items, Math.max(0, current + 1));

    if (forward !== -1) {
      options.setIndex(forward);

      return createResult(forward, current);
    }

    if (options.loop) {
      const wrapped = findForward(items, 0);

      if (wrapped !== -1) options.setIndex(wrapped);

      return createResult(wrapped, current, true);
    }

    return createResult(current, current);
  };

  const prev = (): ListNavigationResult => {
    const items = options.getItems();

    if (items.length === 0) return emptyResult;

    const current = options.getIndex();
    const backward = findBackward(items, current - 1);

    if (backward !== -1) {
      options.setIndex(backward);

      return createResult(backward, current);
    }

    if (options.loop) {
      const wrapped = findBackward(items, items.length - 1);

      if (wrapped !== -1) options.setIndex(wrapped);

      return createResult(wrapped, current, true);
    }

    return createResult(current, current);
  };

  const reset = (): void => {
    options.setIndex(-1);
  };

  const getActiveItem = (): T | undefined => {
    const items = options.getItems();
    const index = options.getIndex();

    if (index < 0 || index >= items.length) return undefined;

    return items[index];
  };

  return {
    first,
    getActiveItem,
    getEnabledIndex,
    last,
    next,
    prev,
    reset,
    set,
  };
};
