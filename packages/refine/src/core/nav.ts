import {
  createListNavigation,
  type ListKeyAction,
  type ListNavigation,
  type ListNavigationAction,
} from '@vielzeug/focus';
import { type Readable, signal } from '@vielzeug/ripple';

export type ListNavigationOptions<T> = {
  direction?: 'ltr' | 'rtl' | (() => 'ltr' | 'rtl');
  disabled?: Readable<boolean | undefined>;
  getItemLabel?: (item: T, index: number) => string;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListNavigationAction, string[]>>;
  loop?: boolean;
  onNavigate?: (action: ListKeyAction, index: number, event?: KeyboardEvent) => void;
  orientation?: 'both' | 'horizontal' | 'vertical' | (() => 'both' | 'horizontal' | 'vertical');
  signal?: AbortSignal;
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

export type { ListKeyAction, ListNavigationAction };

export const createListControl = <T>(options: ListNavigationOptions<T>): ListControl<T> => {
  const focusedIndex = signal(-1);
  const navigation: ListNavigation<T> = createListNavigation<T>({
    direction: options.direction,
    disabled: () => Boolean(options.disabled?.value),
    getItemLabel: options.getItemLabel,
    getItems: options.getItems,
    isItemDisabled: options.isItemDisabled,
    keys: options.keys,
    loop: options.loop,
    onNavigate: (action, index, event) => {
      focusedIndex.value = index;
      options.onNavigate?.(action, index, event);
    },
    orientation: options.orientation,
    signal: options.signal,
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

  return {
    dispose: () => navigation.dispose(),
    get disposed() {
      return navigation.disposed;
    },
    focusedIndex,
    getActiveItem: () => navigation.getActiveItem(),
    handleKeydown,
    navigate,
    reset,
    set,
    [Symbol.dispose]: () => navigation.dispose(),
  };
};
