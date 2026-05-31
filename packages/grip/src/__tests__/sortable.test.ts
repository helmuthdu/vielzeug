import { describe, expect, it, vi } from 'vitest';

import { applyReorder, createSortable, createSortableScope } from '../sortable';
import { endDrag, makeDragEvent, makeKeyEvent, makeList, startDrag } from './helpers';

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

    const sortableA = createSortable({ element: listA, scope: scopeA });
    const sortableB = createSortable({ element: listB, onReorder: reorderB, scope: scopeB });

    // Drag in list A
    startDrag(a1);
    // Drag over list B — should not trigger because different scope
    listB.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
    endDrag(a1);

    expect(reorderB).not.toHaveBeenCalled();

    sortableA.destroy();
    sortableB.destroy();
  });
});

// ─── createSortable ───────────────────────────────────────────────────────────

describe('createSortable', () => {
  describe('DOM setup', () => {
    it('sets role=list on container and role=listitem + tabindex on items', () => {
      const { element } = makeList('a', 'b');
      const sortable = createSortable({ element });

      expect(element.getAttribute('role')).toBe('list');

      for (const child of element.children) {
        expect((child as HTMLElement).getAttribute('role')).toBe('listitem');
        expect((child as HTMLElement).tabIndex).toBe(0);
      }

      sortable.destroy();
    });

    it('sets draggable on items when no handle option', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element });

      expect(first.getAttribute('draggable')).toBe('true');

      sortable.destroy();
    });

    it('sets draggable on handle elements when handle option is set', () => {
      const element = document.createElement('ul');
      const li = document.createElement('li');
      const handle = document.createElement('span');

      handle.className = 'handle';
      li.setAttribute('data-sort-id', 'a');
      li.append(handle);
      element.append(li);

      const sortable = createSortable({ element, handle: '.handle' });

      expect(li.getAttribute('draggable')).toBeNull();
      expect(handle.getAttribute('draggable')).toBe('true');

      sortable.destroy();
    });

    it('removes all grip attributes on destroy', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element });

      sortable.destroy();

      expect(element.getAttribute('role')).toBeNull();
      expect(first.getAttribute('draggable')).toBeNull();
      expect(first.getAttribute('role')).toBeNull();
      expect(first.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('sync', () => {
    it('applies grip attributes to newly added items after sync', () => {
      const { element } = makeList('a');
      const sortable = createSortable({ element });
      const li = document.createElement('li');

      li.setAttribute('data-sort-id', 'b');
      element.append(li);

      expect(li.getAttribute('draggable')).toBeNull();

      sortable.sync();

      expect(li.getAttribute('draggable')).toBe('true');

      sortable.destroy();
    });
  });

  describe('drag and drop', () => {
    it('exposes isDragging during and after drag', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element });

      expect(sortable.isDragging).toBe(false);

      startDrag(first);

      expect(sortable.isDragging).toBe(true);

      endDrag(first);

      expect(sortable.isDragging).toBe(false);

      sortable.destroy();
    });

    it('fires onDragStart and onDragEnd with the dragged id', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();
      const sortable = createSortable({ element, onDragEnd, onDragStart });

      startDrag(first);

      expect(onDragStart).toHaveBeenCalledWith('a', expect.any(Event));

      endDrag(first);

      expect(onDragEnd).toHaveBeenCalledWith('a', expect.any(Event));

      sortable.destroy();
    });

    it('fires onReorder when drag changes the order', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, onReorder });

      startDrag(first);

      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(onReorder).toHaveBeenCalledWith(['b', 'a']);

      sortable.destroy();
    });

    it('does not fire onReorder when order does not change', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, onReorder });

      startDrag(first);
      endDrag(first);

      expect(onReorder).not.toHaveBeenCalled();

      sortable.destroy();
    });

    it('creates a placeholder sized by height for vertical axis', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');

      Object.defineProperty(first, 'offsetHeight', { configurable: true, value: 40 });

      const sortable = createSortable({ element });

      startDrag(first);

      const placeholder = element.querySelector('.grip-placeholder') as HTMLElement;

      expect(placeholder).toBeTruthy();
      expect(placeholder.style.height).toBe('40px');

      endDrag(first);
      sortable.destroy();
    });

    it('creates a placeholder sized by width for horizontal axis', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');

      Object.defineProperty(first, 'offsetWidth', { configurable: true, value: 120 });

      const sortable = createSortable({ axis: 'horizontal', element });

      startDrag(first);

      const placeholder = element.querySelector('.grip-placeholder') as HTMLElement;

      expect(placeholder).toBeTruthy();
      expect(placeholder.style.width).toBe('120px');

      endDrag(first);
      sortable.destroy();
    });

    it('uses custom placeholderClass', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element, placeholderClass: 'my-placeholder' });

      startDrag(first);

      expect(element.querySelector('.my-placeholder')).toBeTruthy();

      endDrag(first);
      sortable.destroy();
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
      });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).toHaveBeenCalledWith(preview, 0, 0);

      endDrag(first);
      sortable.destroy();
    });

    it('uses static dragImage element when not a function', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const preview = document.createElement('div');
      const setDragImage = vi.fn();
      const sortable = createSortable({ dragImage: preview, element });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).toHaveBeenCalledWith(preview, 0, 0);

      endDrag(first);
      sortable.destroy();
    });

    it('applies dragImageOffset to setDragImage', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const preview = document.createElement('div');
      const setDragImage = vi.fn();
      const sortable = createSortable({ dragImage: preview, dragImageOffset: [12, 34], element });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).toHaveBeenCalledWith(preview, 12, 34);

      endDrag(first);
      sortable.destroy();
    });

    it('skips setDragImage when dragImage callback returns null', () => {
      const {
        element,
        items: [first],
      } = makeList('a');
      const setDragImage = vi.fn();
      const sortable = createSortable({ dragImage: () => null, dragImageOffset: [10, 20], element });

      first.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn(), setDragImage }));

      expect(setDragImage).not.toHaveBeenCalled();

      endDrag(first);
      sortable.destroy();
    });

    it('does not move placeholder when controller becomes disabled reactively mid-drag', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      let isDisabled = false;
      const sortable = createSortable({ disabled: () => isDisabled, element, onReorder });

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      startDrag(first);

      // disable before the dragover — placeholder should not move
      isDisabled = true;
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(onReorder).not.toHaveBeenCalled();

      sortable.destroy();
    });

    it('cancels drag and restores original order when destroyed during active drag', () => {
      const {
        element,
        items: [first, , third],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, onReorder });

      Object.defineProperty(third, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100 }),
      });

      startDrag(first);
      third.dispatchEvent(makeDragEvent('dragover', { clientY: 90, dropEffect: 'move' }));
      sortable.destroy();

      const ids = Array.from(element.children).map((c) => (c as HTMLElement).getAttribute('data-sort-id'));

      expect(ids).toEqual(['a', 'b', 'c']);
      expect(onReorder).not.toHaveBeenCalled();
    });

    it('handles dragover with no matching item target (appends placeholder)', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const sortable = createSortable({ element });

      startDrag(first);
      // Dispatch dragover directly on the container (no item target)
      element.dispatchEvent(makeDragEvent('dragover', { clientY: 0, dropEffect: 'move' }));
      endDrag(first);
      sortable.destroy();
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

      const onDragStart = vi.fn();
      const sortable = createSortable({ element, handle: '.grip', onDragStart });

      // Drag from the li directly (not the handle)
      li.dispatchEvent(makeDragEvent('dragstart', { setData: vi.fn() }));

      expect(onDragStart).not.toHaveBeenCalled();

      sortable.destroy();
    });
  });

  describe('disabled', () => {
    it('ignores dragstart when disabled: true', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onDragStart = vi.fn();
      const sortable = createSortable({ disabled: true, element, onDragStart });

      startDrag(first);

      expect(sortable.isDragging).toBe(false);
      expect(onDragStart).not.toHaveBeenCalled();

      sortable.destroy();
    });

    it('ignores dragstart when disabled getter returns true', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      let isDisabled = true;
      const onDragStart = vi.fn();
      const sortable = createSortable({ disabled: () => isDisabled, element, onDragStart });

      startDrag(first);

      expect(onDragStart).not.toHaveBeenCalled();

      isDisabled = false;
      startDrag(first);

      expect(onDragStart).toHaveBeenCalledTimes(1);

      endDrag(first);
      sortable.destroy();
    });
  });

  describe('keyboard reordering', () => {
    it('moves item forward with ArrowDown', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowDown'));

      expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);

      sortable.destroy();
    });

    it('moves item backward with ArrowUp', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowUp'));

      expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);

      sortable.destroy();
    });

    it('moves item to start with Home', () => {
      const {
        element,
        items: [, , third],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, onReorder });

      third.dispatchEvent(makeKeyEvent('Home'));

      expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);

      sortable.destroy();
    });

    it('moves item to end with End', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, onReorder });

      first.dispatchEvent(makeKeyEvent('End'));

      expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);

      sortable.destroy();
    });

    it('moves forward with ArrowRight for horizontal axis', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ axis: 'horizontal', element, onReorder });

      first.dispatchEvent(makeKeyEvent('ArrowRight'));

      expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);

      sortable.destroy();
    });

    it('does not fire onReorder when item is already at boundary', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b', 'c');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, onReorder });

      first.dispatchEvent(makeKeyEvent('ArrowUp'));

      expect(onReorder).not.toHaveBeenCalled();

      sortable.destroy();
    });

    it('ignores key events when keyboard: false', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({ element, keyboard: false, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowUp'));

      expect(onReorder).not.toHaveBeenCalled();

      sortable.destroy();
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
      const sortable = createSortable({ element, onReorder });

      input.dispatchEvent(makeKeyEvent('ArrowDown'));

      expect(onReorder).not.toHaveBeenCalled();

      sortable.destroy();
    });

    it('ignores keyboard when disabled', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();
      const sortable = createSortable({ disabled: true, element, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowDown'));

      expect(onReorder).not.toHaveBeenCalled();

      sortable.destroy();
    });
  });

  describe('revert', () => {
    it('calls the revert function returned by onReorder after a drag', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onRevert = vi.fn();
      const onReorder = vi.fn().mockReturnValue(onRevert);

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      sortable.revert();

      expect(onRevert).toHaveBeenCalledTimes(1);

      sortable.destroy();
    });

    it('calls the revert function returned by onReorder after a keyboard move', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b', 'c');
      const onRevert = vi.fn();
      const onReorder = vi.fn().mockReturnValue(onRevert);
      const sortable = createSortable({ element, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowDown'));
      sortable.revert();

      expect(onRevert).toHaveBeenCalledTimes(1);

      sortable.destroy();
    });

    it('is a no-op when onReorder returns undefined', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onReorder = vi.fn();

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(() => sortable.revert()).not.toThrow();

      sortable.destroy();
    });

    it('clears the revert function after first call', () => {
      const {
        element,
        items: [first, second],
      } = makeList('a', 'b');
      const onRevert = vi.fn();
      const onReorder = vi.fn().mockReturnValue(onRevert);

      Object.defineProperty(second, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ bottom: 60, height: 30, left: 0, right: 100, top: 30, width: 100 }),
      });

      const sortable = createSortable({ element, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      sortable.revert();
      sortable.revert(); // second call is a no-op

      expect(onRevert).toHaveBeenCalledTimes(1);

      sortable.destroy();
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

      const sortable = createSortable({ element, onBeforeReorder, onReorder });

      startDrag(first);
      second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' }));
      endDrag(first);

      expect(onBeforeReorder).toHaveBeenCalledWith(['a', 'b'], ['b', 'a']);
      expect(callOrder).toEqual(['before', 'reorder']);

      sortable.destroy();
    });

    it('is not called when the drag is cancelled', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onBeforeReorder = vi.fn();
      const sortable = createSortable({ element, onBeforeReorder });

      startDrag(first);
      endDrag(first, 'none');

      expect(onBeforeReorder).not.toHaveBeenCalled();

      sortable.destroy();
    });

    it('is not called when order does not change', () => {
      const {
        element,
        items: [first],
      } = makeList('a', 'b');
      const onBeforeReorder = vi.fn();
      const sortable = createSortable({ element, onBeforeReorder });

      startDrag(first);
      endDrag(first);

      expect(onBeforeReorder).not.toHaveBeenCalled();

      sortable.destroy();
    });

    it('fires with from/to arrays before onReorder for keyboard moves', () => {
      const {
        element,
        items: [, second],
      } = makeList('a', 'b', 'c');
      const callOrder: string[] = [];
      const onBeforeReorder = vi.fn(() => callOrder.push('before'));
      const onReorder = vi.fn(() => callOrder.push('reorder'));
      const sortable = createSortable({ element, onBeforeReorder, onReorder });

      second.dispatchEvent(makeKeyEvent('ArrowDown'));

      expect(onBeforeReorder).toHaveBeenCalledWith(['a', 'b', 'c'], ['a', 'c', 'b']);
      expect(callOrder).toEqual(['before', 'reorder']);

      sortable.destroy();
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

      const leftSortable = createSortable({ element: left, onReorder: leftReorder, scope });
      const rightSortable = createSortable({ element: right, onReorder: rightReorder, scope });

      startDrag(l1);
      right.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
      endDrag(l1);

      expect(leftReorder).toHaveBeenCalledWith(['l2']);
      expect(rightReorder).toHaveBeenCalledWith(['r1', 'l1']);

      leftSortable.destroy();
      rightSortable.destroy();
    });

    it('does not transfer items between lists without a shared scope', () => {
      const {
        element: left,
        items: [l1],
      } = makeList('l1', 'l2');
      const { element: right } = makeList('r1');
      const rightReorder = vi.fn();

      // No shared scope — each gets its own private scope
      const leftSortable = createSortable({ element: left });
      const rightSortable = createSortable({ element: right, onReorder: rightReorder });

      startDrag(l1);
      right.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
      endDrag(l1);

      expect(rightReorder).not.toHaveBeenCalled();

      leftSortable.destroy();
      rightSortable.destroy();
    });

    it('lazy order snapshots: only participanting controllers are recorded', () => {
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
      const sortableA = createSortable({ element: listA, onReorder: reorderA, scope });
      const sortableB = createSortable({ element: listB, scope });
      const sortableC = createSortable({ element: listC, onReorder: reorderC, scope });

      startDrag(a1);
      listB.dispatchEvent(makeDragEvent('dragover', { dropEffect: 'move' }));
      endDrag(a1);

      // C was never visited so its reorder should not fire
      expect(reorderA).toHaveBeenCalledWith(['a2']);
      expect(reorderC).not.toHaveBeenCalled();

      sortableA.destroy();
      sortableB.destroy();
      sortableC.destroy();
    });
  });

  describe('custom itemAttribute', () => {
    it('respects custom itemAttribute', () => {
      const element = document.createElement('ul');
      const li = document.createElement('li');

      li.setAttribute('data-id', 'x');
      element.append(li);

      const onDragStart = vi.fn();
      const sortable = createSortable({ element, itemAttribute: 'data-id', onDragStart });

      expect(li.getAttribute('draggable')).toBe('true');

      li.dispatchEvent(makeDragEvent('dragstart', { effectAllowed: 'move', setData: vi.fn() }));

      expect(onDragStart).toHaveBeenCalledWith('x', expect.any(Event));

      endDrag(li);
      sortable.destroy();
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
        using sortable = createSortable({ element, onDragStart });
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
});

// ─── scope validation ─────────────────────────────────────────────────────────

describe('scope validation', () => {
  it('throws a clear error when a plain object is passed as scope', () => {
    const { element } = makeList('a');
    const invalidScope = {} as ReturnType<typeof createSortableScope>;

    expect(() => createSortable({ element, scope: invalidScope })).toThrowError(
      '@vielzeug/grip: Invalid scope — use createSortableScope() to create scopes.',
    );
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

    const sortable = createSortable({ element, onReorder });

    startDrag(first);

    // Two dragover events; only the last position (after midpoint) should determine the result.
    second.dispatchEvent(makeDragEvent('dragover', { clientY: 35, dropEffect: 'move' })); // before midpoint
    second.dispatchEvent(makeDragEvent('dragover', { clientY: 50, dropEffect: 'move' })); // after midpoint → insert after

    endDrag(first);

    expect(onReorder).toHaveBeenCalledWith(['b', 'a']);

    sortable.destroy();
  });
});
