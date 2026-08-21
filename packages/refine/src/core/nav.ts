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
};

export type ListControl<T> = {
  [Symbol.dispose](): void;
  dispose(): void;
  readonly disposed: boolean;
  readonly focusedIndex: Readable<number>;
  getActiveItem(): T | undefined;
  handleKeydown(event: KeyboardEvent): boolean;
  navigate(action: ListNavigationAction): number;
  reset(): void;
  set(index: number): number;
};

export type { ListKeyAction, ListNavigationAction, ListNavigationChange, ListNavigationTypeaheadOptions };

export const createListControl = <T>(options: ListNavigationOptions<T>): ListControl<T> => {
  const focusedIndex = signal(-1);
  let removeAbortListener: (() => void) | undefined;
  const navigation: ListNavigation<T> = createListNavigation<T>({
    direction: options.direction,
    disabled: () => Boolean(options.disabled?.value),
    getItems: options.getItems,
    isItemDisabled: options.isItemDisabled,
    keys: options.keys,
    loop: options.loop,
    onNavigate: (change) => {
      focusedIndex.value = change.index;
      options.onNavigate?.(change);
    },
    orientation: options.orientation,
    typeahead: options.typeahead,
  });

  const syncIndex = (): void => {
    focusedIndex.value = navigation.getIndex();
  };

  const set = (index: number): number => {
    const next = navigation.set(index);

    syncIndex();

    return next;
  };

  const navigate = (action: ListNavigationAction): number => {
    const next = navigation.navigate(action);

    syncIndex();

    return next;
  };

  const reset = (): void => {
    navigation.reset();
    syncIndex();
  };

  const handleKeydown = (event: KeyboardEvent): boolean => {
    const handled = navigation.handleKeydown(event);

    syncIndex();

    return handled;
  };

  const dispose = (): void => {
    navigation.dispose();
    syncIndex();
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
    dispose,
    get disposed() {
      return navigation.disposed;
    },
    focusedIndex,
    getActiveItem: () => navigation.getActiveItem(),
    handleKeydown,
    navigate,
    reset,
    set,
    [Symbol.dispose]: dispose,
  };
};
