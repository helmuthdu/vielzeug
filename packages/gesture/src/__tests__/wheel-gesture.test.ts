import { createWheelGesture, normalizeWheel, type WheelGesture } from '../wheel-gesture.js';

describe('createWheelGesture', () => {
  const gestures: WheelGesture[] = [];
  const targets: Element[] = [];

  afterEach(() => {
    for (const gesture of gestures) gesture.dispose();
    for (const target of targets) target.remove();
    gestures.length = 0;
    targets.length = 0;
  });

  const createGesture = (options: Parameters<typeof createWheelGesture>[1] = {}) => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);
    const gesture = createWheelGesture(target, options);
    gestures.push(gesture);

    const dispatch = (init: WheelEventInit = {}) => {
      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
      target.dispatchEvent(event);
      return event;
    };
    return { dispatch, gesture, target };
  };

  it('reports pixel-mode deltas unchanged with the pinch flag from ctrlKey', () => {
    const onWheel = vi.fn();
    const { dispatch } = createGesture({ onWheel });

    dispatch({ deltaX: 10, deltaY: -20 });
    expect(onWheel).toHaveBeenLastCalledWith(expect.objectContaining({ deltaX: 10, deltaY: -20, pinch: false }));

    dispatch({ ctrlKey: true, deltaX: 3, deltaY: 4 });
    expect(onWheel).toHaveBeenLastCalledWith(expect.objectContaining({ deltaX: 3, deltaY: 4, pinch: true }));
  });

  it('normalizes line-mode deltas to CSS pixels', () => {
    const onWheel = vi.fn();
    const { dispatch } = createGesture({ onWheel });

    dispatch({ deltaMode: 1, deltaY: 3 });
    expect(onWheel).toHaveBeenLastCalledWith(expect.objectContaining({ deltaY: 48 }));
  });

  it('normalizes page-mode deltas by the target box', () => {
    const onWheel = vi.fn();
    const { dispatch } = createGesture({ onWheel });
    // jsdom reports clientWidth/clientHeight 0, so page mode falls back to the window box.
    dispatch({ deltaMode: 2, deltaY: 1 });
    const detail = onWheel.mock.calls.at(-1)?.[0] as { deltaY: number };
    const view = window;
    expect(detail.deltaY).toBe(Math.max(view.innerWidth, view.innerHeight, 1));
  });

  it('does not prevent default unless opted in', () => {
    const { dispatch } = createGesture();
    expect(dispatch({ deltaY: 10 }).defaultPrevented).toBe(false);
  });

  it('prevents default when opted in, per event or always', () => {
    const { dispatch } = createGesture({ preventDefault: true });
    expect(dispatch({ deltaY: 10 }).defaultPrevented).toBe(true);

    const selective = createGesture({ preventDefault: (event) => event.deltaY > 0 });
    expect(selective.dispatch({ deltaY: 10 }).defaultPrevented).toBe(true);
    expect(selective.dispatch({ deltaY: -10 }).defaultPrevented).toBe(false);
  });

  it('stops reporting when disabled and after disposal', () => {
    let disabled = false;
    const onWheel = vi.fn();
    const { dispatch, gesture } = createGesture({ disabled: () => disabled, onWheel });

    dispatch({ deltaY: 1 });
    expect(onWheel).toHaveBeenCalledOnce();

    disabled = true;
    dispatch({ deltaY: 2 });
    expect(onWheel).toHaveBeenCalledOnce();

    disabled = false;
    gesture.dispose();
    dispatch({ deltaY: 3 });
    expect(onWheel).toHaveBeenCalledOnce();
    expect(gesture.disposed).toBe(true);
  });

  it('disposes through an owner signal', () => {
    const controller = new AbortController();
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);
    const gesture = createWheelGesture(target, { signal: controller.signal });
    gestures.push(gesture);

    controller.abort();
    expect(gesture.disposed).toBe(true);
    expect(gesture.disposalSignal.aborted).toBe(true);
  });
});

describe('normalizeWheel', () => {
  const target = document.createElement('div');

  const wheel = (init: WheelEventInit) => new WheelEvent('wheel', init);

  it('passes pixel-mode deltas through', () => {
    expect(normalizeWheel(wheel({ deltaMode: 0, deltaX: 5, deltaY: -7 }), target)).toEqual({
      deltaX: 5,
      deltaY: -7,
    });
  });

  it('scales line-mode deltas by the line granularity', () => {
    expect(normalizeWheel(wheel({ deltaMode: 1, deltaX: 0, deltaY: 2 }), target)).toEqual({
      deltaX: 0,
      deltaY: 32,
    });
  });
});
