import { describe, expect, it, vi } from 'vitest';

import { applyReorder, createSortable, createSortableScope } from '../sortable';
import { endDrag, makeDragEvent, makeKeyEvent, makeList, startDrag } from './helpers';

// Default getKey for tests — items are built with data-sort-id by makeList
const getKey = (el: HTMLElement): string => el.getAttribute('data-sort-id') ?? '';

// makeList attaches elements to document.body; clean up after every test.
afterEach(() => {
  document.body.innerHTML = '';
});

describe('createSortableScope', () => {
  it('returns an object with the brand symbol', () => {
    const scope = createSortableScope();

    expect(scope).toBeDefined();
    expect(typeof scope).toBe('object');
  });

  it('two different scopes do not share state', () => {
    const scopeA = createSortableScope();
    const scopeB = createSortableScope();
    const {
      element: listA,
      items: [a1],
    } = makeList('a1', 'a2');
    const { element: listB } = makeList('b1', 'b2');
    const reorderB = vi.fn();

    const sortableA = createSortable({ element: listA, getKey, scope: scopeA });
    const sortableB = createSortable({ element: listB, getKey, onReorder: reorderB, scope: scopeB });

    // Drag in list A
    startDrag(a1);
    // Drag over list B — should not trigger because different scope
    listB.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
    endDrag(a1);

    expect(reorderB).not.toHaveBeenCalled();

    sortableA.dispose();
    sortableB.dispose();
  });

  it('scope.isDragging is true while any member sortable is dragging', () => {
    const scope = createSortableScope();
    const {
      element,
      items: [first],
    } = makeList('a', 'b');
    const sortable = createSortable({ element, getKey, scope });

    expect(scope.isDragging).toBe(false);

    startDrag(first);

    expect(scope.isDragging).toBe(true);

    endDrag(first);

    expect(scope.isDragging).toBe(false);

    sortable.dispose();
  });

  it('scope.dispose() tears down all member sortables', () => {
    const scope = createSortableScope();
    const {
      element: left,
      items: [l1],
    } = makeList('l1', 'l2');
    const { element: right } = makeList('r1');
    const onDragStart = vi.fn();

    createSortable({ element: left, getKey, onDragStart, scope });
    createSortable({ element: right, getKey, scope });

    scope.dispose();

    // After scope.dispose(), drag no longer fires
    startDrag(l1);

    expect(onDragStart).not.toHaveBeenCalled();
  });

  it('scope.disposed is false before dispose() and true after', () => {
    const scope = createSortableScope();

    expect(scope.disposed).toBe(false);

    scope.dispose();

    expect(scope.disposed).toBe(true);
  });

  it('scope.disposalSignal is aborted after scope.dispose()', () => {
    const scope = createSortableScope();

    expect(scope.disposalSignal.aborted).toBe(false);

    scope.dispose();

    expect(scope.disposalSignal.aborted).toBe(true);
  });
});

// ─── createSortable ───────────────────────────────────────────────────────────

