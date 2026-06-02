import { signal } from '@vielzeug/ripple';

import { createSpinnerControl } from '../spinner';

describe('createSpinnerControl', () => {
  it('increments/decrements and clamps to min/max', () => {
    let value: number | null = 5;
    const control = createSpinnerControl({
      commit: (next) => {
        value = next;
      },
      max: signal(10),
      min: signal(0),
      parse: () => value,
      step: signal(3),
    });

    control.incrementBy(3);
    expect(value).toBe(8);

    control.incrementBy(5);
    expect(value).toBe(10);

    control.incrementBy(-20);
    expect(value).toBe(0);
  });

  it('uses min then 0 as fallback when parse is null', () => {
    let value: number | null = null;
    const control = createSpinnerControl({
      commit: (next) => {
        value = next;
      },
      min: signal(4),
      parse: () => value,
      step: signal(2),
    });

    control.incrementBy(2);
    expect(value).toBe(6);
  });

  it('handles keyboard navigation keys', () => {
    let value: number | null = 10;
    const control = createSpinnerControl({
      commit: (next) => {
        value = next;
      },
      largeStep: signal(20),
      max: signal(100),
      min: signal(0),
      parse: () => value,
      step: signal(5),
    });

    const pageUp = new KeyboardEvent('keydown', { key: 'PageUp' });
    const handledPageUp = control.handleKeydown(pageUp);

    expect(handledPageUp).toBe(true);
    expect(value).toBe(30);

    const end = new KeyboardEvent('keydown', { key: 'End' });
    const handledEnd = control.handleKeydown(end);

    expect(handledEnd).toBe(true);
    expect(value).toBe(100);
  });

  it('returns false for unsupported keys and blocked state', () => {
    let value: number | null = 10;
    const blocked = createSpinnerControl({
      commit: (next) => {
        value = next;
      },
      disabled: signal(true),
      parse: () => value,
      step: signal(1),
    });

    expect(blocked.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))).toBe(false);
    expect(value).toBe(10);

    const normal = createSpinnerControl({
      commit: (next) => {
        value = next;
      },
      parse: () => value,
    });

    expect(normal.handleKeydown(new KeyboardEvent('keydown', { key: 'x' }))).toBe(false);
  });
});
