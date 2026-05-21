export type KeyboardDispatchOptions = {
  disabled?: () => boolean;
  keymap: Record<string, (event: KeyboardEvent) => boolean | void>;
  preventDefault?: 'after' | 'before' | false;
};

export const dispatchKeyboardAction = (event: KeyboardEvent, options: KeyboardDispatchOptions): boolean => {
  if (options.disabled?.()) return false;

  const action = options.keymap[event.key];

  if (!action) return false;

  const preventDefaultMode = options.preventDefault ?? 'before';

  if (preventDefaultMode === 'before') event.preventDefault();

  const handled = action(event) !== false;

  if (preventDefaultMode === 'after' && handled) event.preventDefault();

  return handled;
};