describe('createSortable', () => {
  describe('empty container', () => {
    it('does not throw when container has no items', () => {
      const element = document.createElement('ul');

      document.body.appendChild(element);

      const sortable = createSortable({ element, getKey });

      expect(sortable.isDragging).toBe(false);

      sortable.dispose();
    });
  });

  describe('dragImageOffset default', () => {
    it('calls setDragImage with [0, 0] when dragImageOffset is omitted', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const setDragImage = vi.fn();
      const img = document.createElement('div');
      const sortable = createSortable({ dragImage: () => img, element, getKey });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).toHaveBeenCalledWith(img, 0, 0);

      endDrag(first);
      sortable.dispose();
    });
  });

  describe('DOM setup', () => {
    it('sets role=list on container and role=listitem + tabindex on items', () => {
      const { element } = makeList('a', 'b');
      const sortable = createSortable({ element, getKey });

      expect(element.getAttribute('role')).toBe('list');

      for (const child of element.children) {
        expect((child as HTMLElement).getAttribute('role')).toBe('listitem');
        expect((child as HTMLElement).tabIndex).toBe(0);
      }

      sortable.dispose();
    });

    it('sets draggable on items when no handle option', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element, getKey });

      expect(first.getAttribute('draggable')).toBe('true');

      sortable.dispose();
    });

    it('sets draggable on handle elements when handle option is set', () => {
      const element = document.createElement('ul');
      const li = document.createElement('li');
      const handle = document.createElement('span');

      handle.className = 'handle';
      li.setAttribute('data-sort-id', 'a');
      li.append(handle);
      element.append(li);
      document.body.appendChild(element);

      const sortable = createSortable({ element, getKey, handle: '.handle' });

      expect(li.getAttribute('draggable')).toBeNull();
      expect(handle.getAttribute('draggable')).toBe('true');

      sortable.dispose();
    });

    it('removes all dnd attributes on dispose', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element, getKey });

      sortable.dispose();

      expect(element.getAttribute('role')).toBeNull();
      expect(first.getAttribute('draggable')).toBeNull();
      expect(first.getAttribute('role')).toBeNull();
      expect(first.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('autoScroll', () => {
    it('does not throw when autoScroll is false', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({ autoScroll: false, element, getKey, onReorder });

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'a'] }));

      sortable.dispose();
    });

    it('does not throw when autoScroll is true (explicit)', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({ autoScroll: true, element, getKey, onReorder });

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'a'] }));

      sortable.dispose();
    });

    it('accepts autoScroll as an options object', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({
        autoScroll: { edgeThreshold: 40, speed: 20, viewport: false },
        element,
        getKey,
        onReorder,
      });

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'a'] }));

      sortable.dispose();
    });
  });

  describe('sync', () => {
    it('applies dnd attributes to newly added items after sync', () => {
      const { element } = makeList('a');
      const sortable = createSortable({ element, getKey });
      const li = document.createElement('li');

      li.setAttribute('data-sort-id', 'b');
      element.append(li);

      expect(li.getAttribute('draggable')).toBeNull();

      sortable.sync();

      expect(li.getAttribute('draggable')).toBe('true');

      sortable.dispose();
    });

    it('re-applies handle attrs on existing items after sync', () => {
      const element = document.createElement('ul');
      const li1 = document.createElement('li');
      const handle1 = document.createElement('span');
      const handle2 = document.createElement('span');

      handle1.className = 'h';
      handle2.className = 'h';
      li1.setAttribute('data-sort-id', 'a');
      li1.append(handle1);
      element.append(li1);
      document.body.appendChild(element);

      const sortable = createSortable({ element, getKey, handle: '.h' });

      expect(handle1.getAttribute('draggable')).toBe('true');
      expect(handle1.getAttribute('data-dnd-handle')).toBe('');

      // Replace the handle element inside the item
      handle1.remove();
      li1.append(handle2);
      sortable.sync();

      // New handle gets attrs after sync
      expect(handle2.getAttribute('draggable')).toBe('true');
      expect(handle2.getAttribute('data-dnd-handle')).toBe('');

      sortable.dispose();
    });
  });

  describe('drag and drop', () => {
    it('exposes isDragging during and after drag', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element, getKey });

      expect(sortable.isDragging).toBe(false);

      startDrag(first);

      expect(sortable.isDragging).toBe(true);

      endDrag(first);

      expect(sortable.isDragging).toBe(false);

      sortable.dispose();
    });

    it('fires onDragStart and onDragEnd with the dragged id', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();
      const sortable = createSortable({ element, getKey, onDragEnd, onDragStart });

      startDrag(first);

      expect(onDragStart).toHaveBeenCalledWith('a', expect.any(Event));

      endDrag(first);

      expect(onDragEnd).toHaveBeenCalledWith('a', expect.any(Event));

      sortable.dispose();
    });

    it('fires onReorder with ReorderEvent when drag changes the order', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, getKey, onReorder });

      startDrag(first);

      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'a'] }));

      sortable.dispose();
    });

    it('ReorderEvent has ids and setRevert function', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      let capturedEvent: { ids: string[]; setRevert: unknown } | undefined;
      const onReorder = vi.fn((e) => {
        capturedEvent = e;
      });

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, getKey, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(capturedEvent?.ids).toEqual(['b', 'a']);
      expect(typeof capturedEvent?.setRevert).toBe('function');

      sortable.dispose();
    });

    it('does not fire onReorder when order does not change', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onReorder });

      startDrag(first);
      endDrag(first);

      expect(onReorder).not.toHaveBeenCalled();

      sortable.dispose();
    });

    it('creates a placeholder sized by height for vertical axis', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');

      Object.defineProperty(first, 'offsetHeight', { configurable: true, value: 40 });

      const sortable = createSortable({ element, getKey });

      startDrag(first);

      const placeholder = element.querySelector('.dnd-placeholder') as HTMLElement;

      expect(placeholder).toBeTruthy();
      expect(placeholder.style.height).toBe('40px');

      endDrag(first);
      sortable.dispose();
    });

    it('creates a placeholder sized by width for horizontal axis', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');

      Object.defineProperty(first, 'offsetWidth', { configurable: true, value: 120 });

      const sortable = createSortable({ axis: 'horizontal', element, getKey });

      startDrag(first);

      const placeholder = element.querySelector('.dnd-placeholder') as HTMLElement;

      expect(placeholder).toBeTruthy();
      expect(placeholder.style.width).toBe('120px');

      endDrag(first);
      sortable.dispose();
    });

    it('uses custom placeholderClass', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element, getKey, placeholderClass: 'my-placeholder' });

      startDrag(first);

      expect(element.querySelector('.my-placeholder')).toBeTruthy();

      endDrag(first);
      sortable.dispose();
    });

    it('uses custom drag image callback', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const preview = document.createElement('div');
      const setDragImage = vi.fn();
      const sortable = createSortable({
        dragImage: () => preview,
        element,
        getKey,
      });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).toHaveBeenCalledWith(preview, 0, 0);

      endDrag(first);
      sortable.dispose();
    });

    it('uses static dragImage element when not a function', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const preview = document.createElement('div');
      const setDragImage = vi.fn();
      const sortable = createSortable({ dragImage: preview, element, getKey });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).toHaveBeenCalledWith(preview, 0, 0);

      endDrag(first);
      sortable.dispose();
    });

    it('applies dragImageOffset to setDragImage', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const preview = document.createElement('div');
      const setDragImage = vi.fn();
      const sortable = createSortable({ dragImage: preview, dragImageOffset: [12, 34], element, getKey });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).toHaveBeenCalledWith(preview, 12, 34);

      endDrag(first);
      sortable.dispose();
    });

    it('skips setDragImage when dragImage callback returns null', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const setDragImage = vi.fn();
      const sortable = createSortable({ dragImage: () => null, dragImageOffset: [10, 20], element, getKey });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).not.toHaveBeenCalled();

      endDrag(first);
      sortable.dispose();
    });

    it('skips setDragImage when dragImage callback returns undefined', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const setDragImage = vi.fn();
      const sortable = createSortable({ dragImage: () => undefined, element, getKey });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).not.toHaveBeenCalled();

      endDrag(first);
      sortable.dispose();
    });

    it('cancels drag and restores original order when disposed during active drag', () => {
      const {
        element,
        items: [first, , third],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onReorder });

      Object.defineProperty(third, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100 }),
      });

      startDrag(first);
      third.dispatchEvent(makeDragEvent('dragover', { clientY: 90, dropEffect: 'move' }));
      sortable.dispose();

      const ids = Array.from(element.children).map((c) => (c as HTMLElement).getAttribute('data-sort-id'));

      expect(ids).toEqual(['a', 'b', 'c']);
      expect(onReorder).not.toHaveBeenCalled();
    });

    it('handles dragover with no matching item target (appends placeholder)', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element, getKey });

      startDrag(first);
      // Dispatch dragover directly on the container (no item target)
      element.dispatchEvent(makeDragEvent('dragover', { clientY: 0, dropEffect: 'move' }));
      endDrag(first);
      sortable.dispose();
    });
  });

  describe('handle option', () => {
    it('ignores dragstart when target is the item but not the handle', () => {
      const element = document.createElement('ul');
      const li = document.createElement('li');
      const handleEl = document.createElement('span');

      handleEl.className = 'grip';
      li.setAttribute('data-sort-id', 'a');
      li.append(handleEl);
      element.append(li);
      document.body.appendChild(element);

      const onDragStart = vi.fn();
      const sortable = createSortable({ element, getKey, handle: '.grip', onDragStart });

      // Drag from the li directly (not the handle)
      li.dispatchEvent(makeDragEvent('dragstart', { setData: vi.fn() }));

      expect(onDragStart).not.toHaveBeenCalled();

      sortable.dispose();
    });
  });

  describe('disabled', () => {
    it('ignores dragstart when disabled: true', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onDragStart = vi.fn();
      const sortable = createSortable({ disabled: true, element, getKey, onDragStart });

      startDrag(first);

      expect(sortable.isDragging).toBe(false);
      expect(onDragStart).not.toHaveBeenCalled();

      sortable.dispose();
    });

    it('ignores keyboard when disabled', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({ disabled: true, element, getKey, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowDown'));

      expect(onReorder).not.toHaveBeenCalled();

      sortable.dispose();
    });
  });

  describe('keyboard reordering', () => {
    it('moves item forward with ArrowDown', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowDown'));

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['a', 'c', 'b'] }));

      sortable.dispose();
    });

    it('moves item backward with ArrowUp', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowUp'));

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'a', 'c'] }));

      sortable.dispose();
    });

    it('moves item to start with Home', () => {
      const {
        element,
        items: [, , third],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onReorder });

      third.dispatchEvent(makeKeyEvent('Home'));

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['c', 'a', 'b'] }));

      sortable.dispose();
    });

    it('moves item to end with End', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onReorder });

      first.dispatchEvent(makeKeyEvent('End'));

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'c', 'a'] }));

      sortable.dispose();
    });

    it('moves forward with ArrowRight for horizontal axis', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ axis: 'horizontal', element, getKey, onReorder });

      first.dispatchEvent(makeKeyEvent('ArrowRight'));

      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'a', 'c'] }));

      sortable.dispose();
    });

    it('does not fire onReorder when item is already at boundary', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onReorder });

      first.dispatchEvent(makeKeyEvent('ArrowUp'));

      expect(onReorder).not.toHaveBeenCalled();

      sortable.dispose();
    });

    it('ignores key events when keyboard: false', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, keyboard: false, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowUp'));

      expect(onReorder).not.toHaveBeenCalled();

      sortable.dispose();
    });

    it('ignores key events on form inputs', () => {
      const element = document.createElement('ul');
      const li = document.createElement('li');
      const input = document.createElement('input');

      li.setAttribute('data-sort-id', 'a');
      li.append(input);
      element.append(li);
      document.body.appendChild(element);

      const onReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onReorder });

      input.dispatchEvent(makeKeyEvent('ArrowDown'));

      expect(onReorder).not.toHaveBeenCalled();

      sortable.dispose();
    });
  });

  describe('revert', () => {
    it('calls the revert function registered via setRevert after a drag', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onRevert = vi.fn();
      const onReorder = vi.fn(({ setRevert }: { setRevert: (fn: () => void) => void }) => {
        setRevert(onRevert);
      });

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, getKey, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      sortable.revert();

      expect(onRevert).toHaveBeenCalledTimes(1);

      sortable.dispose();
    });

    it('calls the revert function registered via setRevert after a keyboard move', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b', 'c');
      const onRevert = vi.fn();
      const onReorder = vi.fn(({ setRevert }: { setRevert: (fn: () => void) => void }) => {
        setRevert(onRevert);
      });
      const sortable = createSortable({ element, getKey, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowDown'));
      sortable.revert();

      expect(onRevert).toHaveBeenCalledTimes(1);

      sortable.dispose();
    });

    it('is a no-op when setRevert was never called', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, getKey, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(() => sortable.revert()).not.toThrow();

      sortable.dispose();
    });

    it('clears the revert function after first call', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onRevert = vi.fn();
      const onReorder = vi.fn(({ setRevert }: { setRevert: (fn: () => void) => void }) => {
        setRevert(onRevert);
      });

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, getKey, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      sortable.revert();
      sortable.revert(); // second call is a no-op

      expect(onRevert).toHaveBeenCalledTimes(1);

      sortable.dispose();
    });
  });

  describe('onBeforeReorder', () => {
    it('fires with from/to arrays before onReorder is called', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const callOrder: string[] = [];
      const onBeforeReorder = vi.fn(() => callOrder.push('before'));
      const onReorder = vi.fn(() => callOrder.push('reorder'));

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, getKey, onBeforeReorder, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(onBeforeReorder).toHaveBeenCalledWith(['a', 'b'], ['b', 'a']);
      expect(callOrder).toEqual(['before', 'reorder']);

      sortable.dispose();
    });

    it('is not called when the drag is cancelled', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onBeforeReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onBeforeReorder });

      startDrag(first);
      endDrag(first, 'none');

      expect(onBeforeReorder).not.toHaveBeenCalled();

      sortable.dispose();
    });

    it('is not called when order does not change', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onBeforeReorder = vi.fn();
      const sortable = createSortable({ element, getKey, onBeforeReorder });

      startDrag(first);
      endDrag(first);

      expect(onBeforeReorder).not.toHaveBeenCalled();

      sortable.dispose();
    });

    it('fires with from/to arrays before onReorder for keyboard moves', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b', 'c');
      const callOrder: string[] = [];
      const onBeforeReorder = vi.fn(() => callOrder.push('before'));
      const onReorder = vi.fn(() => callOrder.push('reorder'));
      const sortable = createSortable({ element, getKey, onBeforeReorder, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowDown'));

      expect(onBeforeReorder).toHaveBeenCalledWith(['a', 'b', 'c'], ['a', 'c', 'b']);
      expect(callOrder).toEqual(['before', 'reorder']);

      sortable.dispose();
    });

    it('fires onBeforeReorder for keyboard moves on horizontal axis', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b', 'c');
      const onBeforeReorder = vi.fn();
      const onReorder = vi.fn();
      const sortable = createSortable({ axis: 'horizontal', element, getKey, onBeforeReorder, onReorder });

      first.dispatchEvent(makeKeyEvent('ArrowRight'));

      expect(onBeforeReorder).toHaveBeenCalledWith(['a', 'b', 'c'], ['b', 'a', 'c']);
      expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'a', 'c'] }));

      sortable.dispose();
    });
  });

  describe('connected lists (scope)', () => {
    it('transfers item between lists sharing a scope', () => {
      const scope = createSortableScope();
      const {
        element: left,
        items: [l1],
      } = makeList('l1', 'l2');
      const { element: right } = makeList('r1');
      const leftReorder = vi.fn();
      const rightReorder = vi.fn();

      const leftSortable = createSortable({ element: left, getKey, onReorder: leftReorder, scope });
      const rightSortable = createSortable({ element: right, getKey, onReorder: rightReorder, scope });

      startDrag(l1);
      right.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
      endDrag(l1);

      expect(leftReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['l2'] }));
      expect(rightReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['r1', 'l1'] }));

      leftSortable.dispose();
      rightSortable.dispose();
    });

    it('does not transfer items between lists without a shared scope', () => {
      const {
        element: left,
        items: [l1],
      } = makeList('l1', 'l2');
      const { element: right } = makeList('r1');
      const rightReorder = vi.fn();

      // No shared scope — each gets its own private scope
      const leftSortable = createSortable({ element: left, getKey });
      const rightSortable = createSortable({ element: right, getKey, onReorder: rightReorder });

      startDrag(l1);
      right.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
      endDrag(l1);

      expect(rightReorder).not.toHaveBeenCalled();

      leftSortable.dispose();
      rightSortable.dispose();
    });

    it('fires onBeforeReorder before onReorder for cross-list drag', () => {
      const scope = createSortableScope();
      const {
        element: left,
        items: [l1],
      } = makeList('l1', 'l2');
      const { element: right } = makeList('r1');
      const callOrder: string[] = [];
      const leftBeforeReorder = vi.fn(() => callOrder.push('left-before'));
      const leftReorder = vi.fn(() => callOrder.push('left-reorder'));
      const rightBeforeReorder = vi.fn(() => callOrder.push('right-before'));
      const rightReorder = vi.fn(() => callOrder.push('right-reorder'));

      const leftSortable = createSortable({
        element: left,
        getKey,
        onBeforeReorder: leftBeforeReorder,
        onReorder: leftReorder,
        scope,
      });
      const rightSortable = createSortable({
        element: right,
        getKey,
        onBeforeReorder: rightBeforeReorder,
        onReorder: rightReorder,
        scope,
      });

      startDrag(l1);
      right.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
      endDrag(l1);

      expect(leftBeforeReorder).toHaveBeenCalled();
      expect(rightBeforeReorder).toHaveBeenCalled();

      // before always precedes reorder for each container
      const leftBeforeIdx = callOrder.indexOf('left-before');
      const leftReorderIdx = callOrder.indexOf('left-reorder');
      const rightBeforeIdx = callOrder.indexOf('right-before');
      const rightReorderIdx = callOrder.indexOf('right-reorder');

      expect(leftBeforeIdx).toBeLessThan(leftReorderIdx);
      expect(rightBeforeIdx).toBeLessThan(rightReorderIdx);

      leftSortable.dispose();
      rightSortable.dispose();
    });

    it('lazy order snapshots: only participating containers are recorded', () => {
      const scope = createSortableScope();
      const {
        element: listA,
        items: [a1],
      } = makeList('a1', 'a2');
      const { element: listB } = makeList('b1');
      const { element: listC } = makeList('c1');
      const reorderA = vi.fn();
      const reorderC = vi.fn();

      // Three lists in same scope; drag only involves A and B
      const sortableA = createSortable({ element: listA, getKey, onReorder: reorderA, scope });
      const sortableB = createSortable({ element: listB, getKey, scope });
      const sortableC = createSortable({ element: listC, getKey, onReorder: reorderC, scope });

      startDrag(a1);
      listB.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
      endDrag(a1);

      // C was never visited so its reorder should not fire
      expect(reorderA).toHaveBeenCalledWith(expect.objectContaining({ ids: ['a2'] }));
      expect(reorderC).not.toHaveBeenCalled();

      sortableA.dispose();
      sortableB.dispose();
      sortableC.dispose();
    });
  });

  describe('custom getKey', () => {
    it('uses getKey to determine item identity', () => {
      const element = document.createElement('ul');
      const li = document.createElement('li');

      li.setAttribute('data-id', 'x');
      element.append(li);
      document.body.appendChild(element);

      const onDragStart = vi.fn();
      const customGetKey = (el: HTMLElement): string => el.getAttribute('data-id') ?? '';
      const sortable = createSortable({ element, getKey: customGetKey, onDragStart });

      expect(li.getAttribute('draggable')).toBe('true');

      li.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn() }));

      expect(onDragStart).toHaveBeenCalledWith('x', expect.any(Event));

      endDrag(li);
      sortable.dispose();
    });

    it('skips children where getKey throws', () => {
      const element = document.createElement('ul');
      const good = document.createElement('li');
      const bad = document.createElement('li');

      good.setAttribute('data-sort-id', 'good');
      // bad has no data attribute — getKey returns '' which is falsy → should be skipped
      element.append(good, bad);
      document.body.appendChild(element);

      const sortable = createSortable({ element, getKey });

      expect(good.getAttribute('draggable')).toBe('true');
      // bad element has no key so it should not become draggable
      expect(bad.getAttribute('draggable')).toBeNull();

      sortable.dispose();
    });
  });

  describe('cleanup', () => {
    it('supports using keyword via [Symbol.dispose]', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onDragStart = vi.fn();

      {
        using sortable = createSortable({ element, getKey, onDragStart });
        void sortable;
      }

      startDrag(first);

      expect(onDragStart).not.toHaveBeenCalled();
    });
  });
});

