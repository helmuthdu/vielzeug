import { vi } from 'vitest';

export function makeDragEvent(
  type: string,
  init: {
    clientX?: number;
    clientY?: number;
    dropEffect?: DataTransfer['dropEffect'];
    effectAllowed?: DataTransfer['effectAllowed'];
    files?: File[];
    items?: Array<{ kind: string; type: string }>;
    setData?: (format: string, data: string) => void;
    setDragImage?: (image: Element, x: number, y: number) => void;
  } = {},
): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;

  Object.defineProperty(event, 'dataTransfer', {
    configurable: true,
    value: {
      dropEffect: init.dropEffect,
      effectAllowed: init.effectAllowed,
      files: init.files,
      items: init.items,
      setData: init.setData ?? vi.fn(),
      setDragImage: init.setDragImage ?? vi.fn(),
    },
  });

  if (typeof init.clientX === 'number') {
    Object.defineProperty(event, 'clientX', { configurable: true, value: init.clientX });
  }

  if (typeof init.clientY === 'number') {
    Object.defineProperty(event, 'clientY', { configurable: true, value: init.clientY });
  }

  return event;
}

export function makeKeyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });
}

export function makeList(...ids: string[]): { element: HTMLElement; items: HTMLElement[] } {
  const element = document.createElement('ul');
  const items: HTMLElement[] = [];

  for (const id of ids) {
    const li = document.createElement('li');

    li.setAttribute('data-sort-id', id);
    items.push(li);
    element.append(li);
  }

  document.body.appendChild(element);

  return { element, items };
}

export function startDrag(el: HTMLElement): void {
  el.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn() }));
}

export function endDrag(el: HTMLElement, dropEffect: DataTransfer['dropEffect'] = 'move'): void {
  el.dispatchEvent(makeDragEvent('dragend', { dropEffect }));
}

export function makeClipboardEvent(files: File[]): Event {
  // Use a plain Event — the handler only accesses e.clipboardData?.files,
  // which we patch in. Avoids ClipboardEvent/DataTransfer availability gaps in jsdom.
  const event = new Event('paste', { bubbles: true, cancelable: true });

  Object.defineProperty(event, 'clipboardData', { configurable: true, value: { files } });

  return event;
}
