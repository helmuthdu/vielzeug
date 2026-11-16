import { createPinchGesture, type PinchGesture } from '../pinch-gesture.js';

describe('createPinchGesture', () => {
  const gestures: PinchGesture[] = [];
  const targets: Element[] = [];

  afterEach(() => {
    for (const gesture of gestures) gesture.dispose();
    for (const target of targets) target.remove();
    gestures.length = 0;
    targets.length = 0;
  });

  const createGesture = (options: Parameters<typeof createPinchGesture>[1] = {}) => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);
    const gesture = createPinchGesture(target, options);
    gestures.push(gesture);

    const dispatch = (type: string, init: PointerEventInit = {}, dispatchTarget: EventTarget = target) => {
      dispatchTarget.dispatchEvent(
        new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, pointerType: 'touch', ...init }),
      );
    };
    const down = (pointerId: number, x: number, y: number) =>
      dispatch('pointerdown', { clientX: x, clientY: y, pointerId });
    const move = (pointerId: number, x: number, y: number) =>
      dispatch('pointermove', { clientX: x, clientY: y, pointerId });
    const up = (pointerId: number, x: number, y: number, at: EventTarget = document) =>
      dispatch('pointerup', { clientX: x, clientY: y, pointerId }, at);

    return { dispatch, down, gesture, move, target, up };
  };

  it('activates once the span between the two pointers changes past the threshold', () => {
    const onStart = vi.fn();
    const { down, gesture, move } = createGesture({ activationDistance: 4, onStart });

    down(1, 0, 0);
    down(2, 10, 0);
    expect(gesture.active).toBe(false);
    expect(onStart).not.toHaveBeenCalled();

    move(2, 13, 0);
    expect(gesture.active).toBe(false);

    move(2, 14, 0);
    expect(gesture.active).toBe(true);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('reports scale and rotation relative to the pointerdown baseline', () => {
    const onStart = vi.fn();
    const onMove = vi.fn();
    const { down, gesture, move } = createGesture({ activationDistance: 0, onMove, onStart });

    // Baseline: span 10 along +x, centroid (5, 0), angle 0.
    down(1, 0, 0);
    down(2, 10, 0);
    expect(gesture.active).toBe(true);
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        centroid: { x: 5, y: 0 },
        rotation: 0,
        scale: 1,
        startCentroid: { x: 5, y: 0 },
      }),
    );

    // Double the span: scale 2, no rotation.
    move(2, 20, 0);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ rotation: 0, scale: 2 }));

    // Rotate the second pointer to (0, 10): angle becomes 90°, span unchanged.
    move(2, 0, 10);
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ rotation: expect.closeTo(Math.PI / 2, 6) }));
  });

  it('reports per-frame deltas against the previous event', () => {
    const onMove = vi.fn();
    const { down, move } = createGesture({ activationDistance: 0, onMove });

    down(1, 0, 0);
    down(2, 10, 0);
    move(2, 20, 0);
    // First move frame: scale 1→2, centroid (5,0)→(10,0).
    expect(onMove).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ deltaCentroid: { x: 5, y: 0 }, deltaRotation: 0, deltaScale: 1 }),
    );

    move(2, 30, 0);
    // Second frame: scale 2→3, centroid (10,0)→(15,0).
    expect(onMove).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ deltaCentroid: { x: 5, y: 0 }, deltaRotation: 0, deltaScale: 1 }),
    );
  });

  it('wraps rotation across the ±π seam', () => {
    const onMove = vi.fn();
    const { down, move } = createGesture({ activationDistance: 0, onMove });

    // Baseline angle is π (pointer 2 left of pointer 1), so a small downward swing of the
    // left pointer crosses atan2's ±π seam; the relative rotation must stay small.
    down(1, 10, 0);
    down(2, 0, 0);
    move(2, 0, -0.0001);
    const last = onMove.mock.calls.at(-1)?.[0] as { deltaRotation: number; rotation: number };
    expect(Math.abs(last.rotation)).toBeLessThan(0.01);
    expect(Math.abs(last.deltaRotation)).toBeLessThan(0.01);
  });

  it('ends when either pointer lifts and ignores the remaining pointer', () => {
    const onEnd = vi.fn();
    const onMove = vi.fn();
    const { down, gesture, move, up } = createGesture({ activationDistance: 0, onEnd, onMove });

    down(1, 0, 0);
    down(2, 10, 0);
    onMove.mockClear();

    up(2, 10, 0);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: 'release' }));
    expect(gesture.active).toBe(false);

    move(1, 50, 50);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ignores pointers beyond the first two', () => {
    const onMove = vi.fn();
    const { down, move } = createGesture({ activationDistance: 0, onMove });

    down(1, 0, 0);
    down(2, 10, 0);
    down(3, 5, 5);
    onMove.mockClear();

    move(3, 40, 40);
    expect(onMove).not.toHaveBeenCalled();

    move(2, 20, 0);
    expect(onMove).toHaveBeenCalledOnce();
  });

  it('cancels on pointercancel, window blur, and hidden document', () => {
    const onEnd = vi.fn();
    const { dispatch, down, gesture, target } = createGesture({ activationDistance: 0, onEnd });

    down(1, 0, 0);
    down(2, 10, 0);
    dispatch('pointercancel', { pointerId: 2 }, document);
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ reason: 'cancel' }));

    down(1, 0, 0);
    down(2, 10, 0);
    window.dispatchEvent(new Event('blur'));
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ reason: 'cancel' }));

    down(1, 0, 0);
    down(2, 10, 0);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ reason: 'cancel' }));
    expect(gesture.active).toBe(false);
    delete (document as { visibilityState?: string }).visibilityState;
    expect(target).toBeDefined();
  });

  it('cancels an active session through cancel()', () => {
    const onEnd = vi.fn();
    const { down, gesture } = createGesture({ activationDistance: 0, onEnd });

    down(1, 0, 0);
    down(2, 10, 0);
    expect(gesture.cancel()).toBe(true);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: 'cancel' }));
    expect(gesture.cancel()).toBe(false);
  });

  it('supports dynamic disabled state and owner-signal disposal', () => {
    let disabled = false;
    const onEnd = vi.fn();
    const controller = new AbortController();
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);
    const gesture = createPinchGesture(target, {
      activationDistance: 0,
      disabled: () => disabled,
      onEnd,
      signal: controller.signal,
    });
    gestures.push(gesture);

    const down = (pointerId: number, x: number, y: number) =>
      target.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y, pointerId }),
      );
    const move = (pointerId: number, x: number, y: number) =>
      target.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, button: 0, clientX: x, clientY: y, pointerId }),
      );

    down(1, 0, 0);
    down(2, 10, 0);
    disabled = true;
    move(2, 20, 0);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: 'cancel' }));

    controller.abort();
    expect(gesture.disposed).toBe(true);
    expect(gesture.disposalSignal.aborted).toBe(true);
  });

  it('rejects an invalid activation distance', () => {
    const target = document.createElement('div');
    expect(() => createPinchGesture(target, { activationDistance: -1 })).toThrow(/activationDistance/);
    expect(() => createPinchGesture(target, { activationDistance: Number.NaN })).toThrow(/activationDistance/);
  });

  it('survives targets whose setPointerCapture rejects synthetic ids', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);
    target.setPointerCapture = () => {
      throw new Error('invalid pointer id');
    };
    const gesture = createPinchGesture(target, { activationDistance: 0 });
    gestures.push(gesture);

    target.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0, pointerId: 1 }),
    );
    target.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 0, pointerId: 2 }),
    );
    expect(gesture.active).toBe(true);
  });
});
