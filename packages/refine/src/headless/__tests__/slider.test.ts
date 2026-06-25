import { signal } from '@vielzeug/ripple';
import { vi } from 'vitest';

import { createSliderControl } from '../slider';

describe('createSliderControl', () => {
  it('snaps and clamps values', () => {
    const control = createSliderControl({
      max: signal(100),
      min: signal(0),
      step: signal(10),
    });

    expect(control.snap(14)).toBe(10);
    expect(control.snap(96)).toBe(100);
    expect(control.snap(-7)).toBe(0);
  });

  it('maps clientX to snapped values', () => {
    const control = createSliderControl({
      max: signal(100),
      min: signal(0),
      step: signal(5),
    });

    expect(control.fromClientX(50, { left: 0, width: 100 })).toBe(50);
    expect(control.fromClientX(-10, { left: 0, width: 100 })).toBe(0);
    expect(control.fromClientX(130, { left: 0, width: 100 })).toBe(100);
  });

  it('resolves keyboard transitions', () => {
    const control = createSliderControl({
      max: signal(20),
      min: signal(10),
      step: signal(2),
    });

    expect(control.nextFromKey('ArrowRight', 12)).toBe(14);
    expect(control.nextFromKey('ArrowLeft', 12)).toBe(10);
    expect(control.nextFromKey('Home', 18)).toBe(10);
    expect(control.nextFromKey('End', 12)).toBe(20);
    expect(control.nextFromKey('x', 12)).toBeNull();
  });

  it('computes percentages with safe fallback', () => {
    const control = createSliderControl({
      max: signal(100),
      min: signal(0),
    });

    expect(control.toPercent(25)).toBe(25);

    const collapsed = createSliderControl({
      max: signal(10),
      min: signal(10),
    });

    expect(collapsed.toPercent(10)).toBe(0);
  });

  it('handleKeydown returns false when disabled or readonly', () => {
    const disabledControl = createSliderControl({ disabled: signal(true) });
    const readonlyControl = createSliderControl({ readonly: signal(true) });
    const onCommit = vi.fn();

    expect(disabledControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), 50, onCommit)).toBe(
      false,
    );
    expect(readonlyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), 50, onCommit)).toBe(
      false,
    );
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('fromClientX returns snapped min when rect width is zero', () => {
    const control = createSliderControl({ max: signal(100), min: signal(0), step: signal(10) });

    expect(control.fromClientX(50, { left: 0, width: 0 })).toBe(0);
  });

  it('handleKeydown commits the next value and returns true', () => {
    const onCommit = vi.fn();
    const control = createSliderControl({
      max: signal(100),
      min: signal(0),
      step: signal(10),
    });

    const result = control.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), 50, onCommit);

    expect(result).toBe(true);
    expect(onCommit).toHaveBeenCalledWith(60);
  });

  it('handleKeydown returns false and does not commit for unrecognised key', () => {
    const onCommit = vi.fn();
    const control = createSliderControl({ max: signal(100), min: signal(0) });

    const result = control.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 50, onCommit);

    expect(result).toBe(false);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('handleKeydown commits min on Home and max on End', () => {
    const onCommit = vi.fn();
    const control = createSliderControl({ max: signal(100), min: signal(0), step: signal(10) });

    control.handleKeydown(new KeyboardEvent('keydown', { key: 'Home' }), 50, onCommit);
    expect(onCommit).toHaveBeenLastCalledWith(0);

    control.handleKeydown(new KeyboardEvent('keydown', { key: 'End' }), 50, onCommit);
    expect(onCommit).toHaveBeenLastCalledWith(100);
  });

  it('falls back safely for non-finite values', () => {
    const control = createSliderControl({
      max: signal(20),
      min: signal(10),
      step: signal(2),
    });

    expect(control.snap(Number.NaN)).toBe(10);
    expect(control.clamp(Number.NaN)).toBe(10);
    expect(control.nextFromKey('ArrowRight', Number.NaN)).toBe(12);
    expect(control.toPercent(Number.NaN)).toBe(0);
  });
});
