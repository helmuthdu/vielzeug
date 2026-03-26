import { findBackward, findForward } from './internal/validation-utils';

export type ListNavigationOptions<T> = {
  getIndex: () => number;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  loop?: boolean;
  setIndex: (index: number) => void;
};

export type ListControlResult = {
  index: number;
  moved: boolean;
};

export type ListControl<T> = {
  first(): ListControlResult;
  getActiveItem(): T | undefined;
  last(): ListControlResult;
  next(): ListControlResult;
  prev(): ListControlResult;
  reset(): void;
};

export const createListControl = <T>(options: ListNavigationOptions<T>): ListControl<T> => {
  const isDisabled = (item: T, index: number): boolean =>
    options.isItemDisabled?.(item, index) ?? (item as any).disabled;

  const result = (idx: number, current: number): ListControlResult => {
    return {
      index: Math.max(idx, -1),
      moved: idx >= 0 && idx !== current,
    };
  };

  const commitIndex = (idx: number, current: number): ListControlResult => {
    if (idx >= 0) options.setIndex(idx);

    return result(idx, current);
  };

  const findEnabledIndex = (items: T[], start: number, direction: 'forward' | 'backward'): number => {
    if (direction === 'forward') return findForward(items, start, (item, i) => !isDisabled(item, i));

    return findBackward(items, start, (item, i) => !isDisabled(item, i));
  };

  const first = (): ListControlResult => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return result(-1, current);

    return commitIndex(findEnabledIndex(items, 0, 'forward'), current);
  };

  const last = (): ListControlResult => {
    const items = options.getItems();
    const current = options.getIndex();

    if (!items.length) return result(-1, current);

    return commitIndex(findEnabledIndex(items, items.length - 1, 'backward'), current);
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

      if (wrapped >= 0) return commitIndex(wrapped, current);
    }

    return result(current, current);
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

  return {
    first,
    getActiveItem,
    last,
    next,
    prev,
    reset,
  };
};
