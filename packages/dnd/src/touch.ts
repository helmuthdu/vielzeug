import { createDisposable, resolveDisabled } from './_shared';
import { type Disposable } from './types';

export interface TouchDragOptions {
  /**
   * Set to `true` (or mutate this same options object's field later) to pause the shim without
   * disposing it — matches `createSortable`'s/`createDropZone`'s own `disabled` option.
   */
  disabled?: boolean;
  /**
   * CSS selector identifying draggable elements. Defaults to `[draggable="true"]` — the exact
   * attribute `createSortable`/`createDropZone`-managed elements already carry, so the default
   * needs no configuration for the common case of bridging touch to an existing sortable/drop zone.
   */
  draggableSelector?: string;
}

function makeDataTransfer(): DataTransfer {
  try {
    return new DataTransfer();
  } catch {
    // Safari < 14 does not expose the DataTransfer constructor.
    return {
      dropEffect: 'move',
      effectAllowed: 'move',
      getData: () => '',
      setData() {},
      setDragImage() {},
    } as unknown as DataTransfer;
  }
}

/**
 * Bridges touch gestures to the synthetic `DragEvent` sequence `createSortable()`/
 * `createDropZone()` already listen for. HTML5 drag-and-drop has no native touch story —
 * this translates `touchstart`/`touchmove`/`touchend`/`touchcancel` into
 * `dragstart`/`dragover`/`drop`/`dragend` on the same document, so touch devices get
 * sortable/drop-zone behavior for free with no extra wiring at each call site.
 *
 * Listens at the `document` level (matching how `createSortable`/`createDropZone` themselves
 * scope drag detection) — one instance covers the whole page. Dispose to remove all listeners.
 *
 * @example
 * ```ts
 * using touchDrag = createTouchDragShim();
 * // ...later, or via the `using` declaration above:
 * touchDrag.dispose();
 * ```
 */
export function createTouchDragShim(options: TouchDragOptions = {}): Disposable {
  const dt = makeDataTransfer();

  let dragging: HTMLElement | null = null;
  let lastTarget: Element | null = null;

  const disposable = createDisposable(() => {
    dragging = null;
    lastTarget = null;
  });

  // Built on a plain `Event` rather than `new DragEvent(...)`: jsdom (and potentially other
  // non-browser DOM implementations) doesn't expose a `DragEvent` constructor at all, and
  // `createSortable`/`createDropZone`'s own handlers only ever read `type`/`clientX`/`clientY`/
  // `dataTransfer` off the event object — they never check `instanceof DragEvent` — so a patched
  // plain `Event` is indistinguishable to them and works everywhere a real `DragEvent` would.
  function dispatch(el: Element, type: string, clientX: number, clientY: number): void {
    const event = new Event(type, { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'clientX', { configurable: true, value: clientX });
    Object.defineProperty(event, 'clientY', { configurable: true, value: clientY });
    Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dt });
    el.dispatchEvent(event);
  }

  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (resolveDisabled(options.disabled)) return;

      const touch = e.touches[0];

      if (!touch) return;

      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      const draggable = target?.closest<HTMLElement>(options.draggableSelector ?? '[draggable="true"]');

      if (!draggable) return;

      dragging = draggable;
      lastTarget = draggable;
      dispatch(draggable, 'dragstart', touch.clientX, touch.clientY);
      // Prevent scroll while dragging.
      e.preventDefault();
    },
    { passive: false, signal: disposable.disposalSignal },
  );

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (!dragging) return;

      const touch = e.touches[0];

      if (!touch) return;

      // Hide the dragged element temporarily so elementFromPoint sees what's beneath it.
      const prevDisplay = dragging.style.display;

      dragging.style.display = 'none';

      const below = document.elementFromPoint(touch.clientX, touch.clientY);

      dragging.style.display = prevDisplay;

      if (below && below !== lastTarget) {
        if (lastTarget) dispatch(lastTarget, 'dragleave', touch.clientX, touch.clientY);

        lastTarget = below;
      }

      if (below) dispatch(below, 'dragover', touch.clientX, touch.clientY);

      e.preventDefault();
    },
    { passive: false, signal: disposable.disposalSignal },
  );

  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      if (!dragging) return;

      const touch = e.changedTouches[0];

      if (!touch) return;

      const prevDisplay = dragging.style.display;

      dragging.style.display = 'none';

      const below = document.elementFromPoint(touch.clientX, touch.clientY);

      dragging.style.display = prevDisplay;

      if (below) dispatch(below, 'drop', touch.clientX, touch.clientY);

      dispatch(dragging, 'dragend', touch.clientX, touch.clientY);

      dragging = null;
      lastTarget = null;
    },
    { passive: true, signal: disposable.disposalSignal },
  );

  document.addEventListener(
    'touchcancel',
    (e: TouchEvent) => {
      if (!dragging) return;

      const touch = e.changedTouches[0];

      if (!touch) return;

      dispatch(dragging, 'dragend', touch.clientX, touch.clientY);
      dragging = null;
      lastTarget = null;
    },
    { passive: true, signal: disposable.disposalSignal },
  );

  return disposable;
}
