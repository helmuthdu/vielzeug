import { describe, expect, it, vi } from 'vitest';

import { applyReorder, createDropZone, createSortable, createSortableScope } from './dragit';

function createDragEvent(
  type: string,
  dataTransfer?: {
    clientX?: number;
    clientY?: number;
    dropEffect?: DataTransfer['dropEffect'];
    effectAllowed?: DataTransfer['effectAllowed'];
    files?: File[];
    items?: Array<{ kind: string; type: string }>;
    setData?: (format: string, data: string) => void;
    setDragImage?: (image: Element, x: number, y: number) => void;
  },
): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;

  if (dataTransfer) {
    Object.defineProperty(event, 'dataTransfer', {
      configurable: true,
      value: {
        dropEffect: dataTransfer.dropEffect,
        effectAllowed: dataTransfer.effectAllowed,
        files: dataTransfer.files,
        items: dataTransfer.items,
        setData: dataTransfer.setData,
        setDragImage: dataTransfer.setDragImage,
      },
    });

    if (typeof dataTransfer.clientX === 'number') {
      Object.defineProperty(event, 'clientX', {
        configurable: true,
        value: dataTransfer.clientX,
      });
    }

    if (typeof dataTransfer.clientY === 'number') {
      Object.defineProperty(event, 'clientY', {
        configurable: true,
        value: dataTransfer.clientY,
      });
    }
  }

  return event;
}

function createKeyboardEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });
}

describe('createDropZone', () => {
  it('exposes flattened files/rejected snapshots', () => {
    const element = document.createElement('div');
    const zone = createDropZone({ element });

    const accepted = new File(['hello'], 'a.txt', { type: 'text/plain' });
    const rejected = new File(['img'], 'a.png', { type: 'image/png' });
    const event = createDragEvent('drop', {
      files: [accepted, rejected],
      items: [
        { kind: 'file', type: accepted.type },
        { kind: 'file', type: rejected.type },
      ],
    });

    zone.destroy();

    const filteredZone = createDropZone({
      accept: ['text/plain'],
      element,
    });

    element.dispatchEvent(event);

    expect(filteredZone.files).toEqual([accepted]);
    expect(filteredZone.rejected).toEqual([rejected]);
  });

  it('supports reactive accept getter at drop time', () => {
    const element = document.createElement('div');
    let accept = ['image/*'];

    const zone = createDropZone({
      accept: () => accept,
      element,
    });

    const image = new File(['img'], 'x.png', { type: 'image/png' });
    const text = new File(['txt'], 'x.txt', { type: 'text/plain' });

    element.dispatchEvent(
      createDragEvent('drop', {
        files: [image, text],
        items: [
          { kind: 'file', type: image.type },
          { kind: 'file', type: text.type },
        ],
      }),
    );
    expect(zone.files).toEqual([image]);
    expect(zone.rejected).toEqual([text]);

    accept = ['text/plain'];
    element.dispatchEvent(
      createDragEvent('drop', {
        files: [image, text],
        items: [
          { kind: 'file', type: image.type },
          { kind: 'file', type: text.type },
        ],
      }),
    );

    expect(zone.files).toEqual([text]);
    expect(zone.rejected).toEqual([image]);
  });

  it('keeps hover false when drag payload is rejected by filter', () => {
    const element = document.createElement('div');
    const zone = createDropZone({
      accept: ['image/*'],
      element,
    });

    element.dispatchEvent(
      createDragEvent('dragenter', {
        dropEffect: 'copy',
        items: [{ kind: 'file', type: 'text/plain' }],
      }),
    );

    expect(zone.hovered).toBe(false);
  });
});

