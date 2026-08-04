import { vi } from 'vitest';

import type { Handler } from '../types';

export class FakeTarget implements EventTarget {
  private listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    _options?: AddEventListenerOptions | boolean,
  ): void {
    if (!callback) return;

    const listeners = this.listeners.get(type) ?? new Set();

    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  dispatch(event: KeyboardEvent): void {
    this.dispatchEvent(event);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === 'function') listener.call(this, event);
      else listener.handleEvent.call(listener, event);
    }

    return !event.defaultPrevented;
  }

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    _options?: boolean | EventListenerOptions,
  ): void {
    if (!callback) return;

    this.listeners.get(type)?.delete(callback);
  }
}

export function mockHandler(): Handler {
  return vi.fn<Handler>();
}

export function makeEvent(
  key: string,
  mods: { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; type?: string } = {},
): KeyboardEvent {
  return {
    altKey: mods.altKey ?? false,
    ctrlKey: mods.ctrlKey ?? false,
    key,
    metaKey: mods.metaKey ?? false,
    preventDefault: vi.fn(),
    shiftKey: mods.shiftKey ?? false,
    stopPropagation: vi.fn(),
    type: mods.type ?? 'keydown',
  } as unknown as KeyboardEvent;
}
