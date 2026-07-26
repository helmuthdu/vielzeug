import { _resetWarnings } from '../_dev';
import { createPointerEvent, fire } from '../events';

beforeEach(() => {
  // Fallback warnings are "once per process" state, not "once per test" — reset it so
  // PointerEvent/TouchEvent fallback tests don't depend on running before any other test
  // that happens to exercise the same fallback path.
  _resetWarnings();
});

// Every row's `dispatch` is normalized to the same (el, opts?) => boolean shape, even though
// the underlying fire.* methods don't all share that signature (fire.mouse/keyboard/custom
// also take a `type` string) — keeping the table itself uniform avoids a union-busting cast
// at the call site below, at the cost of one wrapper closure per row.
const dispatchCases: {
  check: (e: Event) => void;
  ctor: abstract new (...args: never[]) => Event;
  dispatch: (el: Element) => boolean;
  label: string;
  type: string;
}[] = [
  {
    check: (e) => expect((e as MouseEvent).clientX).toBe(100),
    ctor: MouseEvent,
    dispatch: (el) => fire.mouse(el, 'click', { clientX: 100 }),
    label: 'fire.mouse',
    type: 'click',
  },
  {
    check: (e) => expect((e as KeyboardEvent).key).toBe('Enter'),
    ctor: KeyboardEvent,
    dispatch: (el) => fire.keyDown(el, { key: 'Enter' }),
    label: 'fire.keyDown',
    type: 'keydown',
  },
  {
    check: (e) => expect((e as KeyboardEvent).key).toBe('Enter'),
    ctor: KeyboardEvent,
    dispatch: (el) => fire.keyboard(el, 'keydown', { key: 'Enter' }),
    label: 'fire.keyboard',
    type: 'keydown',
  },
  {
    check: (e) => expect(e.type).toBe('focus'),
    ctor: FocusEvent,
    dispatch: (el) => fire.focus(el),
    label: 'fire.focus',
    type: 'focus',
  },
  {
    check: (e) => expect((e as CustomEvent).detail).toEqual({ ok: true }),
    ctor: CustomEvent,
    dispatch: (el) => fire.custom(el, 'custom-event', { detail: { ok: true } }),
    label: 'fire.custom',
    type: 'custom-event',
  },
  {
    check: (e) => expect((e as PointerEvent).clientX).toBe(10),
    ctor: MouseEvent, // PointerEvent extends MouseEvent — this also covers the jsdom fallback path
    dispatch: (el) => fire.pointerDown(el, { clientX: 10 }),
    label: 'fire.pointerDown',
    type: 'pointerdown',
  },
];

describe('fire — dispatches the right Event subclass', () => {
  it.each(dispatchCases)('$label dispatches a $ctor.name for "$type"', ({ check, ctor, dispatch, type }) => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener(type, handler);

    expect(dispatch(target)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as Event;

    expect(event).toBeInstanceOf(ctor);
    expect(event.type).toBe(type);
    check(event);
  });

  it('fire.event dispatches a pre-built Event instance unchanged', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    const event = new Event('ready', { bubbles: true });

    target.addEventListener('ready', handler);

    expect(fire.event(target, event)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(event);
  });
});

describe('fire — return value', () => {
  it("every dispatcher returns dispatchEvent's boolean result, with no exceptions", () => {
    const target = document.createElement('div');

    // A cancelable event whose listener calls preventDefault() — dispatchEvent()
    // returns false in that case. Verify this propagates through fire.custom/fire.event/
    // fire.touch, the three methods that used to return void instead of the real result.
    target.addEventListener('custom-event', (e) => e.preventDefault());
    expect(fire.custom(target, 'custom-event')).toBe(false);

    target.addEventListener('ready', (e) => e.preventDefault());
    expect(fire.event(target, new Event('ready', { cancelable: true }))).toBe(false);

    target.addEventListener('touchstart', (e) => e.preventDefault());
    expect(fire.touch(target, 'touchstart')).toBe(false);
  });
});

describe('fire.custom — shadow boundary behavior', () => {
  it('allows composed: true to be passed explicitly for cross-boundary events', () => {
    const parent = document.createElement('div');
    const shadow = parent.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');

    shadow.appendChild(inner);
    document.body.appendChild(parent);

    const handler = vi.fn();

    parent.addEventListener('cross-boundary', handler);
    fire.custom(inner, 'cross-boundary', { composed: true });

    expect(handler).toHaveBeenCalledTimes(1);

    parent.remove();
  });

  it('does NOT cross shadow boundaries by default (composed: false)', () => {
    const parent = document.createElement('div');
    const shadow = parent.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');

    shadow.appendChild(inner);
    document.body.appendChild(parent);

    const handler = vi.fn();

    parent.addEventListener('contained-event', handler);
    fire.custom(inner, 'contained-event');

    expect(handler).toHaveBeenCalledTimes(0);

    parent.remove();
  });
});

describe('fire — overriding defaults', () => {
  it('allows overriding bubbles/cancelable defaults in options', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('click', handler);

    fire.mouse(target, 'click', { bubbles: false, cancelable: false });

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as MouseEvent;

    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(false);
  });
});

describe('fire.pointerMove / fire.pointerCancel', () => {
  it('dispatch pointermove and pointercancel', () => {
    const target = document.createElement('div');
    const moveHandler = vi.fn();
    const cancelHandler = vi.fn();

    target.addEventListener('pointermove', moveHandler);
    target.addEventListener('pointercancel', cancelHandler);

    fire.pointerMove(target, { clientX: 10 });
    fire.pointerCancel(target);

    expect(moveHandler).toHaveBeenCalledTimes(1);
    expect(cancelHandler).toHaveBeenCalledTimes(1);
    expect((moveHandler.mock.calls[0][0] as PointerEvent).clientX).toBe(10);
  });
});

describe('fire.touch — environment fallback', () => {
  it('falls back to CustomEvent when TouchEvent is unavailable, warning once', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Simulate jsdom-like environments where TouchEvent constructor is missing.
    vi.stubGlobal('TouchEvent', undefined);

    try {
      target.addEventListener('touchstart', handler);

      const dispatched = fire.touch(target, 'touchstart');

      expect(dispatched).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('TouchEvent is unavailable');

      // A second fallback in the same process doesn't warn again — "warn once per process",
      // not "warn every time", to avoid log spam in a suite that dispatches touch events
      // hundreds of times.
      fire.touch(target, 'touchmove');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      warnSpy.mockRestore();
    }
  });
});

describe('createPointerEvent()', () => {
  it('creates a PointerEvent when the constructor is available', () => {
    const event = createPointerEvent('pointerdown');

    expect(event.type).toBe('pointerdown');
  });

  it('falls back to MouseEvent when PointerEvent is unavailable, warning once', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.stubGlobal('PointerEvent', undefined);

    try {
      const event = createPointerEvent('pointerdown');

      expect(event).toBeInstanceOf(MouseEvent);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('PointerEvent is unavailable');

      // Warns once per process, not once per call.
      createPointerEvent('pointerup');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      warnSpy.mockRestore();
    }
  });
});
