import type { ListControl } from './list-control';

import { dispatchKeyboardAction } from './internal/keyboard-utils';

type ListKeyAction = 'first' | 'last' | 'next' | 'prev';

export type ListKeyControlOptions = {
  control: Pick<ListControl<unknown>, ListKeyAction>;
  disabled?: () => boolean;
  keys?: Partial<Record<ListKeyAction, string[]>> | (() => Partial<Record<ListKeyAction, string[]>>);
  onInvoke?: (action: ListKeyAction, result: unknown, event: KeyboardEvent) => void;
};

export type ListKeyControl = {
  handleKeydown: (event: KeyboardEvent) => boolean;
};

const DEFAULT_KEYS: Record<ListKeyAction, string[]> = {
  first: ['Home'],
  last: ['End'],
  next: ['ArrowDown'],
  prev: ['ArrowUp'],
};

export const createListKeyControl = (options: ListKeyControlOptions): ListKeyControl => {
  const isDisabled = (): boolean => Boolean(options.disabled?.());
  const resolveKeys = (): Record<ListKeyAction, string[]> => {
    const keys = typeof options.keys === 'function' ? options.keys() : options.keys;

    return {
      first: keys?.first ?? DEFAULT_KEYS.first,
      last: keys?.last ?? DEFAULT_KEYS.last,
      next: keys?.next ?? DEFAULT_KEYS.next,
      prev: keys?.prev ?? DEFAULT_KEYS.prev,
    };
  };

  const handleKeydown = (event: KeyboardEvent): boolean => {
    const keys = resolveKeys();
    const keymap: Record<string, (keyboardEvent: KeyboardEvent) => void> = {};

    const bindAction = (action: ListKeyAction) => {
      for (const key of keys[action]) {
        keymap[key] = (keyboardEvent: KeyboardEvent) => {
          const result = options.control[action]();

          options.onInvoke?.(action, result, keyboardEvent);
        };
      }
    };

    bindAction('next');
    bindAction('prev');
    bindAction('first');
    bindAction('last');

    return dispatchKeyboardAction(event, {
      disabled: isDisabled,
      keymap,
    });
  };

  return {
    handleKeydown,
  };
};
