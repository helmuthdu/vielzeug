import { describe, expect, it, vi } from 'vitest';

import { fire } from '../core/runtime';

describe('Runtime: fire', () => {
  it('should dispatch a CustomEvent when detail is provided', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('custom-event', handler);

    fire(target, 'custom-event', { detail: { ok: true } });

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as CustomEvent;

    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.type).toBe('custom-event');
    expect(event.detail).toEqual({ ok: true });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it('should dispatch a MouseEvent for mouse events', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('click', handler);

    fire(target, 'click', { clientX: 100 } as MouseEventInit);

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as MouseEvent;

    expect(event).toBeInstanceOf(MouseEvent);
    expect(event.type).toBe('click');
    expect(event.clientX).toBe(100);
  });

  it('should dispatch a KeyboardEvent for key events', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('keydown', handler);

    fire(target, 'keydown', { key: 'Enter' } as KeyboardEventInit);

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as KeyboardEvent;

    expect(event).toBeInstanceOf(KeyboardEvent);
    expect(event.type).toBe('keydown');
    expect(event.key).toBe('Enter');
  });

  it('should dispatch a FocusEvent for focus/blur events', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('focus', handler);

    fire(target, 'focus');

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as FocusEvent;

    expect(event).toBeInstanceOf(FocusEvent);
    expect(event.type).toBe('focus');
  });

  it('should dispatch a regular Event for input/change', () => {
    const target = document.createElement('input');
    const handler = vi.fn();

    target.addEventListener('input', handler);

    fire(target, 'input');

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as Event;

    expect(event).toBeInstanceOf(Event);
    // In some environments, Event might be the base for CustomEvent
    expect(event.type).toBe('input');
  });

  it('should allow overriding defaults in options', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('click', handler);

    fire(target, 'click', { bubbles: false, cancelable: false });

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as MouseEvent;

    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(false);
  });
});