// ─── applyReorder ─────────────────────────────────────────────────────────────

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

  it('returns original order when ids match', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    const result = applyReorder(items, ['a', 'b', 'c'], (i) => i.id);

    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('appends items not mentioned in ids', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    const result = applyReorder(items, ['c'], (i) => i.id);

    expect(result.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('handles empty ids array', () => {
    const items = [{ id: 'a' }, { id: 'b' }];

    const result = applyReorder(items, [], (i) => i.id);

    expect(result.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('handles empty items array', () => {
    const result = applyReorder([], ['a', 'b'], (i: { id: string }) => i.id);

    expect(result).toEqual([]);
  });

  it('handles duplicate IDs in the ids array — first occurrence wins, second is ignored', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    const result = applyReorder(items, ['b', 'b', 'a'], (i) => i.id);

    expect(result.map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not drop numeric items with value 0', () => {
    const items = [0, 1, 2];
    const result = applyReorder(items, ['b', 'a', 'c'], (n) => ['a', 'b', 'c'][n]!);

    expect(result).toEqual([1, 0, 2]);
  });

  it('does not drop falsy-value items (empty string)', () => {
    const items = [
      { id: 'first', val: '' },
      { id: 'second', val: 'x' },
      { id: 'third', val: 'y' },
    ];
    const result = applyReorder(items, ['second', 'first', 'third'], (item) => item.id);

    expect(result.map((item) => item.val)).toEqual(['x', '', 'y']);
  });
});

// ─── scope validation ─────────────────────────────────────────────────────────

describe('scope validation', () => {
  it('throws a clear error when a plain object is passed as scope', () => {
    const { element } = makeList('a');
    const invalidScope = {} as ReturnType<typeof createSortableScope>;

    expect(() => createSortable({ element, getKey, scope: invalidScope })).toThrowError(
      'Invalid scope — use createSortableScope() to create scopes.',
    );
  });
});

// ─── disposed ────────────────────────────────────────────────────────────────

describe('disposed', () => {
  it('disposed is false before dispose()', () => {
    const { element } = makeList('a');
    const sortable = createSortable({ element, getKey });

    expect(sortable.disposed).toBe(false);

    sortable.dispose();
  });

  it('disposed is true after dispose()', () => {
    const { element } = makeList('a');
    const sortable = createSortable({ element, getKey });

    sortable.dispose();

    expect(sortable.disposed).toBe(true);
  });

  it('dispose() is idempotent — second call is a no-op', () => {
    const { element } = makeList('a');
    const sortable = createSortable({ element, getKey });

    sortable.dispose();

    expect(() => sortable.dispose()).not.toThrow();
    expect(sortable.disposed).toBe(true);
  });
});

// ─── disposalSignal ───────────────────────────────────────────────────────────

describe('disposalSignal', () => {
  it('disposalSignal is not aborted before dispose()', () => {
    const { element } = makeList('a');
    const sortable = createSortable({ element, getKey });

    expect(sortable.disposalSignal.aborted).toBe(false);

    sortable.dispose();
  });

  it('disposalSignal is aborted after dispose()', () => {
    const { element } = makeList('a');
    const sortable = createSortable({ element, getKey });

    sortable.dispose();

    expect(sortable.disposalSignal.aborted).toBe(true);
  });
});

// ─── dev-mode warnings ────────────────────────────────────────────────────────

describe('dev-mode warnings', () => {
  it('warns when handle is an empty string', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { element } = makeList('a');
    const sortable = createSortable({ element, getKey, handle: '' });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/dnd]'));

    sortable.dispose();
    warnSpy.mockRestore();
  });

  it('does not warn for a valid handle selector', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { element } = makeList('a');
    const sortable = createSortable({ element, getKey, handle: '.handle' });

    expect(warnSpy).not.toHaveBeenCalled();

    sortable.dispose();
    warnSpy.mockRestore();
  });

  it('warns when getKey returns a duplicate key for two sibling items', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { element } = makeList('a', 'a', 'b');

    const sortable = createSortable({ element, getKey });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate key "a"'));
    expect(warnSpy).toHaveBeenCalledTimes(1);

    sortable.dispose();
    warnSpy.mockRestore();
  });

  it('does not warn when every getKey value is unique', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { element } = makeList('a', 'b', 'c');

    const sortable = createSortable({ element, getKey });

    expect(warnSpy).not.toHaveBeenCalled();

    sortable.dispose();
    warnSpy.mockRestore();
  });

  it('warns in dev when getKey throws for a child element', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = document.createElement('ul');
    const li = document.createElement('li');

    li.setAttribute('data-sort-id', 'a');
    element.append(li);
    document.body.appendChild(element);

    const throwingGetKey = (): string => {
      throw new Error('bad getKey');
    };

    const sortable = createSortable({ element, getKey: throwingGetKey });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/dnd]'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('getKey threw'));

    sortable.dispose();
    warnSpy.mockRestore();
  });
});

// ─── dragover: last position wins ────────────────────────────────────────────

describe('dragover position resolution', () => {
  it('uses the last dragover position when multiple events fire before dragend', () => {
    const {
      element,
      items: [first, second],
    } = makeList('a', 'b');
    const onReorder = vi.fn();

    Object.defineProperty(second, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
    });

    const sortable = createSortable({ element, getKey, onReorder });

    startDrag(first);

    // Two dragover events; only the last position (after midpoint) should determine the result.
    second.dispatchEvent(makeDragEvent('dragover', { clientY: 35, dropEffect: 'move' })); // before midpoint
    second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' })); // after midpoint → insert after

    endDrag(first);

    expect(onReorder).toHaveBeenCalledWith(expect.objectContaining({ ids: ['b', 'a'] }));

    sortable.dispose();
  });
});
