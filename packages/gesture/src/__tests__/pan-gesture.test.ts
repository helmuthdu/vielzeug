import { createPanGesture, type PanGesture, type PanGestureOptions } from '../pan-gesture';

describe('createPanGesture', () => {
  const gestures: PanGesture[] = [];
  const targets: Element[] = [];

  afterEach(() => {
    for (const gesture of gestures) gesture.dispose();
    for (const target of targets) target.remove();
    gestures.length = 0;
    targets.length = 0;
  });

  const createGesture = (options: PanGestureOptions = {}) => {
    const target = document.createElement('div');

    document.body.appendChild(target);
    targets.push(target);

    const gesture = createPanGesture(target, options);

    gestures.push(gesture);

    const dispatch = (type: string, init: PointerEventInit = {}, dispatchTarget: EventTarget = target) => {
      dispatchTarget.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          isPrimary: true,
          pointerId: 1,
          pointerType: 'touch',
          ...init,
        }),
      );
    };

    return { dispatch, gesture, target };
  };

  it('activates only after movement passes the internal slop on the configured axis', () => {
    const onMove = vi.fn();
    const onStart = vi.fn();
    const { dispatch, gesture } = createGesture({ axis: 'x', onMove, onStart });

    dispatch('pointerdown', { clientX: 10, clientY: 10 });
    dispatch('pointermove', { clientX: 14, clientY: 11 });

    expect(gesture.active).toBe(false);
    expect(onStart).not.toHaveBeenCalled();

    dispatch('pointermove', { clientX: 20, clientY: 12 });

    expect(gesture.active).toBe(true);
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ axis: 'x', distance: 10, start: 10 }));
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ current: 20, distance: 10 }));
  });

  it('rejects movement dominated by the cross axis', () => {
    const onMove = vi.fn();
    const onStart = vi.fn();
    const { dispatch, gesture } = createGesture({ axis: 'x', onMove, onStart });

    dispatch('pointerdown', { clientX: 10, clientY: 10 });
    dispatch('pointermove', { clientX: 12, clientY: 30 });
    dispatch('pointermove', { clientX: 40, clientY: 30 });

    expect(gesture.active).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ends an active pan once on pointer release', () => {
    const onEnd = vi.fn();
    const { dispatch, gesture, target } = createGesture({ axis: 'y', onEnd });

    dispatch('pointerdown', { clientY: 5 });
    dispatch('pointermove', { clientY: 20 });
    dispatch('pointerup', { clientY: 35 }, document);

    expect(onEnd).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ axis: 'y', distance: 30, reason: 'release', target }));
    expect(gesture.active).toBe(false);
  });

  it('ends an active pan as cancelled on pointer cancellation', () => {
    const onEnd = vi.fn();
    const { dispatch, gesture } = createGesture({ onEnd });

    dispatch('pointerdown', { clientX: 0 });
    dispatch('pointermove', { clientX: 10 });
    dispatch('pointercancel', { clientX: 20 }, document);

    expect(onEnd).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ distance: 20, reason: 'cancel' }));
    expect(gesture.active).toBe(false);
  });

  it('tracks an active pointer outside the target', () => {
    const onMove = vi.fn();
    const onEnd = vi.fn();
    const { dispatch } = createGesture({ onEnd, onMove });

    dispatch('pointerdown', { clientX: 0 });
    dispatch('pointermove', { clientX: 12 }, document);
    dispatch('pointerup', { clientX: 30 }, document);

    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ distance: 12 }));
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ distance: 30, reason: 'release' }));
  });

  it('captures the pointer only after axis intent is recognized', () => {
    const { dispatch, target } = createGesture({ axis: 'x' });
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();

    Object.defineProperties(target, {
      hasPointerCapture: { value: () => true },
      releasePointerCapture: { value: releasePointerCapture },
      setPointerCapture: { value: setPointerCapture },
    });

    dispatch('pointerdown', { clientX: 0, clientY: 0 });
    dispatch('pointermove', { clientX: 3, clientY: 1 });

    expect(setPointerCapture).not.toHaveBeenCalled();

    dispatch('pointermove', { clientX: 10, clientY: 2 });
    dispatch('pointerup', { clientX: 20, clientY: 2 }, document);

    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('tracks across the document without capturing when pointer capture is disabled', () => {
    const onEnd = vi.fn();
    const { dispatch, target } = createGesture({ onEnd, pointerCapture: false });
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();

    Object.defineProperties(target, {
      hasPointerCapture: { value: () => true },
      releasePointerCapture: { value: releasePointerCapture },
      setPointerCapture: { value: setPointerCapture },
    });

    dispatch('pointerdown', { clientX: 0 });
    dispatch('pointermove', { clientX: 10 }, document);
    dispatch('pointerup', { clientX: 20 }, document);

    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ distance: 20, reason: 'release' }));
    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(releasePointerCapture).not.toHaveBeenCalled();
  });

  it('ignores disabled and unrelated pointers', () => {
    const onMove = vi.fn();
    const { dispatch, gesture } = createGesture({ disabled: true, onMove });

    dispatch('pointerdown', { clientX: 0 });
    dispatch('pointermove', { clientX: 20 });

    expect(gesture.active).toBe(false);

    const disabled = false;
    const enabled = createGesture({ disabled: () => disabled, onMove });

    enabled.dispatch('pointerdown', { clientX: 0, pointerId: 2 });
    enabled.dispatch('pointermove', { clientX: 20, pointerId: 3 });

    expect(enabled.gesture.active).toBe(false);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('cancels an active pan when disabled becomes true', () => {
    let disabled = false;
    const onEnd = vi.fn();
    const { dispatch, gesture } = createGesture({ disabled: () => disabled, onEnd });

    dispatch('pointerdown', { clientX: 0 });
    dispatch('pointermove', { clientX: 10 });
    disabled = true;
    dispatch('pointermove', { clientX: 20 });

    expect(gesture.active).toBe(false);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ distance: 20, reason: 'cancel' }));
  });

  it('rejects non-primary pointers and non-primary mouse buttons', () => {
    const { dispatch, gesture } = createGesture();

    dispatch('pointerdown', { button: 1, pointerType: 'mouse' });
    expect(gesture.active).toBe(false);

    dispatch('pointerdown', { button: 0, isPrimary: false, pointerType: 'pen' });
    dispatch('pointermove', { clientX: 20, isPrimary: false, pointerType: 'pen' });
    expect(gesture.active).toBe(false);
  });

  it('supports shouldStart guards', () => {
    const onStart = vi.fn();
    const { dispatch, gesture } = createGesture({ onStart, shouldStart: () => false });

    dispatch('pointerdown', { clientX: 0 });
    dispatch('pointermove', { clientX: 20 });

    expect(gesture.active).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('samples a dynamic axis when each pointer interaction starts', () => {
    let axis: 'x' | 'y' = 'x';
    const onEnd = vi.fn();
    const { dispatch } = createGesture({ axis: () => axis, onEnd });

    dispatch('pointerdown', { clientX: 0, clientY: 0 });
    dispatch('pointermove', { clientX: 20, clientY: 0 });
    dispatch('pointerup', { clientX: 20, clientY: 0 });

    axis = 'y';
    dispatch('pointerdown', { clientX: 0, clientY: 0, pointerId: 2 });
    dispatch('pointermove', { clientX: 0, clientY: 20, pointerId: 2 });
    dispatch('pointerup', { clientX: 0, clientY: 30, pointerId: 2 });

    expect(onEnd.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ axis: 'x', distance: 20 }));
    expect(onEnd.mock.calls[1]?.[0]).toEqual(expect.objectContaining({ axis: 'y', distance: 30 }));
  });

  it('cancel() emits one terminal cancellation and stops movement', () => {
    const onEnd = vi.fn();
    let gesture: PanGesture;
    const created = createGesture({
      onEnd,
      onMove: () => {
        gesture.cancel();
      },
    });

    gesture = created.gesture;
    created.dispatch('pointerdown', { clientX: 0 });
    created.dispatch('pointermove', { clientX: 20 });
    created.dispatch('pointermove', { clientX: 40 });

    expect(onEnd).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: 'cancel' }));
    expect(gesture.active).toBe(false);
  });

  it('dispose() releases state and detaches the target', () => {
    const onStart = vi.fn();
    const { dispatch, gesture } = createGesture({ onStart });

    dispatch('pointerdown', { clientX: 0 });
    dispatch('pointermove', { clientX: 20 });

    expect(gesture.active).toBe(true);
    expect(gesture.disposed).toBe(false);

    gesture.dispose();
    dispatch('pointerdown', { clientX: 0, pointerId: 2 });
    dispatch('pointermove', { clientX: 20, pointerId: 2 });

    expect(gesture.active).toBe(false);
    expect(gesture.disposed).toBe(true);
    expect(gesture.disposalSignal.aborted).toBe(true);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('[Symbol.dispose]() disposes the gesture', () => {
    const { gesture } = createGesture();

    gesture[Symbol.dispose]();

    expect(gesture.disposed).toBe(true);
    expect(gesture.disposalSignal.aborted).toBe(true);
  });
});
