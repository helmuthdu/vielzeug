import { createSwipeGesture } from '../swipe-gesture';

describe('createSwipeGesture', () => {
  const mountGesture = (options: Parameters<typeof createSwipeGesture>[0] = {}) => {
    const gesture = createSwipeGesture(options);
    const target = document.createElement('div');
    const unmount = gesture.mount(target);

    const dispatch = (type: string, init: PointerEventInit = {}) => {
      target.dispatchEvent(new PointerEvent(type, init));
    };

    return { dispatch, gesture, target, unmount };
  };

  it('tracks pointer movement on the configured axis', () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    const { dispatch } = mountGesture({
      axis: () => 'x',
      onMove,
      onStart,
      threshold: () => 50,
    });

    dispatch('pointerdown', { clientX: 10, pointerId: 1 });
    dispatch('pointermove', { clientX: 35, pointerId: 1 });

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({ axis: 'x', current: 10, distance: 0, progress: 0, threshold: 50 }),
    );
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ axis: 'x', current: 35, distance: 25, progress: 0.5, threshold: 50 }),
    );
  });

  it('commits once the predicate passes and stops the active gesture', () => {
    const onCommit = vi.fn();
    const { dispatch, gesture } = mountGesture({
      onCommit,
      shouldCommit: ({ distance, threshold }) => distance >= threshold,
      threshold: () => 40,
    });

    dispatch('pointerdown', { clientX: 0, pointerId: 3 });

    dispatch('pointermove', { clientX: 20, pointerId: 3 });
    expect(onCommit).not.toHaveBeenCalled();
    expect(gesture.isActive()).toBe(true);

    dispatch('pointermove', { clientX: 50, pointerId: 3 });
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ distance: 50, progress: 1, threshold: 40 }));
    expect(gesture.isActive()).toBe(false);
  });

  it('fires onRelease (not onCancel) when the pointer ends before commit', () => {
    const onCancel = vi.fn();
    const onRelease = vi.fn();
    const { dispatch, gesture } = mountGesture({
      axis: () => 'y',
      onCancel,
      onRelease,
      threshold: () => 60,
    });

    dispatch('pointerdown', { clientY: 5, pointerId: 7 });

    dispatch('pointerup', { clientY: 30, pointerId: 7 });
    expect(onRelease).toHaveBeenCalledWith(expect.objectContaining({ axis: 'y', distance: 25, progress: 25 / 60 }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(gesture.isActive()).toBe(false);
  });

  it('ignores disabled state and unrelated pointer ids', () => {
    const onMove = vi.fn();
    const { dispatch: dispatchDisabled, gesture: disabledGesture } = mountGesture({
      disabled: true,
      onMove,
    });

    dispatchDisabled('pointerdown', { clientX: 0, pointerId: 1 });
    expect(disabledGesture.isActive()).toBe(false);

    let disabled = false;
    const { dispatch, gesture } = mountGesture({ disabled: () => disabled, onMove });

    dispatch('pointerdown', { clientX: 0, pointerId: 1 });
    disabled = true;
    dispatch('pointermove', { clientX: 20, pointerId: 2 });
    expect(onMove).not.toHaveBeenCalled();
    expect(gesture.isActive()).toBe(true);
  });

  it('rejects non-primary pointers and non-primary mouse button presses', () => {
    const { dispatch, gesture } = mountGesture();
    dispatch('pointerdown', { button: 1, isPrimary: true, pointerType: 'mouse' });
    expect(gesture.isActive()).toBe(false);
    dispatch('pointerdown', { button: 0, isPrimary: false, pointerType: 'pen' });
    expect(gesture.isActive()).toBe(false);
  });

  it('accepts a custom capture target', () => {
    const handle = document.createElement('div');
    const { dispatch, gesture } = mountGesture({ captureTarget: () => handle });

    dispatch('pointerdown', { isPrimary: true, pointerId: 4, pointerType: 'touch' });
    dispatch('pointerup', { isPrimary: true, pointerId: 4, pointerType: 'touch' });
    expect(gesture.isActive()).toBe(false);
  });

  it('handlePointerCancel fires onCancel and resets active state', () => {
    const onCancel = vi.fn();
    const { dispatch, gesture } = mountGesture({ axis: () => 'x', onCancel, threshold: () => 60 });

    dispatch('pointerdown', { clientX: 0, pointerId: 9 });
    expect(gesture.isActive()).toBe(true);

    dispatch('pointercancel', { clientX: 20, pointerId: 9 });
    expect(gesture.isActive()).toBe(false);
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ distance: 20 }));
  });

  it('cancel() fires onCancel and resets active state', () => {
    const onCancel = vi.fn();
    const { dispatch, gesture } = mountGesture({ axis: () => 'x', onCancel, threshold: () => 60 });

    dispatch('pointerdown', { clientX: 10, pointerId: 3 });
    const result = gesture.cancel();

    expect(result).toBe(true);
    expect(gesture.isActive()).toBe(false);
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ distance: 0 }));
  });

  it('supports shouldStart guards', () => {
    const { dispatch, gesture } = mountGesture({
      shouldStart: () => false,
    });

    dispatch('pointerdown', { clientX: 0, pointerId: 1 });
    expect(gesture.isActive()).toBe(false);
  });

  it('dispose() resets active state and marks the gesture disposed', () => {
    const { dispatch, gesture } = mountGesture({ threshold: () => 100 });

    dispatch('pointerdown', { clientX: 0, pointerId: 1 });
    expect(gesture.isActive()).toBe(true);

    expect(gesture.disposed).toBe(false);
    gesture.dispose();

    expect(gesture.isActive()).toBe(false);
    expect(gesture.disposed).toBe(true);
    expect(gesture.disposalSignal.aborted).toBe(true);
  });

  it('mount() throws once disposed', () => {
    const gesture = createSwipeGesture({ threshold: () => 100 });
    gesture.dispose();
    expect(() => gesture.mount(document.createElement('div'))).toThrow('Swipe gesture is disposed');
  });

  it('unmount detaches listeners', () => {
    const onStart = vi.fn();
    const { dispatch, gesture, unmount } = mountGesture({ onStart });

    dispatch('pointerdown', { clientX: 0, pointerId: 1 });
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(gesture.isActive()).toBe(true);

    gesture.cancel();
    unmount();
    dispatch('pointerdown', { clientX: 0, pointerId: 2 });

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(gesture.isActive()).toBe(false);
  });

  it('mount() rejects duplicate mounts on one handle', () => {
    const gesture = createSwipeGesture({});
    const first = document.createElement('div');
    const second = document.createElement('div');
    const unmount = gesture.mount(first);

    expect(() => gesture.mount(second)).toThrow('Swipe gesture is already mounted');

    unmount();
    expect(() => gesture.mount(second)).not.toThrow();
  });

  it('[Symbol.dispose]() resets active state and aborts the disposal signal', () => {
    const { dispatch, gesture } = mountGesture({ threshold: () => 100 });

    dispatch('pointerdown', { clientX: 0, pointerId: 2 });
    expect(gesture.isActive()).toBe(true);

    gesture[Symbol.dispose]();

    expect(gesture.isActive()).toBe(false);
    expect(gesture.disposed).toBe(true);
    expect(gesture.disposalSignal.aborted).toBe(true);
  });

  it('supports cancel-active disabled behavior', () => {
    let disabled = false;
    const onCancel = vi.fn();
    const { dispatch, gesture } = mountGesture({
      disabled: () => disabled,
      disabledBehavior: 'cancel-active',
      onCancel,
      threshold: () => 100,
    });

    dispatch('pointerdown', { clientX: 10, pointerId: 10 });
    expect(gesture.isActive()).toBe(true);

    disabled = true;
    dispatch('pointermove', { clientX: 30, pointerId: 10 });

    expect(gesture.isActive()).toBe(false);
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ distance: 20 }));
  });
});
