import { clampNumber, normalizeFinite, toFiniteNumberOr, toPositiveStep } from './internal/number-utils';

export type SliderControlOptions = {
  max?: () => number | string | undefined;
  min?: () => number | string | undefined;
  step?: () => number | string | undefined;
};

export type SliderControl = {
  clamp: (value: number) => number;
  fromClientX: (clientX: number, rect: { left: number; width: number }) => number;
  max: () => number;
  min: () => number;
  nextFromKey: (key: string, current: number) => number | null;
  snap: (value: number) => number;
  toPercent: (value: number) => number;
};

export const createSliderControl = (options: SliderControlOptions): SliderControl => {
  const min = (): number => toFiniteNumberOr(options.min?.(), 0);
  const max = (): number => toFiniteNumberOr(options.max?.(), 100);
  const step = (): number => toPositiveStep(options.step?.(), 1);

  const clamp = (value: number): number => {
    const minValue = min();
    const maxValue = max();
    const normalized = normalizeFinite(value, minValue);

    return clampNumber(normalized, minValue, maxValue);
  };

  const snap = (value: number): number => {
    const minValue = min();
    const normalized = normalizeFinite(value, minValue);

    return clamp(Math.round(normalized / step()) * step());
  };

  const toPercent = (value: number): number => {
    const minValue = min();
    const maxValue = max();
    const normalized = normalizeFinite(value, minValue);

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
    const normalized = normalizeFinite(current, min());

    if (key === 'ArrowRight' || key === 'ArrowUp') return clamp(normalized + step());

    if (key === 'ArrowLeft' || key === 'ArrowDown') return clamp(normalized - step());

    if (key === 'Home') return min();

    if (key === 'End') return max();

    return null;
  };

  return {
    clamp,
    fromClientX,
    max,
    min,
    nextFromKey,
    snap,
    toPercent,
  };
};
