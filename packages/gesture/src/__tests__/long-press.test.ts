import { createLongPress, type LongPress, type LongPressOptions } from '../long-press';

describe('createLongPress', () => {
  const gestures: LongPress[] = [];
  const targets: Element[] = [];

  afterEach(() => {
    for (const gesture of gestures) gesture.dispose();
    for (const target of targets) target.remove();
    gestures.length = 0;
    targets.length = 0;
    vi.useRealTimers();
  });

  const createHold = (options: LongPressOptions = {}) => {
    const target = document.createElement('div');

    document.body.appendChild(target);
    targets.push(target);

    const gesture = createLongPress(target, options);

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

  it('fires after the hold duration with the originating pointerdown', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { dispatch, target } = createHold({ onLongPress });

    dispatch('pointerdown', { clientX: 10, clientY: 10 });

    expect(onLongPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(onLongPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledWith(expect.objectContaining({ pointerId: 1, pointerType: 'touch', target }));
  });

  it('does not fire when the pointer is released before the duration', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { dispatch } = createHold({ onLongPress });

    dispatch('pointerdown', { clientX: 10, clientY: 10 });
    dispatch('pointerup', { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels the hold when the pointer moves beyond the slop distance', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { dispatch } = createHold({ onLongPress });

    dispatch('pointerdown', { clientX: 10, clientY: 10 });
    dispatch('pointermove', { clientX: 20, clientY: 12 });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('keeps the hold while the pointer moves within the slop distance', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { dispatch } = createHold({ onLongPress });

    dispatch('pointerdown', { clientX: 10, clientY: 10 });
    dispatch('pointermove', { clientX: 13, clientY: 11 });
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('honors a custom duration and slop', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { dispatch } = createHold({ durationMs: 100, onLongPress, slopPx: 20 });

    dispatch('pointerdown', { clientX: 0, clientY: 0 });
    dispatch('pointermove', { clientX: 15, clientY: 0 });
    vi.advanceTimersByTime(100);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('swallows the click that follows a fired hold', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { dispatch, target } = createHold({ onLongPress });

    target.addEventListener('click', onClick);
    dispatch('pointerdown', { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(500);
    dispatch('pointerup', { clientX: 10, clientY: 10 });
    dispatch('click', {});

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not swallow clicks when no hold fired', () => {
    const onClick = vi.fn();
    const { dispatch, target } = createHold();

    target.addEventListener('click', onClick);
    dispatch('click', {});

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('cancels when the page is hidden or the window blurs mid-hold', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { dispatch } = createHold({ onLongPress });

    dispatch('pointerdown', { clientX: 0, clientY: 0 });
    window.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('ignores non-primary pointers and pointers rejected by shouldStart', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { dispatch } = createHold({ onLongPress, shouldStart: (event) => event.pointerType !== 'mouse' });

    dispatch('pointerdown', { clientX: 0, clientY: 0, isPrimary: false });
    dispatch('pointerdown', { clientX: 0, clientY: 0, pointerType: 'mouse' });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('reports activity and cancels a pending hold', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { dispatch, gesture } = createHold({ onLongPress });

    dispatch('pointerdown', { clientX: 0, clientY: 0 });
    expect(gesture.active).toBe(true);
    expect(gesture.cancel()).toBe(true);
    expect(gesture.active).toBe(false);

    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('disposes with the ownership signal and stops recognizing', () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const onLongPress = vi.fn();
    const { dispatch, gesture } = createHold({ onLongPress, signal: controller.signal });

    controller.abort();

    expect(gesture.disposed).toBe(true);

    dispatch('pointerdown', { clientX: 0, clientY: 0 });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('rejects invalid duration and slop values', () => {
    expect(() => createHold({ durationMs: 0 })).toThrowError(/durationMs/);
    expect(() => createHold({ durationMs: Number.NaN })).toThrowError(/durationMs/);
    expect(() => createHold({ slopPx: -1 })).toThrowError(/slopPx/);
  });
});
