import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSortable, createSortableScope } from '../sortable.js';
import { makeList } from './helpers.js';

const getKey = (element: HTMLElement): string => element.dataset.sortId ?? '';

function dispatchPointer(
  target: EventTarget,
  type: string,
  { clientX = 0, clientY = 0, isPrimary = true, pointerId = 1, pointerType = 'touch' }: PointerEventInit = {},
): void {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, button: 0, clientX, clientY, isPrimary, pointerId, pointerType }),
  );
}

function mockElementFromPoint(returns: Element | null): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockReturnValue(returns);
  document.elementFromPoint = fn as typeof document.elementFromPoint;
  return fn;
}

afterEach(() => {
  document.body.innerHTML = '';
  // @ts-expect-error -- restoring jsdom's own "not implemented" state between tests.
  delete document.elementFromPoint;
  vi.restoreAllMocks();
});

describe('sortable scope touch input', () => {
  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid activation distance %s',
    (activationDistance) => {
      expect(() => createSortableScope({ touch: { activationDistance } })).toThrow(/activationDistance/);
    },
  );

  it('ignores unrelated and non-touch pointer input', () => {
    const unrelated = document.body.appendChild(document.createElement('div'));
    unrelated.setAttribute('draggable', 'true');
    const onDragStart = vi.fn();
    unrelated.addEventListener('dragstart', onDragStart);
    using _scope = createSortableScope({ touch: true });

    dispatchPointer(unrelated, 'pointerdown');
    dispatchPointer(document, 'pointermove', { clientX: 10 });
    expect(onDragStart).not.toHaveBeenCalled();

    const { element, items } = makeList('a');
    using _sortable = createSortable({ element, getKey, onDragStart, scope: _scope });
    mockElementFromPoint(items[0]!);
    dispatchPointer(items[0]!, 'pointerdown', { pointerType: 'mouse' });
    dispatchPointer(document, 'pointermove', { clientX: 10, pointerType: 'mouse' });
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it('commits one structured move across connected lists', () => {
    const { element: sourceElement, items: sourceItems } = makeList('a1', 'a2');
    const { element: targetElement } = makeList('b1');
    const onMove = vi.fn();
    using scope = createSortableScope({ onMove, touch: true });
    using _source = createSortable({ element: sourceElement, getKey, scope });
    using _target = createSortable({ element: targetElement, getKey, scope });
    const elementFromPoint = mockElementFromPoint(sourceItems[0]!);

    dispatchPointer(sourceItems[0]!, 'pointerdown');
    elementFromPoint.mockReturnValue(targetElement);
    dispatchPointer(document, 'pointermove', { clientX: 10 });
    dispatchPointer(document, 'pointerup', { clientX: 10 });

    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'a1',
        source: sourceElement,
        sourceIds: ['a2'],
        target: targetElement,
        targetIds: ['b1', 'a1'],
      }),
    );
  });

  it('supports registered handles', () => {
    const element = document.createElement('ul');
    const item = document.createElement('li');
    const handle = document.createElement('button');
    item.dataset.sortId = 'a';
    handle.className = 'handle';
    item.append(handle);
    element.append(item);
    document.body.appendChild(element);
    using scope = createSortableScope({ touch: true });
    const onDragStart = vi.fn();
    using _sortable = createSortable({ element, getKey, handle: '.handle', onDragStart, scope });
    mockElementFromPoint(handle);

    dispatchPointer(handle, 'pointerdown');
    dispatchPointer(document, 'pointermove', { clientX: 10 });

    expect(onDragStart).toHaveBeenCalledOnce();
  });

  it('tracks only the initiating primary pointer', () => {
    const { element, items } = makeList('a');
    const onDragStart = vi.fn();
    using scope = createSortableScope({ touch: true });
    using _sortable = createSortable({ element, getKey, onDragStart, scope });
    mockElementFromPoint(items[0]!);

    dispatchPointer(items[0]!, 'pointerdown', { pointerId: 1 });
    dispatchPointer(document, 'pointermove', { clientX: 20, isPrimary: false, pointerId: 2 });
    expect(onDragStart).not.toHaveBeenCalled();

    dispatchPointer(document, 'pointermove', { clientX: 10, pointerId: 1 });
    expect(onDragStart).toHaveBeenCalledOnce();
  });

  it('moves an inert default preview from its activation point', () => {
    const { element, items } = makeList('a');
    items[0]!.textContent = 'Card content';
    using scope = createSortableScope({ touch: true });
    using _sortable = createSortable({ element, getKey, scope });
    mockElementFromPoint(items[0]!);

    dispatchPointer(items[0]!, 'pointerdown');
    dispatchPointer(document, 'pointermove', { clientX: 10 });
    const preview = document.body.querySelector<HTMLElement>('[data-dnd-touch-preview]');
    dispatchPointer(document, 'pointermove', { clientX: 20, clientY: 5 });

    expect(preview).not.toBeNull();
    expect(preview).not.toBe(items[0]);
    expect(preview?.textContent).toBe('');
    expect(preview?.style.borderWidth).toBe('2px');
    expect(preview?.style.transform).toBe('translate3d(10px, 5px, 0)');
  });

  it('allows callers to opt out of the preview', () => {
    const { element, items } = makeList('a');
    using scope = createSortableScope({ touch: { preview: false } });
    using _sortable = createSortable({ element, getKey, scope });
    mockElementFromPoint(items[0]!);

    dispatchPointer(items[0]!, 'pointerdown');
    dispatchPointer(document, 'pointermove', { clientX: 10 });

    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();
  });

  it('clones custom previews without reparenting caller DOM', () => {
    const { element, items } = makeList('a');
    const preview = document.createElement('span');
    preview.className = 'drag-preview';
    preview.textContent = 'Preview';
    items[0]!.append(preview);
    using scope = createSortableScope({ touch: { preview: () => preview } });
    using _sortable = createSortable({ element, getKey, scope });
    mockElementFromPoint(items[0]!);

    dispatchPointer(items[0]!, 'pointerdown');
    dispatchPointer(document, 'pointermove', { clientX: 10 });
    const mountedPreview = document.body.querySelector<HTMLElement>('[data-dnd-touch-preview]');
    dispatchPointer(document, 'pointerup', { clientX: 10 });

    expect(preview.parentElement).toBe(items[0]);
    expect(mountedPreview).not.toBe(preview);
    expect(mountedPreview?.textContent).toBe('Preview');
    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();
  });

  it('clears pending input without starting a drag', () => {
    const { element, items } = makeList('a');
    const onDragStart = vi.fn();
    using scope = createSortableScope({ touch: true });
    using _sortable = createSortable({ element, getKey, onDragStart, scope });
    mockElementFromPoint(items[0]!);

    dispatchPointer(items[0]!, 'pointerdown');
    dispatchPointer(document, 'pointercancel');
    dispatchPointer(document, 'pointermove', { clientX: 10 });

    expect(onDragStart).not.toHaveBeenCalled();
    expect(scope.isDragging).toBe(false);
  });

  it('cancels rather than commits active input', () => {
    const { element, items } = makeList('a', 'b');
    const onDragEnd = vi.fn();
    const onReorder = vi.fn();
    using scope = createSortableScope({ touch: true });
    using _sortable = createSortable({ element, getKey, onDragEnd, onReorder, scope });
    const elementFromPoint = mockElementFromPoint(items[0]!);

    dispatchPointer(items[0]!, 'pointerdown');
    elementFromPoint.mockReturnValue(items[1]!);
    dispatchPointer(document, 'pointermove', { clientX: 10, clientY: 10 });
    dispatchPointer(document, 'pointercancel', { clientX: 10, clientY: 10 });

    expect(scope.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledOnce();
    expect(onReorder).not.toHaveBeenCalled();
    expect(Array.from(element.children).map((child) => (child as HTMLElement).dataset.sortId)).toEqual(['a', 'b']);
    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();
  });

  it('cancels active input when its target sortable is disposed', () => {
    const { element: sourceElement, items } = makeList('a');
    const { element: targetElement } = makeList('b');
    using scope = createSortableScope({ touch: true });
    using _source = createSortable({ element: sourceElement, getKey, scope });
    const target = createSortable({ element: targetElement, getKey, scope });
    const elementFromPoint = mockElementFromPoint(items[0]!);

    dispatchPointer(items[0]!, 'pointerdown');
    elementFromPoint.mockReturnValue(targetElement);
    dispatchPointer(document, 'pointermove', { clientX: 10 });
    target.dispose();

    expect(scope.isDragging).toBe(false);
    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();
  });

  it('cleans pending and active sessions when the scope is disposed', () => {
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
    dispatchPointer(pendingList.items[0]!, 'pointerdown');
    pendingScope.dispose();
    dispatchPointer(document, 'pointermove', { clientX: 10 });
    expect(pendingStart).not.toHaveBeenCalled();
    expect(pendingSortable.disposed).toBe(true);

    const activeList = makeList('active');
    const activeScope = createSortableScope({ touch: true });
    const activeSortable = createSortable({ element: activeList.element, getKey, scope: activeScope });
    mockElementFromPoint(activeList.items[0]!);
    dispatchPointer(activeList.items[0]!, 'pointerdown', { pointerId: 2 });
    dispatchPointer(document, 'pointermove', { clientX: 10, pointerId: 2 });
    expect(document.body.querySelector('[data-dnd-touch-preview]')).not.toBeNull();

    activeScope.dispose();
    expect(activeSortable.disposed).toBe(true);
    expect(document.body.querySelector('[data-dnd-touch-preview]')).toBeNull();
  });
});
