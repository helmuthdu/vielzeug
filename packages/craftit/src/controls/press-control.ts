import { dispatchKeyboardAction } from './internal/keyboard-utils';

export type PressTrigger = 'keyboard' | 'pointer';

export type PressControlOptions = {
  disabled?: () => boolean;
  keys?: string[];
  onPress: (originalEvent: KeyboardEvent | MouseEvent, trigger: PressTrigger) => void;
};

export type PressControl = {
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
};

export const createPressControl = (options: PressControlOptions): PressControl => {
  const isDisabled = (): boolean => Boolean(options.disabled?.());
  const keyboardKeys = options.keys ?? ['Enter', ' '];
  const keymap = Object.fromEntries(
    keyboardKeys.map((key) => [key, (keyboardEvent: KeyboardEvent) => options.onPress(keyboardEvent, 'keyboard')]),
  );

  const handleClick = (event: MouseEvent): boolean => {
    if (isDisabled()) return false;

    options.onPress(event, 'pointer');

    return true;
  };

  const handleKeydown = (event: KeyboardEvent): boolean => {
    return dispatchKeyboardAction(event, {
      disabled: isDisabled,
      keymap,
    });
  };

  return {
    handleClick,
    handleKeydown,
  };
};
