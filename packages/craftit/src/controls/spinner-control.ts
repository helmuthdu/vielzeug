import { dispatchKeyboardAction } from './internal/keyboard-utils';
import { clampNumber, toFiniteNumber, toPositiveStep } from './internal/number-utils';

export type SpinnerControlOptions = {
  commit: (value: number | null, originalEvent?: Event) => void;
  disabled?: () => boolean;
  largeStep?: () => number | string | undefined;
  max?: () => number | string | undefined;
  min?: () => number | string | undefined;
  parse: () => number | null;
  readonly?: () => boolean;
  step?: () => number | string | undefined;
};

export type SpinnerControl = {
  atMax: () => boolean;
  atMin: () => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
  incrementBy: (delta: number, originalEvent?: Event) => void;
};

export const createSpinnerControl = (options: SpinnerControlOptions): SpinnerControl => {
  const isBlocked = (): boolean => Boolean(options.disabled?.()) || Boolean(options.readonly?.());

  const min = (): number | undefined => {
    return toFiniteNumber(options.min?.());
  };

  const max = (): number | undefined => {
    return toFiniteNumber(options.max?.());
  };

  const clamp = (value: number): number => {
    return clampNumber(value, min(), max());
  };

  const step = (): number => toPositiveStep(options.step?.(), 1);

  const largeStep = (): number => {
    const s = step();

    return toPositiveStep(options.largeStep?.(), s * 10);
  };

  const currentOrFallback = (): number => {
    const parsed = options.parse();

    if (parsed != null) return parsed;

    const minValue = min();

    if (minValue != null) return minValue;

    return 0;
  };

  const commit = (value: number | null, originalEvent?: Event): void => {
    if (value == null) {
      options.commit(null, originalEvent);

      return;
    }

    options.commit(clamp(value), originalEvent);
  };

  const incrementBy = (delta: number, originalEvent?: Event): void => {
    if (isBlocked()) return;

    commit(currentOrFallback() + delta, originalEvent);
  };

  const atMin = (): boolean => {
    const parsed = options.parse();
    const minValue = min();

    return parsed != null && minValue != null && parsed <= minValue;
  };

  const atMax = (): boolean => {
    const parsed = options.parse();
    const maxValue = max();

    return parsed != null && maxValue != null && parsed >= maxValue;
  };

  const handleKeydown = (event: KeyboardEvent): boolean => {
    return dispatchKeyboardAction(event, {
      disabled: isBlocked,
      keymap: {
        ArrowDown: () => incrementBy(-step(), event),
        ArrowUp: () => incrementBy(step(), event),
        End: () => {
          const maxValue = max();

          if (maxValue == null) return false;

          commit(maxValue, event);
        },
        Home: () => {
          const minValue = min();

          if (minValue == null) return false;

          commit(minValue, event);
        },
        PageDown: () => incrementBy(-largeStep(), event),
        PageUp: () => incrementBy(largeStep(), event),
      },
      preventDefault: 'after',
    });
  };

  return {
    atMax,
    atMin,
    handleKeydown,
    incrementBy,
  };
};
