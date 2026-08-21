import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSortable, createSortableScope } from '../sortable';
import { makeList } from './helpers';

type TestTouch = {
  clientX: number;
  clientY: number;
  identifier: number;
};

const point = (clientX: number, clientY: number, identifier = 1): TestTouch => ({
  clientX,
  clientY,
  identifier,
});

function makeTouchEvent(type: string, touches: TestTouch[], changedTouches = touches): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });

  Object.defineProperty(event, 'touches', { configurable: true, value: touches });
  Object.defineProperty(event, 'changedTouches', { configurable: true, value: changedTouches });

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

    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0)]));

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

    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0)]));
    elementFromPoint.mockReturnValue(targetElement);
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0)]));
    document.dispatchEvent(makeTouchEvent('touchend', [], [point(10, 0)]));

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

    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0)]));

    expect(onDragStart).toHaveBeenCalledTimes(1);

    sortable.dispose();
    scope.dispose();
  });

  it('tracks the initiating touch when touch-list order changes', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const onDragStart = vi.fn();
    const scope = createSortableScope({ touch: true });
    const sortable = createSortable({ element, getKey, onDragStart, scope });

    const elementFromPoint = mockElementFromPoint(item!);
    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0, 1)]));
    document.dispatchEvent(makeTouchEvent('touchstart', [point(100, 0, 2), point(0, 0, 1)], [point(100, 0, 2)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(100, 0, 2), point(10, 0, 1)]));

    const dragStartEvent = onDragStart.mock.calls[0]?.[1] as DragEvent | undefined;

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(dragStartEvent?.clientX).toBe(10);

    const preview = document.body.querySelector<HTMLElement>('[data-dnd-touch-preview]');

    elementFromPoint.mockClear();
    document.dispatchEvent(makeTouchEvent('touchmove', [point(200, 0, 2), point(10, 0, 1)], [point(200, 0, 2)]));

    expect(preview?.style.transform).toBe('translate3d(0px, 0px, 0)');
    expect(elementFromPoint).not.toHaveBeenCalled();

    document.dispatchEvent(makeTouchEvent('touchmove', [point(200, 0, 2), point(20, 0, 1)], [point(20, 0, 1)]));

    expect(preview?.style.transform).toBe('translate3d(10px, 0px, 0)');

    sortable.dispose();
    scope.dispose();
  });

  it('ignores a secondary touch ending during an active drag', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const onDragEnd = vi.fn();
    const scope = createSortableScope({ touch: true });
    const sortable = createSortable({ element, getKey, onDragEnd, scope });

    mockElementFromPoint(item!);
    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0, 1)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0, 1)]));
    document.dispatchEvent(makeTouchEvent('touchend', [point(10, 0, 1)], [point(20, 0, 2)]));

    expect(scope.isDragging).toBe(true);
    expect(onDragEnd).not.toHaveBeenCalled();

    document.dispatchEvent(makeTouchEvent('touchend', [], [point(10, 0, 1)]));

    expect(scope.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledTimes(1);

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

    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0)]));

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

    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0)]));

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
    item?.append(preview);

    const scope = createSortableScope({ touch: { preview: () => preview } });
    const sortable = createSortable({ element, getKey, scope });

    mockElementFromPoint(item!);
    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0)]));

    const mountedPreview = document.body.querySelector<HTMLElement>('[data-dnd-touch-preview]');

    expect(preview.parentElement).toBe(item);
    expect(mountedPreview).not.toBe(preview);
    expect(mountedPreview?.textContent).toBe('Preview');

    document.dispatchEvent(makeTouchEvent('touchend', [], [point(10, 0)]));

    expect(preview.parentElement).toBe(item);

    sortable.dispose();
    scope.dispose();
  });

  it('clears a pending drag when the initiating touch is cancelled', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const onDragStart = vi.fn();
    const scope = createSortableScope({ touch: true });
    const sortable = createSortable({ element, getKey, onDragStart, scope });

    mockElementFromPoint(item!);
    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0, 1)]));
    document.dispatchEvent(makeTouchEvent('touchcancel', [], [point(0, 0, 1)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0, 1)]));

    expect(onDragStart).not.toHaveBeenCalled();
    expect(scope.isDragging).toBe(false);

    sortable.dispose();
    scope.dispose();
  });

  it('cancels rather than commits an active drag on touchcancel', () => {
    const {
      element,
      items: [first, second],
    } = makeList('a', 'b');
    const onDragEnd = vi.fn();
    const onReorder = vi.fn();
    const scope = createSortableScope({ touch: true });
    const sortable = createSortable({ element, getKey, onDragEnd, onReorder, scope });
    const elementFromPoint = mockElementFromPoint(first!);

    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0, 1)]));
    elementFromPoint.mockReturnValue(second!);
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 10, 1)]));
    document.dispatchEvent(makeTouchEvent('touchcancel', [], [point(10, 10, 1)]));

    expect(scope.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onReorder).not.toHaveBeenCalled();
    expect(Array.from(element.children).map((child) => (child as HTMLElement).dataset.sortId)).toEqual(['a', 'b']);
    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();

    sortable.dispose();
    scope.dispose();
  });

  it('cancels when touchcancel omits changedTouches', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const onDragEnd = vi.fn();
    const scope = createSortableScope({ touch: true });
    const sortable = createSortable({ element, getKey, onDragEnd, scope });

    mockElementFromPoint(item!);
    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0, 1)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0, 1)]));
    document.dispatchEvent(makeTouchEvent('touchcancel', [], []));

    expect(scope.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();

    sortable.dispose();
    scope.dispose();
  });

  it('cleans pending and active touch sessions when the scope is disposed', () => {
    const pendingList = makeList('pending');
    const pendingStart = vi.fn();
    const pendingScope = createSortableScope({ touch: true });
    const pendingSortable = createSortable({
      element: pendingList.element,
      getKey,
      onDragStart: pendingStart,
      scope: pendingScope,
    });

    mockElementFromPoint(pendingList.items[0]!);
    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0, 1)]));
    pendingScope.dispose();
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0, 1)]));

    expect(pendingStart).not.toHaveBeenCalled();
    expect(pendingSortable.disposed).toBe(true);

    const activeList = makeList('active');
    const activeScope = createSortableScope({ touch: true });
    const activeSortable = createSortable({ element: activeList.element, getKey, scope: activeScope });

    mockElementFromPoint(activeList.items[0]!);
    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0, 2)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0, 2)]));

    expect(document.body.querySelector('[data-dnd-touch-preview]')).not.toBeNull();

    activeScope.dispose();

    expect(activeSortable.disposed).toBe(true);
    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();
  });

  it('removes touch listeners when the scope is disposed', () => {
    const {
      element,
      items: [item],
    } = makeList('a');
    const scope = createSortableScope({ touch: true });
    const sortable = createSortable({ element, getKey, scope });
    const onDragStart = vi.fn();

    item?.addEventListener('dragstart', onDragStart);
    mockElementFromPoint(item!);
    scope.dispose();

    document.dispatchEvent(makeTouchEvent('touchstart', [point(0, 0)]));
    document.dispatchEvent(makeTouchEvent('touchmove', [point(10, 0)]));

    expect(onDragStart).not.toHaveBeenCalled();
    expect(sortable.disposed).toBe(true);
  });
});
