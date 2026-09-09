import {
  createListNavigation,
  type ListNavigationOptions as FocusListNavigationOptions,
  type ListKeyAction,
  type ListNavigation,
  type ListNavigationAction,
  type ListNavigationChange,
  type ListNavigationTypeaheadOptions,
} from '@vielzeug/focus';
import { type Readable, signal } from '@vielzeug/ripple';

export type ListNavigationOptions<T> = Omit<FocusListNavigationOptions<T>, 'disabled'> & {
  disabled?: Readable<boolean | undefined>;
  onNavigate?: (change: ListNavigationChange<T>) => void;
  signal?: AbortSignal;
};

export type { ListKeyAction, ListNavigationAction, ListNavigationChange, ListNavigationTypeaheadOptions };

export type ListControl<T> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly focusedIndex: Readable<number>;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  navigate(action: ListNavigationAction): number;
  reset(): void;
  set(index: number): number;
};

export const createListControl = <T>(options: ListNavigationOptions<T>): ListControl<T> => {
  const disposalController = new AbortController();
  const focusedIndex = signal(-1);
  let disposed = false;
  let removeAbortListener: (() => void) | undefined;
  const navigation: ListNavigation<T> = createListNavigation<T>({
    direction: options.direction,
    disabled: () => Boolean(options.disabled?.value),
    getItems: options.getItems,
    isItemDisabled: options.isItemDisabled,
    keys: options.keys,
    loop: options.loop,
    orientation: options.orientation,
    typeahead: options.typeahead,
  });

  const syncIndex = (): void => {
    focusedIndex.value = navigation.getIndex();
  };

  const applyChange = (change: ListNavigationChange<T> | null): number => {
    if (change) {
      focusedIndex.value = change.index;
      try {
        options.onNavigate?.(change);
      } finally {
        syncIndex();
      }
    }

    return navigation.getIndex();
  };

  const set = (index: number): number => {
    if (disposed) return -1;
    const next = navigation.set(index);

    syncIndex();

    return next;
  };

  const navigate = (action: ListNavigationAction): number => {
    if (disposed) return -1;
    const change = navigation.navigate(action);

    return applyChange(change);
  };

  const reset = (): void => {
    if (disposed) return;
    navigation.reset();
    syncIndex();
  };

  const handleKeydown = (event: KeyboardEvent): boolean => {
    if (disposed) return false;

    const result = navigation.handleKeydown(event);
    if (!result) return false;
    if (result.change) applyChange(result.change);
    return result.handled;
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    navigation.reset();
    focusedIndex.value = -1;
    disposalController.abort();
    removeAbortListener?.();
    removeAbortListener = undefined;
  };

  if (options.signal?.aborted) {
    dispose();
  } else if (options.signal) {
    options.signal?.addEventListener('abort', dispose, { once: true });
    removeAbortListener = () => options.signal?.removeEventListener('abort', dispose);
  }

  return {
    get disposalSignal() {
      return disposalController.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    focusedIndex,
    getActiveItem: () => (disposed ? undefined : navigation.getActiveItem()),
    handleKeydown,
    navigate,
    reset,
    set,
    [Symbol.dispose]: dispose,
  };
};
