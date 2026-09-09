import { createDragGesture, type DragGesture } from '../drag-gesture.js';

describe('createDragGesture', () => {
  const gestures: DragGesture[] = [];
  const targets: Element[] = [];

  afterEach(() => {
    for (const gesture of gestures) gesture.dispose();
    for (const target of targets) target.remove();
    gestures.length = 0;
    targets.length = 0;
  });

  const createGesture = (options: Parameters<typeof createDragGesture>[1] = {}) => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);
    const gesture = createDragGesture(target, options);
    gestures.push(gesture);
    const dispatch = (type: string, init: PointerEventInit = {}, dispatchTarget: EventTarget = target) => {
      dispatchTarget.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          isPrimary: true,
          pointerId: 1,
          pointerType: 'touch',
          ...init,
        }),
      );
    };
    return { dispatch, gesture, target };
  };

  it('activates from unrestricted two-dimensional movement', () => {
    const onMove = vi.fn();
    const onStart = vi.fn();
    const { dispatch, gesture } = createGesture({ activationDistance: 10, onMove, onStart });

    dispatch('pointerdown', { clientX: 10, clientY: 20 });
    dispatch('pointermove', { clientX: 16, clientY: 26 });
    expect(gesture.active).toBe(false);

    dispatch('pointermove', { clientX: 18, clientY: 28 });

    expect(gesture.active).toBe(true);
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        current: { x: 18, y: 28 },
        delta: { x: 8, y: 8 },
        start: { x: 10, y: 20 },
      }),
    );
    expect(onMove).toHaveBeenCalledOnce();
  });

  it('keeps zero-distance sessions pending until actual movement', () => {
    const onStart = vi.fn();
    const { dispatch } = createGesture({ activationDistance: 0, onStart });

    dispatch('pointerdown', { clientX: 0, clientY: 0 });
    dispatch('pointermove', { clientX: 0, clientY: 0 });
    expect(onStart).not.toHaveBeenCalled();

    dispatch('pointermove', { clientX: 0, clientY: 0.1 });
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('reports release and cancellation with the final point', () => {
    const onEnd = vi.fn();
    const { dispatch, gesture } = createGesture({ onEnd });

    dispatch('pointerdown', { clientX: 0, clientY: 0 });
    dispatch('pointermove', { clientX: 8, clientY: 9 });
    dispatch('pointerup', { clientX: 12, clientY: 14 }, document);
    expect(onEnd).toHaveBeenLastCalledWith(
      expect.objectContaining({ current: { x: 12, y: 14 }, delta: { x: 12, y: 14 }, reason: 'release' }),
    );

    dispatch('pointerdown', { clientX: 2, clientY: 3, pointerId: 2 });
    dispatch('pointermove', { clientX: 12, clientY: 13, pointerId: 2 });
    expect(gesture.cancel()).toBe(true);
    expect(onEnd).toHaveBeenLastCalledWith(expect.objectContaining({ reason: 'cancel' }));
  });

  it('supports admission and dynamic disabled state', () => {
    let disabled = false;
    const onEnd = vi.fn();
    const { dispatch, gesture } = createGesture({
      disabled: () => disabled,
      onEnd,
      shouldStart: (event) => event.pointerType === 'touch',
    });

    dispatch('pointerdown', { clientX: 0, pointerType: 'mouse' });
    dispatch('pointermove', { clientX: 10, pointerType: 'mouse' });
    expect(gesture.active).toBe(false);

    dispatch('pointerdown', { clientX: 0 });
    dispatch('pointermove', { clientX: 10 });
    disabled = true;
    dispatch('pointermove', { clientX: 20 });

    expect(gesture.active).toBe(false);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: 'cancel' }));
  });
});
