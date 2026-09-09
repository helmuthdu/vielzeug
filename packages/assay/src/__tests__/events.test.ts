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

describe('dispatch()', () => {
  it('dispatches a pre-built Event instance unchanged', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    const event = new Event('ready', { bubbles: true });

    target.addEventListener('ready', handler);

    expect(dispatch(target, event)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(event);
  });

  it('returns false when the event is cancelled via preventDefault', () => {
    const target = document.createElement('div');

    target.addEventListener('ready', (e) => e.preventDefault());
    expect(dispatch(target, new Event('ready', { cancelable: true }))).toBe(false);
  });

  it('returns true when no listener cancels the event', () => {
    const target = document.createElement('div');

    expect(dispatch(target, new Event('noop'))).toBe(true);
  });

  it('provides typed convenience dispatchers without changing the confidence boundary', () => {
    const target = document.createElement('button');
    const click = vi.fn();
    const keydown = vi.fn();

    target.addEventListener('click', click);
    target.addEventListener('keydown', keydown);

    fireClick(target);
    fireKeyDown(target, { key: 'Enter' });

    expect(click.mock.calls[0][0]).toMatchObject({ bubbles: true, cancelable: true, isTrusted: false });
    expect(keydown.mock.calls[0][0]).toMatchObject({ isTrusted: false, key: 'Enter' });
  });

  it('is a low-level dispatch API: isTrusted is always false', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('click', handler);
    dispatch(target, new MouseEvent('click', { bubbles: true, cancelable: true }));

    const event = handler.mock.calls[0][0] as MouseEvent;

    // Synthetic dispatch never carries the browser's trust flag — behavioral
    // confidence belongs to Playwright, not this primitive.
    expect(event.isTrusted).toBe(false);
  });
});

describe('event convenience helpers', () => {
  it.each([
    ['fireClick', 'click', MouseEvent, (target: Element) => fireClick(target, { clientX: 100 })],
    ['fireKeyDown', 'keydown', KeyboardEvent, (target: Element) => fireKeyDown(target, { key: 'Enter' })],
    ['fireKeyUp', 'keyup', KeyboardEvent, (target: Element) => fireKeyUp(target, { key: 'Enter' })],
    ['fireBlur', 'blur', FocusEvent, (target: Element) => fireBlur(target)],
    ['fireChange', 'change', Event, (target: Element) => fireChange(target)],
    ['fireFocus', 'focus', FocusEvent, (target: Element) => fireFocus(target)],
    ['fireInput', 'input', InputEvent, (target: Element) => fireInput(target)],
    ['fireSubmit', 'submit', SubmitEvent, (target: Element) => fireSubmit(target)],
  ] as const)('%s dispatches the expected event class', (_label, type, constructor, fire) => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener(type, handler);
    expect(fire(target)).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toBeInstanceOf(constructor);
  });

  it('forwards keyboard, input, and submit initializer data', () => {
    const input = document.createElement('input');
    const form = document.createElement('form');
    const submitter = document.createElement('button');
    const events: Event[] = [];

    form.appendChild(submitter);
    input.addEventListener('keydown', (event) => events.push(event));
    input.addEventListener('input', (event) => events.push(event));
    form.addEventListener('submit', (event) => events.push(event));

    fireKeyDown(input, { key: 'Enter' });
    fireInput(input, { data: 'a', inputType: 'insertText' });
    fireSubmit(form, { submitter });

    expect(events[0]).toMatchObject({ key: 'Enter' });
    expect(events[1]).toMatchObject({ data: 'a', inputType: 'insertText' });
    expect(events[2]).toMatchObject({ submitter });
  });

  it('preserves defaults, overrides, and cancellation results', () => {
    const target = document.createElement('div');
    const clicks: Event[] = [];

    target.addEventListener('click', (event) => clicks.push(event));
    fireClick(target);
    fireClick(target, { bubbles: false, cancelable: false });

    expect(clicks[0]).toMatchObject({ bubbles: true, cancelable: true });
    expect(clicks[1]).toMatchObject({ bubbles: false, cancelable: false });

    target.addEventListener('submit', (event) => event.preventDefault());
    expect(fireSubmit(target)).toBe(false);
  });

  it('dispatches typed custom detail and crosses shadow boundaries only when requested', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('span');
    const handler = vi.fn();

    shadow.appendChild(target);
    host.addEventListener('item-added', handler);

    fireCustom(target, 'item-added', { detail: { id: '1' } });
    expect(handler).not.toHaveBeenCalled();

    fireCustom(target, 'item-added', { composed: true, detail: { id: '2' } });
    expect(handler).toHaveBeenCalledOnce();
    expect((handler.mock.calls[0][0] as CustomEvent<{ id: string }>).detail.id).toBe('2');
  });
});
