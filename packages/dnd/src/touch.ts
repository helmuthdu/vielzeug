import { warn } from './_dev';
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
  /**
   * Renders a floating clone of the dragged element that follows the touch point for the
   * duration of the drag. @default true
   *
   * A native mouse-driven HTML5 drag gets this for free: the browser snapshots the dragged
   * element into its own drag image the moment `dragstart` fires, then keeps that image under
   * the cursor itself for the whole gesture — `createSortable`'s `scheduleHide()` hides the real
   * element a frame later assuming that snapshot already exists. This shim's `dragstart` is a
   * synthetic `Event`, not a real drag, so the browser never creates that image; without this
   * preview, `scheduleHide()` still hides the real element on schedule and touch users are left
   * with *no* visual feedback for the whole gesture — only an empty placeholder box moving
   * between positions — making any drop feel arbitrary regardless of where it actually lands.
   * Set to `false` to render fully custom feedback instead (e.g. toggling a class from your own
   * `dragstart`/`dragend` listeners).
   */
  showDragPreview?: boolean;
}

const PREVIEW_Z_INDEX = 2147483647;

/**
 * Floating visual stand-in for the (real, but hidden) dragged element — see `showDragPreview`'s
 * doc comment for why touch needs one at all. `cloneNode(true)` only clones light-DOM content;
 * a draggable item that renders its visible content inside a shadow root (e.g. a shadow-DOM
 * custom element) will clone as an empty shell. This mirrors the same light-DOM-only limitation
 * every `cloneNode`-based drag preview (most JS sortable libraries included) accepts in exchange
 * for never having to special-case every possible element type.
 */
function createPreviewElement(source: HTMLElement): HTMLElement {
  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;

  clone.removeAttribute('id');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.setAttribute('data-dnd-touch-preview', '');
  Object.assign(clone.style, {
    height: `${rect.height}px`,
    left: `${rect.left}px`,
    margin: '0',
    opacity: '0.85',
    pointerEvents: 'none',
    position: 'fixed',
    top: `${rect.top}px`,
    transition: 'none',
    width: `${rect.width}px`,
    zIndex: String(PREVIEW_Z_INDEX),
  });

  document.body.appendChild(clone);

  return clone;
}

