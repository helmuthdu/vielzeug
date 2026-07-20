import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSortable, createSortableScope } from '../sortable';
import { createTouchDragShim } from '../touch';
import { makeList } from './helpers';

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

// A real `DataTransfer` created outside an active *native* drag operation is permanently in the
// spec's "disabled mode" — every property write, `dropEffect` included, is silently ignored, and
// every read keeps returning the type's default (`'none'`). This is verified directly against a
// real Chromium build via touch emulation, not just spec-reading — `new DataTransfer()` looked
// correct in earlier jsdom-based tests here (which stubbed a *freely writable* mock, unlike this
// one) but silently never worked on an actual device. `makeDataTransfer()` must never depend on
// `globalThis.DataTransfer`'s real behavior at all; stubbing this maximally-restrictive shape
// proves that — if a regression reintroduced `new DataTransfer()`, these tests would catch it.
class DisabledModeDataTransfer {
  #dropEffect = 'none';
  effectAllowed = 'uninitialized';

  get dropEffect(): string {
    return this.#dropEffect;
  }

  set dropEffect(_value: string) {
    // no-op — matches a real "disabled mode" DataTransfer.
  }

  getData(): string {
    return '';
  }

  setData(): void {}

  setDragImage(): void {}
}

afterEach(() => {
  document.body.innerHTML = '';
  // @ts-expect-error -- restoring jsdom's own "not implemented" state between tests.
  delete document.elementFromPoint;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

  it('touchstart on a [draggable] element arms drag without starting it yet', () => {
    const el = makeDraggable();

    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    el.addEventListener('dragstart', onDragStart);

    using shim = createTouchDragShim();

    const event = makeTouchEvent('touchstart', { clientX: 10, clientY: 20 });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(onDragStart).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('touchmove past the activation distance starts drag and prevents default', () => {
    const el = makeDraggable();

    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    el.addEventListener('dragstart', onDragStart);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 10, clientY: 20 }));

    const move = makeTouchEvent('touchmove', { clientX: 17, clientY: 20 });
    const preventDefault = vi.spyOn(move, 'preventDefault');

    document.dispatchEvent(move);

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();

    const fired = onDragStart.mock.calls[0]![0] as DragEvent;

    expect(fired.clientX).toBe(17);
    expect(fired.clientY).toBe(20);
  });

  it('touchmove below the activation distance keeps drag inactive', () => {
    const el = makeDraggable();

    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    el.addEventListener('dragstart', onDragStart);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 10, clientY: 20 }));

    const move = makeTouchEvent('touchmove', { clientX: 14, clientY: 20 });
    const preventDefault = vi.spyOn(move, 'preventDefault');

    document.dispatchEvent(move);

    expect(onDragStart).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
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
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    elementFromPoint.mockReturnValue(target);

    const onDrop = vi.fn();
    const onDragEnd = vi.fn();

    target.addEventListener('drop', onDrop);
    source.addEventListener('dragend', onDragEnd);

    document.dispatchEvent(makeTouchEvent('touchend', { clientX: 15, clientY: 25 }));

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  // Regression: `makeDataTransfer()` must produce a `dropEffect` that `createSortable`/
  // `createDropZone`'s `finishSession()` reads as a commit, not a cancellation — and it must do
  // so *regardless* of what a real `DataTransfer` would allow. Stubbing the most restrictive
  // possible real-world shape (see `DisabledModeDataTransfer` above) and still seeing `'move'`
  // here proves this shim never relies on `new DataTransfer()`'s actual (broken, for this
  // purpose) semantics.
  it('dispatches dragend/drop with dataTransfer.dropEffect set to "move", regardless of what a real DataTransfer would allow', () => {
    vi.stubGlobal('DataTransfer', DisabledModeDataTransfer);

    const source = makeDraggable();

    mockElementFromPoint(source);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    const onDragEnd = vi.fn();

    source.addEventListener('dragend', onDragEnd);

    document.dispatchEvent(makeTouchEvent('touchend', { clientX: 10, clientY: 0 }));

    expect(onDragEnd).toHaveBeenCalledTimes(1);

    const fired = onDragEnd.mock.calls[0]![0] as DragEvent;

    expect(fired.dataTransfer?.dropEffect).toBe('move');
  });

  // End-to-end regression for the same bug via the real consumer path: a full touch gesture
  // through an actual `createSortable` instance must commit the reorder, not cancel it — same-
  // column and cross-column alike. Before the `makeDataTransfer()` fix this failed on a real
  // device (confirmed via real-browser touch emulation, not just this stub): `finishSession` saw
  // `dropEffect` silently stuck at `'none'` and always called `cancelSession()`, so `onReorder`
  // never fired for the drop target no matter where the item was actually released.
  it('a full touch drag through createSortable commits the reorder instead of cancelling', () => {
    vi.stubGlobal('DataTransfer', DisabledModeDataTransfer);

    const { element: listA, items } = makeList('a1', 'a2');
    const { element: listB } = makeList('b1', 'b2');
    const [a1] = items;
    const scope = createSortableScope();
    const getKey = (el: HTMLElement): string => el.getAttribute('data-sort-id') ?? '';
    const onReorderB = vi.fn();

    const sortableA = createSortable({ element: listA, getKey, scope });
    const sortableB = createSortable({ element: listB, getKey, onReorder: onReorderB, scope });

    const elementFromPoint = mockElementFromPoint(a1!);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    elementFromPoint.mockReturnValue(listB);
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchend', { clientX: 10, clientY: 0 }));

    expect(onReorderB).toHaveBeenCalledTimes(1);
    expect(onReorderB.mock.calls[0]![0].ids).toContain('a1');

    sortableA.dispose();
    sortableB.dispose();
    scope.dispose();
  });

  // Direct guard against ever reintroducing `new DataTransfer()`: it looks appealing (a genuine
  // native type, `instanceof`-correct) but is fundamentally unusable here — see the comment on
  // `makeDataTransfer()` itself. If a future change resurrects it, this fails immediately instead
  // of silently reverting every touch commit on a real device the way the original bug did.
  it('never constructs a real DataTransfer at all', () => {
    const ctor = vi.fn(function DataTransferSpy(this: unknown) {
      return this;
    });

    vi.stubGlobal('DataTransfer', ctor);

    using shim = createTouchDragShim();

    const source = makeDraggable();

    mockElementFromPoint(source);

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchend', { clientX: 10, clientY: 0 }));

    expect(ctor).not.toHaveBeenCalled();
  });

  it('touchcancel fires dragend on the source without a drop', () => {
    const source = makeDraggable();

    mockElementFromPoint(source);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

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
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

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
    document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it('dispose() removes all listeners', () => {
    const el = makeDraggable();

    mockElementFromPoint(el);

    const onDragStart = vi.fn();

    el.addEventListener('dragstart', onDragStart);

    using shim = createTouchDragShim();

    document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

    expect(onDragStart).not.toHaveBeenCalled();
  });

  // Regression: `createSortable`'s own `scheduleHide()` hides the real dragged element a frame
  // after `dragstart` fires — correct for a *real* mouse drag, where the browser has already
  // snapshotted its native drag image by then. This shim's `dragstart` is synthetic, so the
  // browser never creates one; without a preview of our own, touch users would see the card
  // vanish with no visual feedback at all for the whole gesture.
  describe('drag preview', () => {
    function getPreview(): HTMLElement | null {
      return document.body.querySelector('[data-dnd-touch-preview]');
    }

    it('renders a floating clone of the dragged element once the drag starts', () => {
      const source = makeDraggable();

      source.textContent = 'Card content';
      mockElementFromPoint(source);

      using shim = createTouchDragShim();

      document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

      expect(getPreview()).toBeNull(); // not yet — drag hasn't started (below activation distance)

      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

      const preview = getPreview();

      expect(preview).not.toBeNull();
      expect(preview).not.toBe(source);
      expect(preview?.textContent).toBe('Card content');
      expect(preview?.style.position).toBe('fixed');
      expect(preview?.style.pointerEvents).toBe('none');
    });

    it('moves the preview by the touch delta on every subsequent touchmove', () => {
      const source = makeDraggable();

      mockElementFromPoint(source);

      using shim = createTouchDragShim();

      document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

      // No net movement yet relative to where the drag itself started.
      expect(getPreview()?.style.transform).toBe('translate3d(0px, 0px, 0)');

      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 25, clientY: 30 }));

      expect(getPreview()?.style.transform).toBe('translate3d(15px, 30px, 0)');
    });

    it('removes the preview on touchend', () => {
      const source = makeDraggable();

      mockElementFromPoint(source);

      using shim = createTouchDragShim();

      document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

      expect(getPreview()).not.toBeNull();

      document.dispatchEvent(makeTouchEvent('touchend', { clientX: 10, clientY: 0 }));

      expect(getPreview()).toBeNull();
    });

    it('removes the preview on touchcancel', () => {
      const source = makeDraggable();

      mockElementFromPoint(source);

      using shim = createTouchDragShim();

      document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

      expect(getPreview()).not.toBeNull();

      document.dispatchEvent(makeTouchEvent('touchcancel', { clientX: 10, clientY: 0 }));

      expect(getPreview()).toBeNull();
    });

    it('removes a leftover preview if disposed mid-drag', () => {
      const source = makeDraggable();

      mockElementFromPoint(source);

      const shim = createTouchDragShim();

      document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

      expect(getPreview()).not.toBeNull();

      shim.dispose();

      expect(getPreview()).toBeNull();
    });

    it('does not render a preview when showDragPreview is false', () => {
      const source = makeDraggable();

      mockElementFromPoint(source);

      using shim = createTouchDragShim({ showDragPreview: false });

      document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

      expect(getPreview()).toBeNull();
    });

    // Regression: the preview sits on top of everything (by design) to follow the touch point.
    // `createSortable`/`createDropZone`'s items rendered via a shadow-DOM custom element get
    // cloned as a live re-instantiated element too — its own shadow CSS can set `pointer-events`
    // on internal content in a way a `pointer-events: none` set only on the preview's light-DOM
    // root does not override. Left unhidden during the hit-test, the preview itself (or a
    // descendant) could be the element `elementFromPoint` returns, so `session.target` would
    // never update away from the drag's source — every cross-column drop would revert to the
    // original column regardless of where it was actually released.
    it('hides the preview for the duration of every elementFromPoint hit-test, then restores it', () => {
      const source = makeDraggable();
      const target = document.createElement('div');

      document.body.appendChild(target);

      let previewDisplayDuringHitTest: string | undefined;

      const elementFromPoint = vi
        .fn()
        // First call is touchstart's own draggable-detection lookup.
        .mockReturnValueOnce(source)
        // Subsequent calls are the touchmove hit-test this test actually cares about.
        .mockImplementation(() => {
          previewDisplayDuringHitTest = getPreview()?.style.display;

          return target;
        });

      document.elementFromPoint = elementFromPoint as typeof document.elementFromPoint;

      using shim = createTouchDragShim();

      document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

      expect(previewDisplayDuringHitTest).toBe('none');
      expect(getPreview()?.style.display).not.toBe('none');
    });

    // Regression: `createPreviewElement()` clones the dragged element's whole subtree, which —
    // for an item backed by custom elements — re-instantiates live copies that re-run their own
    // setup once mounted. Previously this ran *before* dispatching 'dragstart', with no error
    // isolation: if cloning threw for any reason, the drag never actually started at all (no
    // 'dragstart' means no active dnd session), so the card would just silently stay put —
    // exactly the "goes back to the previous column" symptom, except in this case it never left
    // in the first place. A best-effort visual feature must never be able to break the required
    // functional one.
    it('still dispatches dragstart and proceeds with the drag even if creating the preview throws', () => {
      const source = makeDraggable();

      mockElementFromPoint(source);

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementationOnce(() => {
        throw new Error('boom');
      });

      const onDragStart = vi.fn();

      source.addEventListener('dragstart', onDragStart);

      using shim = createTouchDragShim();

      document.dispatchEvent(makeTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      document.dispatchEvent(makeTouchEvent('touchmove', { clientX: 10, clientY: 0 }));

      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(getPreview()).toBeNull();

      appendChildSpy.mockRestore();
    });
  });
});
