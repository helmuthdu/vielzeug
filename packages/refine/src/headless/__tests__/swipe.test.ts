import { signal } from '@vielzeug/ripple';

import { createSwipeControl } from '../swipe';

describe('createSwipeControl', () => {
  it('tracks pointer movement on the configured axis', () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    const control = createSwipeControl({
      axis: () => 'x',
      onMove,
      onStart,
      threshold: () => 50,
    });

    expect(control.handlePointerDown(new PointerEvent('pointerdown', { clientX: 10, pointerId: 1 }))).toBe(true);
    expect(control.handlePointerMove(new PointerEvent('pointermove', { clientX: 35, pointerId: 1 }))).toBe(true);

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({ axis: 'x', current: 10, distance: 0, progress: 0, threshold: 50 }),
    );
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ axis: 'x', current: 35, distance: 25, progress: 0.5, threshold: 50 }),
    );
  });

  it('commits once the predicate passes and stops the active drag', () => {
    const onCommit = vi.fn();
    const control = createSwipeControl({
      onCommit,
      shouldCommit: ({ distance, threshold }) => distance >= threshold,
      threshold: () => 40,
    });

    control.handlePointerDown(new PointerEvent('pointerdown', { clientX: 0, pointerId: 3 }));

    expect(control.handlePointerMove(new PointerEvent('pointermove', { clientX: 20, pointerId: 3 }))).toBe(true);
    expect(onCommit).not.toHaveBeenCalled();
    expect(control.isActive()).toBe(true);

    expect(control.handlePointerMove(new PointerEvent('pointermove', { clientX: 50, pointerId: 3 }))).toBe(true);
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ distance: 50, progress: 1, threshold: 40 }));
    expect(control.isActive()).toBe(false);
  });

  it('fires onRelease (not onCancel) when the pointer ends before commit', () => {
    const onCancel = vi.fn();
    const onRelease = vi.fn();
    const control = createSwipeControl({
      axis: () => 'y',
      onCancel,
      onRelease,
      threshold: () => 60,
    });

    control.handlePointerDown(new PointerEvent('pointerdown', { clientY: 5, pointerId: 7 }));

    expect(control.handlePointerUp(new PointerEvent('pointerup', { clientY: 30, pointerId: 7 }))).toBe(true);
    expect(onRelease).toHaveBeenCalledWith(expect.objectContaining({ axis: 'y', distance: 25, progress: 25 / 60 }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(control.isActive()).toBe(false);
  });

  it('ignores disabled state and unrelated pointer ids', () => {
    const onMove = vi.fn();
    const disabled = createSwipeControl({
      disabled: signal(true),
      onMove,
    });

    expect(disabled.handlePointerDown(new PointerEvent('pointerdown', { clientX: 0, pointerId: 1 }))).toBe(false);

    const control = createSwipeControl({ onMove });

    control.handlePointerDown(new PointerEvent('pointerdown', { clientX: 0, pointerId: 1 }));

    expect(control.handlePointerMove(new PointerEvent('pointermove', { clientX: 20, pointerId: 2 }))).toBe(false);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('captures the pointer on the current target when available', () => {
    const handle = document.createElement('div');
    const setPointerCapture = vi.fn();
    const control = createSwipeControl({});
    const event = new PointerEvent('pointerdown', { pointerId: 4 });

    Object.defineProperty(handle, 'setPointerCapture', { value: setPointerCapture });
    Object.defineProperty(event, 'currentTarget', { value: handle });

    control.handlePointerDown(event);

    expect(setPointerCapture).toHaveBeenCalledWith(4);
  });

  it('handlePointerCancel fires onCancel and resets active state', () => {
    const onCancel = vi.fn();
    const control = createSwipeControl({ axis: () => 'x', onCancel, threshold: () => 60 });

    control.handlePointerDown(new PointerEvent('pointerdown', { clientX: 0, pointerId: 9 }));
    expect(control.isActive()).toBe(true);

    const result = control.handlePointerCancel(new PointerEvent('pointercancel', { clientX: 20, pointerId: 9 }));

    expect(result).toBe(true);
    expect(control.isActive()).toBe(false);
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ distance: 20 }));
  });

  it('handlePointerCancel returns false for unrelated pointer id', () => {
    const control = createSwipeControl({});

    control.handlePointerDown(new PointerEvent('pointerdown', { clientX: 0, pointerId: 1 }));

    expect(control.handlePointerCancel(new PointerEvent('pointercancel', { pointerId: 99 }))).toBe(false);
    expect(control.isActive()).toBe(true);

    control.dispose();
  });

  it('dispose() resets active state and marks the control disposed', () => {
    const control = createSwipeControl({ threshold: () => 100 });

    control.handlePointerDown(new PointerEvent('pointerdown', { clientX: 0, pointerId: 1 }));
    expect(control.isActive()).toBe(true);

    expect(control.disposed).toBe(false);
    control.dispose();

    expect(control.isActive()).toBe(false);
    expect(control.disposed).toBe(true);
  });

  it('handlePointerDown no-ops once disposed', () => {
    const control = createSwipeControl({ threshold: () => 100 });

    control.dispose();

    expect(control.handlePointerDown(new PointerEvent('pointerdown', { clientX: 0, pointerId: 1 }))).toBe(false);
    expect(control.isActive()).toBe(false);
  });

  it('[Symbol.dispose] resets active state', () => {
    const control = createSwipeControl({ threshold: () => 100 });

    control.handlePointerDown(new PointerEvent('pointerdown', { clientX: 0, pointerId: 2 }));
    expect(control.isActive()).toBe(true);

    control[Symbol.dispose]();

    expect(control.isActive()).toBe(false);
  });

  it('allows consumers to disable pointer capture explicitly', () => {
    const handle = document.createElement('div');
    const setPointerCapture = vi.fn();
    const control = createSwipeControl({
      captureTarget: () => null,
    });
    const event = new PointerEvent('pointerdown', { pointerId: 5 });

    Object.defineProperty(handle, 'setPointerCapture', { value: setPointerCapture });
    Object.defineProperty(event, 'currentTarget', { value: handle });

    control.handlePointerDown(event);

    expect(setPointerCapture).not.toHaveBeenCalled();
  });
});