// Deliberately a plain object, never a real `new DataTransfer()`. Verified directly against a
// real Chromium build (not just jsdom): a genuine `DataTransfer` instance created outside an
// active *native* drag operation is permanently in the spec's "disabled mode" — every property
// write, `dropEffect` included, is silently ignored, and every read of it keeps returning the
// type's default (`'none'`), no matter what's assigned. `createSortable`/`createDropZone`'s own
// `finishSession()` reads `dropEffect === 'none'` as an explicit cancellation signal, so with a
// real `DataTransfer` backing this shim's synthetic events, *every* commit — same-column reorder
// or cross-column move alike — would always revert, regardless of where it was actually dropped.
// A plain object has no such "mode" concept: its `dropEffect` is an ordinary, freely-settable JS
// property, which is all `createSortable`/`createDropZone`'s handlers ever read or write on the
// events this shim dispatches. This is also why the previous Safari-<14 fallback (which already
// used a plain object) never exhibited this bug — it was the correct approach the whole time.
function makeDataTransfer(): DataTransfer {
  return {
    dropEffect: 'move',
    effectAllowed: 'move',
    getData: () => '',
    setData() {},
    setDragImage() {},
  } as unknown as DataTransfer;
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
  const DRAG_START_DISTANCE_PX = 6;

  let pendingDraggable: HTMLElement | null = null;
  let pendingStartPoint: { clientX: number; clientY: number } | null = null;
  let dragging: HTMLElement | null = null;
  let lastTarget: Element | null = null;

  // The preview follows the touch point via a `translate3d` delta from wherever the touch was
  // when the preview was created (`previewOrigin`), not from the element's own rect — so it never
  // "jumps" at drag start (the delta starts at zero regardless of exactly where inside the
  // element the user first touched).
  let previewEl: HTMLElement | null = null;
  let previewOrigin: { clientX: number; clientY: number } | null = null;

  function removePreview(): void {
    previewEl?.remove();
    previewEl = null;
    previewOrigin = null;
  }

  // Hides both the real dragged element AND the floating preview for the duration of the
  // hit-test, then restores them. Hiding `dragging` alone isn't enough: the preview sits on top
  // of everything (by design, to follow the touch point) and, since `createPreviewElement()`
  // clones the dragged element's subtree, it can carry cloned custom elements (e.g. shadow-DOM
  // components) that re-run their own setup on the clone and may set `pointer-events` on their
  // *internal* shadow content — which a `pointer-events: none` set only on the preview's light-DOM
  // root does not reliably override. Hiding it outright (rather than relying on `pointer-events`)
  // sidesteps that entirely: a hidden element is never returned by `elementFromPoint`, regardless
  // of what any of its descendants — shadow DOM included — set.
  function elementBelow(clientX: number, clientY: number): Element | null {
    const prevDraggingDisplay = dragging?.style.display ?? '';
    const prevPreviewDisplay = previewEl?.style.display ?? '';

    if (dragging) dragging.style.display = 'none';

    if (previewEl) previewEl.style.display = 'none';

    const below = document.elementFromPoint(clientX, clientY);

    if (dragging) dragging.style.display = prevDraggingDisplay;

    if (previewEl) previewEl.style.display = prevPreviewDisplay;

    return below;
  }

  const disposable = createDisposable(() => {
    pendingDraggable = null;
    pendingStartPoint = null;
    dragging = null;
    lastTarget = null;
    removePreview();
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

      pendingDraggable = draggable;
      pendingStartPoint = { clientX: touch.clientX, clientY: touch.clientY };
    },
    { passive: false, signal: disposable.disposalSignal },
  );

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      const touch = e.touches[0];

      if (!touch) return;

      if (!dragging) {
        if (!pendingDraggable || !pendingStartPoint) return;

        const dx = touch.clientX - pendingStartPoint.clientX;
        const dy = touch.clientY - pendingStartPoint.clientY;
        const distance = Math.hypot(dx, dy);

        if (distance < DRAG_START_DISTANCE_PX) return;

        dragging = pendingDraggable;
        lastTarget = pendingDraggable;

        // Captured before dispatching 'dragstart': createSortable's own scheduleHide() hides
        // `dragging` a frame after that event fires, and by then its layout position may already
        // reflect the placeholder having been inserted. Reading the rect now, while it's still
        // exactly where the user picked it up, is what createPreviewElement() sizes/positions the
        // clone from.
        //
        // Wrapped in try/catch: `createPreviewElement()` clones the dragged element's whole
        // subtree, which — for a draggable item backed by custom elements — re-instantiates live
        // copies that re-run their own `connectedCallback`/setup once appended to `document.body`.
        // A best-effort *visual* feature must never be able to take down the *functional* one:
        // if any of that throws (a component assuming a page-unique id, a framework-internal
        // invariant, anything), the drag must still start normally with no preview, not silently
        // never start at all.
        if (options.showDragPreview !== false) {
          try {
            previewEl = createPreviewElement(dragging);
            previewOrigin = { clientX: touch.clientX, clientY: touch.clientY };
          } catch (err) {
            warn(`drag preview failed to render, continuing without one: ${String(err)}`);
            removePreview();
          }
        }

        dispatch(dragging, 'dragstart', touch.clientX, touch.clientY);
      }

      if (previewEl && previewOrigin) {
        const dx = touch.clientX - previewOrigin.clientX;
        const dy = touch.clientY - previewOrigin.clientY;

        previewEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }

      const below = elementBelow(touch.clientX, touch.clientY);

      if (below && below !== lastTarget) {
        if (lastTarget) dispatch(lastTarget, 'dragleave', touch.clientX, touch.clientY);

        lastTarget = below;
      }

      if (below) dispatch(below, 'dragover', touch.clientX, touch.clientY);

      pendingDraggable = null;
      pendingStartPoint = null;
      e.preventDefault();
    },
    { passive: false, signal: disposable.disposalSignal },
  );

  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      if (!dragging) {
        pendingDraggable = null;
        pendingStartPoint = null;

        return;
      }

      const touch = e.changedTouches[0];

      if (!touch) return;

      const below = elementBelow(touch.clientX, touch.clientY);

      if (below) dispatch(below, 'drop', touch.clientX, touch.clientY);

      dispatch(dragging, 'dragend', touch.clientX, touch.clientY);

      pendingDraggable = null;
      pendingStartPoint = null;
      dragging = null;
      lastTarget = null;
      removePreview();
    },
    { passive: true, signal: disposable.disposalSignal },
  );

  document.addEventListener(
    'touchcancel',
    (e: TouchEvent) => {
      if (!dragging) {
        pendingDraggable = null;
        pendingStartPoint = null;

        return;
      }

      const touch = e.changedTouches[0];

      if (!touch) return;

      dispatch(dragging, 'dragend', touch.clientX, touch.clientY);
      pendingDraggable = null;
      pendingStartPoint = null;
      dragging = null;
      lastTarget = null;
      removePreview();
    },
    { passive: true, signal: disposable.disposalSignal },
  );

  return disposable;
}
