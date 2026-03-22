import { describe, expect, it, vi } from 'vitest';

import { aria, fire } from '../core/runtime';
import { signal } from '../index';

describe('Runtime: fire', () => {
  it('should dispatch a CustomEvent when detail is provided', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    target.addEventListener('custom-event', handler);

    fire.custom(target, 'custom-event', { detail: { ok: true } });

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

    fire.mouse(target, 'click', { clientX: 100 });

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

    fire.keyboard(target, 'keydown', { key: 'Enter' });

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

    fire.focus(target, 'focus');

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as FocusEvent;

    expect(event).toBeInstanceOf(FocusEvent);
    expect(event.type).toBe('focus');
  });

  it('should dispatch a regular Event for basic DOM events', () => {
    const target = document.createElement('input');
    const handler = vi.fn();

    target.addEventListener('input', handler);

    fire.basic(target, 'input');

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

    fire.mouse(target, 'click', { bubbles: false, cancelable: false });

    expect(handler).toHaveBeenCalledTimes(1);

    const event = handler.mock.calls[0][0] as MouseEvent;

    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(false);
  });

  it('should fall back to CustomEvent for touch events when TouchEvent is unavailable', () => {
    const target = document.createElement('div');
    const handler = vi.fn();

    // Simulate jsdom-like environments where TouchEvent constructor is missing.
    vi.stubGlobal('TouchEvent', undefined);

    try {
      target.addEventListener('touchstart', handler);

      fire.touch(target, 'touchstart');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('should dispatch a prebuilt event instance', () => {
    const target = document.createElement('div');
    const handler = vi.fn();
    const event = new Event('ready', { bubbles: true });

    target.addEventListener('ready', handler);

    fire.event(target, event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(event);
  });
});

describe('Runtime: aria', () => {
  it('should remove aria-* attribute when value is false', () => {
    const target = document.createElement('button');

    target.setAttribute('aria-expanded', 'true');

    const cleanup = aria(target, { expanded: false });

    expect(target.hasAttribute('aria-expanded')).toBe(false);

    cleanup();
  });

  it('should reactively remove and restore aria-* attribute', () => {
    const target = document.createElement('button');
    const expanded = signal(true);
    const cleanup = aria(target, { expanded: () => expanded.value });

    expect(target.getAttribute('aria-expanded')).toBe('true');

    expanded.value = false;
    expect(target.hasAttribute('aria-expanded')).toBe(false);

    expanded.value = true;
    expect(target.getAttribute('aria-expanded')).toBe('true');

    cleanup();
  });
});