describe('createSortable', () => {
  it('sizes placeholder width for horizontal axis', () => {
    const element = document.createElement('ul');
    const first = document.createElement('li');
    const second = document.createElement('li');

    first.setAttribute('data-sort-id', 'a');
    second.setAttribute('data-sort-id', 'b');
    element.append(first, second);

    Object.defineProperty(first, 'offsetWidth', { configurable: true, value: 120 });
    Object.defineProperty(first, 'offsetHeight', { configurable: true, value: 40 });

    const sortable = createSortable({
      axis: 'horizontal',
      element,
    });

    first.dispatchEvent(
      createDragEvent('dragstart', {
        effectAllowed: 'move',
        setData: vi.fn(),
      }),
    );

    const placeholder = element.querySelector('.dragit-placeholder') as HTMLElement;

    expect(placeholder).toBeTruthy();
    expect(placeholder.style.width).toBe('120px');

    first.dispatchEvent(
      createDragEvent('dragend', {
        dropEffect: 'move',
      }),
    );

    sortable.destroy();
  });

  it('provides drag id on drag end and exposes isDragging', () => {
    const element = document.createElement('ul');
    const first = document.createElement('li');
    const second = document.createElement('li');
    const onDragEnd = vi.fn();

    first.setAttribute('data-sort-id', 'a');
    second.setAttribute('data-sort-id', 'b');
    element.append(first, second);

    const sortable = createSortable({
      element,
      onDragEnd,
    });

    first.dispatchEvent(
      createDragEvent('dragstart', {
        effectAllowed: 'move',
        setData: vi.fn(),
      }),
    );

    expect(sortable.isDragging).toBe(true);

    first.dispatchEvent(
      createDragEvent('dragend', {
        dropEffect: 'move',
      }),
    );

    expect(sortable.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledWith('a', expect.any(Event));

    sortable.destroy();
  });

  it('supports cross-list transfer within a shared scope', () => {
    const left = document.createElement('ul');
    const right = document.createElement('ul');
    const l1 = document.createElement('li');
    const l2 = document.createElement('li');
    const r1 = document.createElement('li');
    const leftReorder = vi.fn();
    const rightReorder = vi.fn();
    const scope = createSortableScope();

    l1.setAttribute('data-sort-id', 'l1');
    l2.setAttribute('data-sort-id', 'l2');
    r1.setAttribute('data-sort-id', 'r1');
    left.append(l1, l2);
    right.append(r1);

    const leftSortable = createSortable({
      element: left,
      onReorder: leftReorder,
      scope,
    });
    const rightSortable = createSortable({
      element: right,
      onReorder: rightReorder,
      scope,
    });

    l1.dispatchEvent(
      createDragEvent('dragstart', {
        effectAllowed: 'move',
        setData: vi.fn(),
      }),
    );

    right.dispatchEvent(
      createDragEvent('dragover', {
        dropEffect: 'move',
      }),
    );

    l1.dispatchEvent(
      createDragEvent('dragend', {
        dropEffect: 'move',
      }),
    );

    expect(leftReorder).toHaveBeenCalledWith(['l2']);
    expect(rightReorder).toHaveBeenCalledWith(['r1', 'l1']);

    leftSortable.destroy();
    rightSortable.destroy();
  });

  it('supports keyboard reordering with arrow keys', () => {
    const element = document.createElement('ul');
    const first = document.createElement('li');
    const second = document.createElement('li');
    const third = document.createElement('li');
    const onReorder = vi.fn();

    first.setAttribute('data-sort-id', 'a');
    second.setAttribute('data-sort-id', 'b');
    third.setAttribute('data-sort-id', 'c');
    element.append(first, second, third);

    const sortable = createSortable({
      element,
      onReorder,
    });

    second.dispatchEvent(createKeyboardEvent('ArrowDown'));

    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);

    sortable.destroy();
  });

  it('uses custom drag image callback when provided', () => {
    const element = document.createElement('ul');
    const first = document.createElement('li');
    const preview = document.createElement('div');
    const setDragImage = vi.fn();

    first.setAttribute('data-sort-id', 'a');
    element.append(first);

    const sortable = createSortable({
      dragImage: () => preview,
      element,
    });

    first.dispatchEvent(
      createDragEvent('dragstart', {
        effectAllowed: 'move',
        setData: vi.fn(),
        setDragImage,
      }),
    );

    expect(setDragImage).toHaveBeenCalledWith(preview, 0, 0);

    first.dispatchEvent(
      createDragEvent('dragend', {
        dropEffect: 'move',
      }),
    );

    sortable.destroy();
  });

  it('requires sync after dynamic list changes', () => {
    const element = document.createElement('ul');
    const first = document.createElement('li');
    const second = document.createElement('li');

    first.setAttribute('data-sort-id', 'a');
    second.setAttribute('data-sort-id', 'b');
    element.append(first);

    const sortable = createSortable({ element });

    element.append(second);

    expect(second.getAttribute('draggable')).toBeNull();

    sortable.sync();

    expect(second.getAttribute('draggable')).toBe('true');

    sortable.destroy();
  });

  it('cancels teardown during an active drag and restores the original order', () => {
    const element = document.createElement('ul');
    const first = document.createElement('li');
    const second = document.createElement('li');
    const third = document.createElement('li');

    first.setAttribute('data-sort-id', 'a');
    second.setAttribute('data-sort-id', 'b');
    third.setAttribute('data-sort-id', 'c');
    element.append(first, second, third);

    Object.defineProperty(third, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100 }),
    });

    const onReorder = vi.fn();
    const sortable = createSortable({
      element,
      onReorder,
    });

    first.dispatchEvent(
      createDragEvent('dragstart', {
        effectAllowed: 'move',
        setData: vi.fn(),
      }),
    );

    third.dispatchEvent(
      createDragEvent('dragover', {
        clientY: 90,
        dropEffect: 'move',
      }),
    );

    sortable.destroy();

    expect(Array.from(element.children).map((child) => (child as HTMLElement).getAttribute('data-sort-id'))).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe('applyReorder', () => {
  it('reorders known ids and appends unknown remainder in original order', () => {
    const items = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 3 },
    ];

    const result = applyReorder(items, ['c', 'x', 'a'], (item) => item.id);

    expect(result.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});
