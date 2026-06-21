import { vi } from 'vitest';

export class FakeTarget {
  private listeners: Map<string, EventListener[]> = new Map();

  addEventListener(type: string, fn: EventListener): void {
    const list = this.listeners.get(type) ?? [];

    list.push(fn);
    this.listeners.set(type, list);
  }

  dispatch(event: KeyboardEvent): void {
    const type = event.type ?? 'keydown';

    for (const fn of this.listeners.get(type) ?? []) fn(event);
  }

  removeEventListener(type: string, fn: EventListener): void {
    const list = this.listeners.get(type) ?? [];

    this.listeners.set(
      type,
      list.filter((l) => l !== fn),
    );
  }
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
