import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTouchDragShim } from '../touch';

function makeTouchEvent(type: string, point: { clientX: number; clientY: number } | null): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touches = point ? [point] : [];

  Object.defineProperty(event, 'touches', { configurable: true, value: touches });
  Object.defineProperty(event, 'changedTouches', { configurable: true, value: touches });

  return event;
}

function makeDraggable(): HTMLElement {
  const el = document.createElement('div');

  el.setAttribute('draggable', 'true');
  document.body.appendChild(el);

  return el;
}

// jsdom does not implement `elementFromPoint` at all (no layout engine) — not even as a
// no-op — so `vi.spyOn` has nothing to wrap. Assign a fresh mock directly instead.
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

describe('createTouchDragShim', () => {
  it('returns a Disposable', () => {
    const shim = createTouchDragShim();

    expect(shim.disposed).toBe(false);
    expect(shim.disposalSignal.aborted).toBe(false);

    shim.dispose();

    expect(shim.disposed).toBe(true);
    expect(shim.disposalSignal.aborted).toBe(true);

    // Idempotent, like createSortable/createDropZone's disposables.
    expect(() => shim.dispose()).not.toThrow();
  });

  it('supports Symbol.dispose', () => {
    const shim = createTouchDragShim();

    shim[Symbol.dispose]();

    expect(shim.disposed).toBe(true);
  });

  it('touchstart on a [draggable] element fires dragstart and prevents default', () => {
    const el = makeDraggable();

    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    el.addEventListener('dragstart', onDragStart);

    using shim = createTouchDragShim();

    const event = makeTouchEvent('touchstart', { clientX: 10, clientY: 20 });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();

    const fired = onDragStart.mock.calls[0]![0] as DragEvent;

    expect(fired.clientX).toBe(10);
    expect(fired.clientY).toBe(20);
  });

  it('touchstart away from any [draggable] element does nothing', () => {
    const el = document.createElement('div');

    document.body.appendChild(el);
    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    document.addEventListener('dragstart', onDragStart);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    expect(onDragStart).not.toHaveBeenCalled();
  });

  it('touchmove after a started drag fires dragover on the element under the touch point', () => {
    const source = makeDraggable();
    const target = document.createElement('div');

    document.body.appendChild(target);

    const elementFromPoint = mockElementFromPoint(source);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    elementFromPoint.mockReturnValue(target);

    const onDragOver = vi.fn();

    target.addEventListener('dragover', onDragOver);

    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 15, clientY: 25 }));

    expect(onDragOver).toHaveBeenCalledTimes(1);
  });

  it('touchend fires drop on the element under the touch point, then dragend on the source', () => {
    const source = makeDraggable();
    const target = document.createElement('div');

    document.body.appendChild(target);

    const elementFromPoint = mockElementFromPoint(source);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    elementFromPoint.mockReturnValue(target);

    const onDrop = vi.fn();
    const onDragEnd = vi.fn();

    target.addEventListener('drop', onDrop);
    source.addEventListener('dragend', onDragEnd);

    document.dispatchEvent(makeTouchEvent('touchend', { clientX: 15, clientY: 25 }));

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('touchcancel fires dragend on the source without a drop', () => {
    const source = makeDraggable();

    mockElementFromPoint(source);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    const onDrop = vi.fn();
    const onDragEnd = vi.fn();

    source.addEventListener('drop', onDrop);
    source.addEventListener('dragend', onDragEnd);

    document.dispatchEvent(makeTouchEvent('touchcancel', { clientX: 0, clientY: 0 }));

    expect(onDrop).not.toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('honors a custom draggableSelector', () => {
    const el = document.createElement('div');

    el.className = 'my-handle';
    document.body.appendChild(el);
    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    el.addEventListener('dragstart', onDragStart);

    using shim = createTouchDragShim({ draggableSelector: '.my-handle' });

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', () => {
    const el = makeDraggable();

    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    el.addEventListener('dragstart', onDragStart);

    const options = { disabled: true };

    using shim = createTouchDragShim(options);

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    expect(onDragStart).not.toHaveBeenCalled();

    // `disabled` is read live off the same options object, matching createSortable/createDropZone.
    options.disabled = false;
    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it('dispose() removes all listeners', () => {
    const el = makeDraggable();

    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    el.addEventListener('dragstart', onDragStart);

    const shim = createTouchDragShim();

    shim.dispose();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    expect(onDragStart).not.toHaveBeenCalled();
  });
});
