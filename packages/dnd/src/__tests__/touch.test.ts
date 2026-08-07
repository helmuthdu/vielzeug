import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSortable, createSortableScope } from '../sortable';
import { makeList } from './helpers';

function makeTouchEvent(type: string, point: { clientX: number; clientY: number } | null): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touches = point ? [point] : [];

  Object.defineProperty(event, 'touches', { configurable: true, value: touches });
  Object.defineProperty(event, 'changedTouches', { configurable: true, value: touches });

  return event;
}

function mockElementFromPoint(returns: Element | null): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockReturnValue(returns);

  document.elementFromPoint = fn as typeof document.elementFromPoint;

  return fn;
}

const getKey = (element: HTMLElement): string => element.dataset.sortId ?? '';

afterEach(() => {
  document.body.innerHTML = '';
  // @ts-expect-error -- restoring jsdom's own "not implemented" state between tests.
  delete document.elementFromPoint;
  vi.restoreAllMocks();
});

describe('sortable scope touch input', () => {
  it('ignores unrelated draggable elements', () => {
    const unrelated = document.createElement('div');

    unrelated.setAttribute('draggable', 'true');
    document.body.appendChild(unrelated);

    const onDragStart = vi.fn();

    unrelated.addEventListener('dragstart', onDragStart);
    using _scope = createSortableScope({ touch: true });
    mockElementFromPoint(unrelated);

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    expect(onDragStart).not.toHaveBeenCalled();
  });

  it('commits one structured move for a touch drag across connected lists', () => {
    const {
      element: sourceElement,
      items: [sourceItem],
    } = makeList('a1', 'a2');
    const { element: targetElement } = makeList('b1');
    const onMove = vi.fn();
    const scope = createSortableScope({ onMove, touch: true });
    const source = createSortable({ element: sourceElement, getKey, scope });
    const target = createSortable({ element: targetElement, getKey, scope });
    const elementFromPoint = mockElementFromPoint(sourceItem!);

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    elementFromPoint.mockReturnValue(targetElement);
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchend', { clientX: 10, clientY: 0 }));

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'a1',
        source: sourceElement,
        sourceIds: ['a2'],
        target: targetElement,
        targetIds: ['b1', 'a1'],
      }),
    );

    source.dispose();
    target.dispose();
    scope.dispose();
  });

  it('supports touch drags from registered handles', () => {
    const element = document.createElement('ul');
    const item = document.createElement('li');
    const handle = document.createElement('button');
    const scope = createSortableScope({ touch: true });

    item.dataset.sortId = 'a';
    handle.className = 'handle';
    item.append(handle);
    element.append(item);
    document.body.appendChild(element);

    const sortable = createSortable({ element, getKey, handle: '.handle', scope });
    const onDragStart = vi.fn();

    item.addEventListener('dragstart', onDragStart);
    mockElementFromPoint(handle);

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    expect(onDragStart).toHaveBeenCalledTimes(1);

    sortable.dispose();
    scope.dispose();
  });

  it('uses an inert outline instead of cloning the source item', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const scope = createSortableScope({ touch: true });
    const sortable = createSortable({ element, getKey, scope });

    item!.textContent = 'Card content';
    mockElementFromPoint(item!);

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    const preview = document.body.querySelector<HTMLElement>('[data-dnd-touch-preview]');

    expect(preview).not.toBeNull();
    expect(preview).not.toBe(item);
    expect(preview?.textContent).toBe('');
    expect(preview?.style.borderWidth).toBe('2px');

    sortable.dispose();
    scope.dispose();
  });

  it('allows callers to opt out of the preview', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const scope = createSortableScope({ touch: { preview: false } });
    const sortable = createSortable({ element, getKey, scope });

    mockElementFromPoint(item!);

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();

    sortable.dispose();
    scope.dispose();
  });

  it('clones a custom preview without reparenting caller-owned DOM', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const preview = document.createElement('span');

    preview.className = 'drag-preview';
    preview.textContent = 'Preview';
    item!.append(preview);

    const scope = createSortableScope({ touch: { preview: () => preview } });
    const sortable = createSortable({ element, getKey, scope });

    mockElementFromPoint(item!);
    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    const mountedPreview = document.body.querySelector<HTMLElement>('[data-dnd-touch-preview]');

    expect(preview.parentElement).toBe(item);
    expect(mountedPreview).not.toBe(preview);
    expect(mountedPreview?.textContent).toBe('Preview');

    document.dispatchEvent(makeTouchEvent('touchend', { clientX: 10, clientY: 0 }));

    expect(preview.parentElement).toBe(item);

    sortable.dispose();
    scope.dispose();
  });

  it('removes touch listeners when the scope is disposed', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const scope = createSortableScope({ touch: true });
    const sortable = createSortable({ element, getKey, scope });
    const onDragStart = vi.fn();

    item!.addEventListener('dragstart', onDragStart);
    mockElementFromPoint(item!);
    scope.dispose();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    expect(onDragStart).not.toHaveBeenCalled();
    expect(sortable.disposed).toBe(true);
  });
});
