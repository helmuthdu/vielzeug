import type { Readable } from '@vielzeug/ripple';

import { clamp as clampRange } from '@vielzeug/arsenal';

import { toFiniteNumberOr, toPositiveStep } from './numbers';

// ── Slider control ────────────────────────────────────────────────────────────

export type SliderControlOptions = {
  disabled?: Readable<boolean | undefined>;
  max?: Readable<number | string | undefined>;
  min?: Readable<number | string | undefined>;
  readonly?: Readable<boolean | undefined>;
  step?: Readable<number | string | undefined>;
};

export type SliderControl = {
  clamp: (value: number) => number;
  fromClientX: (clientX: number, rect: { left: number; width: number }) => number;
  /**
   * Handles keyboard navigation for a slider input.
   * When the slider is disabled or readonly, the event is ignored and `false` is returned.
   * @returns `true` when the event was handled and `onCommit` was called, `false` otherwise.
   */
  handleKeydown: (event: KeyboardEvent, currentValue: number, onCommit: (value: number) => void) => boolean;
  max: () => number;
  min: () => number;
  nextFromKey: (key: string, current: number) => number | null;
  snap: (value: number) => number;
  toPercent: (value: number) => number;
};

export const createSliderControl = (options: SliderControlOptions): SliderControl => {
  const min = (): number => toFiniteNumberOr(options.min?.value, 0);
  const max = (): number => toFiniteNumberOr(options.max?.value, 100);
  const step = (): number => toPositiveStep(options.step?.value, 1);

  const clamp = (value: number): number => {
    const minValue = min();
    const maxValue = max();

    return clampRange(toFiniteNumberOr(value, minValue), minValue, maxValue);
  };

  const snap = (value: number): number => {
    const minValue = min();

    return clamp(Math.round(toFiniteNumberOr(value, minValue) / step()) * step());
  };

  const toPercent = (value: number): number => {
    const minValue = min();
    const maxValue = max();
    const normalized = toFiniteNumberOr(value, minValue);

    if (maxValue <= minValue) return 0;

    return ((normalized - minValue) / (maxValue - minValue)) * 100;
  };

  const fromClientX = (clientX: number, rect: { left: number; width: number }): number => {
    if (rect.width <= 0) return snap(min());

    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const minValue = min();
    const maxValue = max();

    return snap(minValue + pct * (maxValue - minValue));
  };

  const nextFromKey = (key: string, current: number): number | null => {
    const normalized = toFiniteNumberOr(current, min());

    if (key === 'ArrowRight' || key === 'ArrowUp') return clamp(normalized + step());

    if (key === 'ArrowLeft' || key === 'ArrowDown') return clamp(normalized - step());

    if (key === 'Home') return min();

    if (key === 'End') return max();

    return null;
  };

  const handleKeydown = (event: KeyboardEvent, currentValue: number, onCommit: (value: number) => void): boolean => {
    if (options.disabled?.value || options.readonly?.value) return false;

    const next = nextFromKey(event.key, currentValue);

    if (next === null) return false;

    event.preventDefault();
    onCommit(next);

    return true;
  };

  return { clamp, fromClientX, handleKeydown, max, min, nextFromKey, snap, toPercent };
};
