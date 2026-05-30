import type { ReadonlySignal } from '@vielzeug/ripple';

import { dispatchKeyboardAction } from './keyboard';
import { clamp as clampRange, toFiniteNumber, toPositiveStep } from './numbers';

export type SpinnerControlOptions = {
  commit: (value: number | null, originalEvent?: Event) => void;
  disabled?: ReadonlySignal<boolean | undefined>;
  largeStep?: ReadonlySignal<number | string | undefined>;
  max?: ReadonlySignal<number | string | undefined>;
  min?: ReadonlySignal<number | string | undefined>;
  parse: () => number | null;
  readonly?: ReadonlySignal<boolean | undefined>;
  step?: ReadonlySignal<number | string | undefined>;
};

export type SpinnerControl = {
  atMax: () => boolean;
  atMin: () => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
  incrementBy: (delta: number, originalEvent?: Event) => void;
};

export const createSpinnerControl = (options: SpinnerControlOptions): SpinnerControl => {
  const isBlocked = (): boolean => Boolean(options.disabled?.value) || Boolean(options.readonly?.value);

  const min = (): number | undefined => {
    return toFiniteNumber(options.min?.value);
  };

  const max = (): number | undefined => {
    return toFiniteNumber(options.max?.value);
  };

  const clamp = (value: number): number => {
    return clampRange(value, min(), max());
  };

  const step = (): number => toPositiveStep(options.step?.value, 1);

  const largeStep = (): number => {
    const s = step();

    return toPositiveStep(options.largeStep?.value, s * 10);
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
