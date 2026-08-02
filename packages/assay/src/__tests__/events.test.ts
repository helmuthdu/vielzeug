import {
  dispatch,
  fireBlur,
  fireChange,
  fireClick,
  fireCustom,
  fireFocus,
  fireInput,
  fireKeyDown,
  fireKeyUp,
  fireSubmit,
} from '../events';

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
    dispatch: (el) => fireClick(el, { clientX: 100 }),
    label: 'fireClick',
    type: 'click',
  },
  {
    check: (e) => expect((e as KeyboardEvent).key).toBe('Enter'),
    ctor: KeyboardEvent,
    dispatch: (el) => fireKeyDown(el, { key: 'Enter' }),
    label: 'fireKeyDown',
    type: 'keydown',
  },
  {
    check: (e) => expect((e as KeyboardEvent).key).toBe('Enter'),
    ctor: KeyboardEvent,
    dispatch: (el) => fireKeyUp(el, { key: 'Enter' }),
    label: 'fireKeyUp',
    type: 'keyup',
  },
];

describe('event dispatchers', () => {
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

  it('dispatches a pre-built Event instance unchanged', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    const event = new Event('ready', { bubbles: true });

    target.addEventListener('ready', handler);

    expect(dispatch(target, event)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(event);
  });
});

describe('event dispatchers return dispatchEvent results', () => {
  it('preserves cancellation for every event kind', () => {
    const target = document.createElement('div');

    target.addEventListener('custom-event', (e) => e.preventDefault());
    expect(fireCustom(target, { type: 'custom-event' })).toBe(false);

    target.addEventListener('ready', (e) => e.preventDefault());
    expect(dispatch(target, new Event('ready', { cancelable: true }))).toBe(false);

    target.addEventListener('submit', (e) => e.preventDefault());
    expect(fireSubmit(target)).toBe(false);
  });
});

describe('fireCustom', () => {
  it('allows composed: true to be passed explicitly for cross-boundary events', () => {
    const parent = document.createElement('div');
    const shadow = parent.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');

    shadow.appendChild(inner);
    document.body.appendChild(parent);

    const handler = vi.fn();

    parent.addEventListener('cross-boundary', handler);
    fireCustom(inner, { composed: true, type: 'cross-boundary' });

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
    fireCustom(inner, { type: 'contained-event' });

    expect(handler).toHaveBeenCalledTimes(0);

    parent.remove();
  });
});

describe('event defaults', () => {
  it('allows overriding bubbles/cancelable defaults in options', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('click', handler);

    fireClick(target, { bubbles: false, cancelable: false });

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as MouseEvent;

    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(false);
  });

  it('uses non-bubbling platform defaults for focus and blur', () => {
    const parent = document.createElement('div');
    const target = document.createElement('input');
    const handler = vi.fn();

    parent.appendChild(target);
    parent.addEventListener('focus', handler);
    parent.addEventListener('blur', handler);

    fireFocus(target);
    fireBlur(target);

    expect(handler).not.toHaveBeenCalled();
  });

  it('constructs input and submit events with their platform-specific payloads', () => {
    const input = document.createElement('input');
    const form = document.createElement('form');
    const submitter = document.createElement('button');
    const events: Event[] = [];

    form.appendChild(submitter);
    input.addEventListener('input', (event) => events.push(event));
    form.addEventListener('submit', (event) => events.push(event));

    fireInput(input, { data: 'a', inputType: 'insertText' });
    fireSubmit(form, { submitter });

    expect(events[0]).toBeInstanceOf(InputEvent);
    expect(events[0]).toMatchObject({ data: 'a', inputType: 'insertText' });
    expect(events[1]).toBeInstanceOf(SubmitEvent);
    expect(events[1]).toMatchObject({ submitter });
  });

  it('uses the event constructor named by each helper', () => {
    const target = document.createElement('div');
    const events: Event[] = [];

    for (const type of ['blur', 'change', 'focus', 'input', 'submit']) {
      target.addEventListener(type, (event) => events.push(event));
    }

    fireBlur(target);
    fireChange(target);
    fireFocus(target);
    fireInput(target);
    fireSubmit(target);

    expect(events).toEqual([
      expect.any(FocusEvent),
      expect.any(Event),
      expect.any(FocusEvent),
      expect.any(InputEvent),
      expect.any(SubmitEvent),
    ]);
  });
});
