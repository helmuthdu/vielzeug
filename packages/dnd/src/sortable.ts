import { warn } from './_dev.js';
import { createDisposable, resolveDisabled } from './_shared.js';
import { createScopeTouchController, type ScopeTouchController, type TouchInputOptions } from './_touch.js';
import { DndError, DndScopeError } from './errors.js';
import type { Disposable } from './types.js';

// ─── Branded scope ────────────────────────────────────────────────────────────

const SCOPE_BRAND = Symbol('SortableScope');

export interface SortableScope extends Disposable {
  /** `true` while any sortable in this scope is actively dragging. */
  readonly isDragging: boolean;
  readonly [SCOPE_BRAND]: true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoScrollOptions {
  /** Scroll the sortable container while dragging near its edges. @default true */
  container?: boolean;
  /** Distance in pixels from an edge that triggers auto-scroll. @default 32 */
  edgeThreshold?: number;
  /** Pixels scrolled per dragover frame while near an edge. @default 18 */
  speed?: number;
  /** Scroll the viewport while dragging near the window edges. @default false */
  viewport?: boolean;
}

/**
 * Passed to `onReorder` after every successful reorder (drag or keyboard).
 * Application history owns rollback — use `before`/`after`/`item` to record
 * an undo entry.
 */
export interface ReorderEvent {
  /** Item keys after the reorder. */
  after: readonly string[];
  /** Item keys before the reorder. */
  before: readonly string[];
  /** Stable identity of the moved item. */
  item: string;
}

/** A single committed move between two containers in the same sortable scope. */
export interface SortableMoveEvent {
  /** Stable identity of the moved item. */
  readonly itemId: string;
  /** Source container before the move. */
  readonly source: HTMLElement;
  /** Ordered source item IDs before the move. */
  readonly sourceBeforeIds: readonly string[];
  /** Ordered source item IDs after the move. */
  readonly sourceIds: readonly string[];
  /** Target container after the move. */
  readonly target: HTMLElement;
  /** Ordered target item IDs before the move. */
  readonly targetBeforeIds: readonly string[];
  /** Ordered target item IDs after the move. */
  readonly targetIds: readonly string[];
}

/**
 * Structured accessibility/observability event for sortable interactions.
 *
 * Drag: `pickup` on dragstart, `drop` on commit, `cancel` on cancel.
 * Keyboard: `move` on each successful arrow/Home/End reorder (direct-commit model).
 *
 * Wire a consumer-side announcer to provide screen-reader feedback:
 * ```ts
 * createSortable({
 *   onInteraction(event) {
 *     announce(formatSortableEvent(event));
 *   },
 * });
 * ```
 */
export type SortableInteractionEvent =
  | { readonly index: number; readonly itemId: string; readonly total: number; readonly type: 'pickup' }
  | {
      readonly index: number;
      readonly itemId: string;
      readonly previousIndex: number;
      readonly total: number;
      readonly type: 'move';
    }
  | { readonly index: number; readonly itemId: string; readonly total: number; readonly type: 'drop' }
  | { readonly index: number; readonly itemId: string; readonly total: number; readonly type: 'cancel' };

export interface SortableScopeOptions {
  /**
   * Called exactly once for every successful cross-container move.
   * Local reorders continue to use each sortable's `onReorder` callback.
   */
  onMove?: (event: SortableMoveEvent) => void;
  /**
   * Enables touch input for sortable items registered to this scope.
   * The controller ignores unrelated document draggables.
   */
  touch?: boolean | TouchInputOptions;
}

export type SortableTouchOptions = TouchInputOptions;

export interface SortableOptions {
  /** Auto-scrolls the container (and viewport) near edges while dragging. @default true */
  autoScroll?: boolean | AutoScrollOptions;
  /** Sorting axis used to compute insertion position. @default 'vertical' */
  axis?: 'vertical' | 'horizontal';
  /**
   * When `true`, drag interactions are ignored.
   *
   * Note: if `disabled` transitions to `true` while a drag is in progress the
   * drag is treated as a cancellation — the item snaps back to its original
   * position rather than committing the last placeholder location.
   */
  disabled?: boolean;
  /** Optional custom drag preview element. */
  dragImage?: HTMLElement | ((id: string, item: HTMLElement, event: DragEvent) => HTMLElement | null | undefined);
  /**
   * Hotspot offset `[x, y]` passed to `setDragImage`.
   * Controls which point of the preview image follows the cursor.
   * @default [0, 0]
   */
  dragImageOffset?: [number, number];
  /** Container element whose direct-child items are sortable. */
  element: HTMLElement;
  /**
   * Returns the identity key for a given item element.
   * This separates the "what is this item?" concern (yours) from the "which children
   * are sortable?" concern (ours — marked with `data-dnd-item`).
   *
   * @example
   * ```ts
   * getKey: (el) => el.dataset.taskId!
   * ```
   */
  getKey: (element: HTMLElement) => string;
  /**
   * Selector for the drag handle inside each item.
   * When omitted the whole item is the handle.
   */
  handle?: string;
  /**
   * Returns the current sortable item elements. When omitted the sortable
   * scans the container's direct children. Provide this for explicit item
   * ownership — e.g. when items are managed by a framework render loop.
   */
  items?: () => readonly HTMLElement[];
  /**
   * Enables keyboard-based reordering using arrow keys plus Home/End.
   * @default true
   */
  keyboard?: boolean;
  /**
   * Called just before a successful drag commit with the before and after order snapshots.
   * Use this hook to set up FLIP animations — the source items are still in their
   * pre-commit positions at the time of the call.
   *
   * @example
   * ```ts
   * onBeforeReorder: (from, to) => {
   *   // record element positions here, then animate after the next microtask
   * }
   * ```
   */
  onBeforeReorder?: (from: readonly string[], to: readonly string[]) => void;
  /** Called when a drag ends (whether dropped or cancelled). */
  onDragEnd?: (id: string, event: DragEvent) => void;
  /** Called when the user starts dragging an item. */
  onDragStart?: (id: string, event: DragEvent) => void;
  /**
   * Structured accessibility event for pickup/move/drop/cancel — wire to a consumer-side
   * announcer for screen-reader feedback. See {@link SortableInteractionEvent}.
   */
  onInteraction?: (event: SortableInteractionEvent) => void;
  /**
   * Called with a {@link ReorderEvent} after a successful reorder, only when the order changed.
   * The event carries `before`, `after`, and `item` so application history can own rollback.
   *
   * @example
   * ```ts
   * onReorder: ({ before, after, item }) => {
   *   history.push({ revert: () => setOrder(before) });
   *   setOrder(after);
   * },
   * ```
   */
  onReorder?: (event: ReorderEvent) => void;
  /** CSS class applied to the placeholder element. @default 'dnd-placeholder' */
  placeholderClass?: string;
  /** Shared scope for connected sortable containers. Containers only exchange items within the same scope. */
  scope?: SortableScope;
}

export interface Sortable extends Disposable {
  readonly isDragging: boolean;
  /**
   * Re-reads items from the `items` provider (or the container's direct children)
   * and reapplies `draggable`, ARIA roles, and handle attributes. Call this after
   * programmatically adding, removing, or replacing items — e.g. after a framework
   * render that replaces DOM nodes.
   *
   * Not needed when items are only reordered via drag or keyboard.
   */
  refresh(): void;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface ResolvedAutoScrollOptions {
  container: boolean;
  edgeThreshold: number;
  speed: number;
  viewport: boolean;
}

/** Per-container closure passed into shared session functions. */
interface ContainerHandle {
  commitReorder: (event: { after: readonly string[]; before: readonly string[]; item: string }) => void;
  readonly element: HTMLElement;
  getOrderedIds: () => string[];
  getOrderedItems: () => HTMLElement[];
  isDisabled: () => boolean;
  notifyBeforeReorder: (from: readonly string[], to: readonly string[]) => void;
  notifyDragEnd: (id: string, event: DragEvent) => void;
  notifyDragStart: (id: string, event: DragEvent) => void;
  notifyInteraction: (event: SortableInteractionEvent) => void;
  resolveTouchTarget: (target: Element) => HTMLElement | null;
}

/**
 * Encapsulates all mutable state for a single in-progress drag operation.
 * Created at dragstart, destroyed on dragend/cancel.
 */
interface DragSession {
  draggedEl: HTMLElement;
  draggedId: string;
  /** rAF handle for the deferred element-hide; null once fired or cancelled. */
  hideFrame: number | null;
  /**
   * Order snapshots captured lazily: snapshot is taken the first time a handle
   * becomes the active target (and always for the source at drag start).
   */
  initialOrders: Map<ContainerHandle, string[]>;
  originalDisplay: string;
  originalNextSibling: ChildNode | null;
  originalParent: HTMLElement;
  placeholder: HTMLElement;
  source: ContainerHandle;
  target: ContainerHandle | null;
}

interface SortableScopeState {
  active: DragSession | null;
  commitMove: (event: SortableMoveEvent) => void;
  /** All sortables registered in this scope, kept for scope.dispose(). */
  disposables: Set<() => void>;
  handles: Set<ContainerHandle>;
  touch: ScopeTouchController | null;
}

interface ManagedElementState {
  dataDndHandle: string | null;
  dataDndItem: string | null;
  draggable: string | null;
  role: string | null;
  tabIndex: string | null;
  touchAction: string;
}

interface TouchDragEvent extends DragEvent {
  readonly __dndTouch?: boolean;
  readonly __dndTouchPreview?: boolean;
}

// ─── Internal constants ───────────────────────────────────────────────────────

const HANDLE_ATTR = 'data-dnd-handle';
const ITEM_ATTR = 'data-dnd-item';
const sortableScopeStates = new WeakMap<SortableScope, SortableScopeState>();
const DEFAULT_AUTO_SCROLL: ResolvedAutoScrollOptions = {
  container: true,
  edgeThreshold: 32,
  speed: 18,
  viewport: false,
};

// ─── Scope helpers ────────────────────────────────────────────────────────────

function getSortableScopeState(scope: SortableScope): SortableScopeState {
  const state = sortableScopeStates.get(scope);

  if (!state) throw new DndScopeError();
  if (scope.disposed) throw new DndScopeError('Cannot register a sortable with a disposed scope.');

  return state;
}

// ─── Option resolution ────────────────────────────────────────────────────────

function resolveAutoScrollOptions(
  autoScroll: boolean | AutoScrollOptions | undefined,
): ResolvedAutoScrollOptions | null {
  if (autoScroll === false) return null;

  if (autoScroll === true || autoScroll === undefined) return DEFAULT_AUTO_SCROLL;
  if (
    !Number.isFinite(autoScroll.edgeThreshold ?? 32) ||
    (autoScroll.edgeThreshold ?? 32) < 0 ||
    !Number.isFinite(autoScroll.speed ?? 18) ||
    (autoScroll.speed ?? 18) <= 0
  ) {
    throw new DndError('Auto-scroll edgeThreshold must be non-negative and speed must be positive');
  }

  return {
    container: autoScroll.container ?? true,
    edgeThreshold: autoScroll.edgeThreshold ?? 32,
    speed: autoScroll.speed ?? 18,
    viewport: autoScroll.viewport ?? false,
  };
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function hasOrderChanged(before: string[], after: string[]): boolean {
  return after.length !== before.length || after.some((id, index) => id !== before[index]);
}

function isTouchDragEvent(event: DragEvent): event is TouchDragEvent {
  return (event as TouchDragEvent).__dndTouch === true;
}

function immutableIds(ids: readonly string[]): readonly string[] {
  return Object.freeze([...ids]);
}

function notify<Args extends unknown[]>(
  name: string,
  callback: ((...args: Args) => void) | undefined,
  ...args: Args
): void {
  if (!callback) return;
  try {
    callback(...args);
  } catch {
    warn(`${name} callback failed; Dnd continued without interrupting internal state.`);
  }
}

// ─── Drag session helpers ─────────────────────────────────────────────────────

function scheduleHide(session: DragSession): void {
  if (typeof requestAnimationFrame !== 'function') return;

  session.hideFrame = requestAnimationFrame(() => {
    session.hideFrame = null;
    session.draggedEl.style.display = 'none';
  });
}

function cancelHide(session: DragSession): void {
  if (session.hideFrame !== null) {
    cancelAnimationFrame(session.hideFrame);
    session.hideFrame = null;
  }
}

function restoreSessionElement(session: DragSession): void {
  cancelHide(session);
  session.draggedEl.style.display = session.originalDisplay;
  session.draggedEl.removeAttribute('data-dragging');
}

/**
 * Snapshot a handle's current order if not already recorded.
 * Called the first time a handle becomes an active target so we only capture
 * lists that actually participate in the drag.
 */
function snapshotOrder(session: DragSession, handle: ContainerHandle): void {
  if (!session.initialOrders.has(handle)) {
    session.initialOrders.set(handle, handle.getOrderedIds());
  }
}

function projectedChanges(session: DragSession): Array<{ after: string[]; before: string[]; handle: ContainerHandle }> {
  const target = session.target;

  return [...session.initialOrders].flatMap(([handle, before]) => {
    const after = before.filter((id) => id !== session.draggedId);

    if (handle === target && session.placeholder.parentElement === handle.element) {
      const children = [...handle.element.children];
      const placeholderIndex = children.indexOf(session.placeholder);
      const insertionIndex = handle
        .getOrderedItems()
        .filter((item) => item !== session.draggedEl && children.indexOf(item) < placeholderIndex).length;
      after.splice(insertionIndex, 0, session.draggedId);
    }

    return hasOrderChanged(before, after) ? [{ after, before, handle }] : [];
  });
}

// ─── Session commit / cancel ──────────────────────────────────────────────────

function cancelSession(scopeState: SortableScopeState, event: DragEvent): void {
  const session = scopeState.active;

  if (!session) return;

  restoreSessionElement(session);
  session.originalParent.insertBefore(
    session.draggedEl,
    session.originalNextSibling?.parentNode === session.originalParent ? session.originalNextSibling : null,
  );
  session.placeholder.remove();
  scopeState.active = null;

  session.source.notifyDragEnd(session.draggedId, event);
  session.source.notifyInteraction({
    index: session.source.getOrderedIds().indexOf(session.draggedId),
    itemId: session.draggedId,
    total: session.source.getOrderedIds().length,
    type: 'cancel',
  });
}

function commitSession(scopeState: SortableScopeState, event: DragEvent): void {
  const session = scopeState.active;

  if (!session) return;

  const targetHandle = session.target;
  const targetElement = session.placeholder.parentElement;
  const projected = projectedChanges(session);

  for (const { after, before, handle } of projected) {
    handle.notifyBeforeReorder(immutableIds(before), immutableIds(after));
  }

  restoreSessionElement(session);

  if (targetHandle && scopeState.handles.has(targetHandle) && targetElement) {
    targetElement.insertBefore(session.draggedEl, session.placeholder);
  } else {
    session.originalParent.insertBefore(
      session.draggedEl,
      session.originalNextSibling?.parentNode === session.originalParent ? session.originalNextSibling : null,
    );
  }

  session.placeholder.remove();
  scopeState.active = null;

  session.source.notifyDragEnd(session.draggedId, event);

  const changes: Array<{ after: readonly string[]; before: readonly string[]; handle: ContainerHandle }> = [];

  for (const [handle, before] of session.initialOrders) {
    if (!scopeState.handles.has(handle)) continue;

    const afterOrder = handle.getOrderedIds();

    if (hasOrderChanged(before, afterOrder)) {
      changes.push({ after: afterOrder, before, handle });
    }
  }

  if (targetHandle && targetHandle !== session.source) {
    const sourceChange = changes.find((change) => change.handle === session.source);
    const targetChange = changes.find((change) => change.handle === targetHandle);

    if (sourceChange && targetChange) {
      scopeState.commitMove({
        itemId: session.draggedId,
        source: session.source.element,
        sourceBeforeIds: sourceChange.before,
        sourceIds: sourceChange.after,
        target: targetHandle.element,
        targetBeforeIds: targetChange.before,
        targetIds: targetChange.after,
      });

      const dropIndex = targetChange.after.indexOf(session.draggedId);
      const dropTotal = targetChange.after.length;

      // Emit from both source and target so a consumer wiring onInteraction on
      // either container receives the drop event.
      session.source.notifyInteraction({ index: dropIndex, itemId: session.draggedId, total: dropTotal, type: 'drop' });
      targetHandle.notifyInteraction({ index: dropIndex, itemId: session.draggedId, total: dropTotal, type: 'drop' });
    }

    return;
  }

  for (const { after, before, handle } of changes) {
    handle.commitReorder({ after, before, item: session.draggedId });
  }

  // Same-container — emit drop even when the order didn't change (user picked up
  // and dropped at the same position). The interaction completed; silence would
  // leave screen-reader users without confirmation.
  const sourceChange = changes.find((change) => change.handle === session.source);
  const finalOrder = sourceChange ? sourceChange.after : session.source.getOrderedIds();
  const finalIndex = finalOrder.indexOf(session.draggedId);

  session.source.notifyInteraction({
    index: finalIndex,
    itemId: session.draggedId,
    total: finalOrder.length,
    type: 'drop',
  });
}

function finishSession(scopeState: SortableScopeState, event: DragEvent, forceCancel: boolean): void {
  if (!scopeState.active) return;

  const { active } = scopeState;

  // If source or target became disabled during the drag, treat as cancellation.
  if (
    forceCancel ||
    !event.dataTransfer ||
    event.dataTransfer.dropEffect === 'none' ||
    !active.target ||
    !scopeState.handles.has(active.target) ||
    active.source.isDisabled() ||
    active.target.isDisabled()
  ) {
    cancelSession(scopeState, event);
  } else {
    commitSession(scopeState, event);
  }
}

function maybeAutoScroll(
  event: DragEvent,
  container: HTMLElement,
  axis: 'vertical' | 'horizontal',
  options: ResolvedAutoScrollOptions | null,
): void {
  if (!options) return;

  const { container: scrollContainer, edgeThreshold: threshold, speed, viewport } = options;
  const rect = container.getBoundingClientRect();

  if (axis === 'vertical') {
    if (scrollContainer && event.clientY < rect.top + threshold) {
      container.scrollTop -= speed;
    } else if (scrollContainer && event.clientY > rect.bottom - threshold) {
      container.scrollTop += speed;
    }

    if (viewport && event.clientY < threshold) {
      window.scrollBy({ left: 0, top: -speed });
    } else if (viewport && event.clientY > window.innerHeight - threshold) {
      window.scrollBy({ left: 0, top: speed });
    }

    return;
  }

  if (scrollContainer && event.clientX < rect.left + threshold) {
    container.scrollLeft -= speed;
  } else if (scrollContainer && event.clientX > rect.right - threshold) {
    container.scrollLeft += speed;
  }

  if (viewport && event.clientX < threshold) {
    window.scrollBy({ left: -speed, top: 0 });
  } else if (viewport && event.clientX > window.innerWidth - threshold) {
    window.scrollBy({ left: speed, top: 0 });
  }
}

// ─── Keyboard reorder ─────────────────────────────────────────────────────────

function keyboardTargetIndex(
  items: HTMLElement[],
  item: HTMLElement,
  key: string,
  axis: 'vertical' | 'horizontal',
): number | null {
  const currentIndex = items.indexOf(item);

  if (currentIndex < 0) return null;

  const isForward = axis === 'vertical' ? key === 'ArrowDown' : key === 'ArrowRight';
  const isBackward = axis === 'vertical' ? key === 'ArrowUp' : key === 'ArrowLeft';
  let targetIndex: number;

  if (isForward) targetIndex = Math.min(items.length - 1, currentIndex + 1);
  else if (isBackward) targetIndex = Math.max(0, currentIndex - 1);
  else if (key === 'Home') targetIndex = 0;
  else if (key === 'End') targetIndex = items.length - 1;
  else return null;

  // Already at the boundary — return null so the caller does not call preventDefault
  // and the browser can handle the key (e.g. scrolling the page).
  return targetIndex === currentIndex ? null : targetIndex;
}

// ─── createSortableScope ──────────────────────────────────────────────────────

/**
 * Create a shared scope for connected sortable containers.
 *
 * Items can be dragged between all sortables that share the same scope.
 *
 * @example
 * ```ts
 * const scope = createSortableScope();
 * const left = createSortable({ element: leftEl, scope, getKey, onReorder });
 * const right = createSortable({ element: rightEl, scope, getKey, onReorder });
 *
 * // Tear down everything at once:
 * scope.dispose();
 * ```
 */
export function createSortableScope(options: SortableScopeOptions = {}): SortableScope {
  const state: SortableScopeState = {
    active: null,
    commitMove(event): void {
      notify(
        'onMove',
        options.onMove,
        Object.freeze({
          ...event,
          sourceBeforeIds: immutableIds(event.sourceBeforeIds),
          sourceIds: immutableIds(event.sourceIds),
          targetBeforeIds: immutableIds(event.targetBeforeIds),
          targetIds: immutableIds(event.targetIds),
        }),
      );
    },
    disposables: new Set(),
    handles: new Set(),
    touch: null,
  };
  const disposable = createDisposable(() => {
    state.touch?.dispose();

    // Dispose all registered sortables (each dispose() call is idempotent)
    for (const disposeFn of [...state.disposables]) {
      disposeFn();
    }
    state.disposables.clear();
    state.handles.clear();
  });

  const scope = {
    get disposalSignal() {
      return disposable.disposalSignal;
    },
    dispose: disposable.dispose,
    get disposed() {
      return disposable.disposed;
    },
    get isDragging() {
      return state.active !== null;
    },
    [SCOPE_BRAND]: true as const,
    [Symbol.dispose]: disposable[Symbol.dispose],
  } as SortableScope;

  sortableScopeStates.set(scope, state);

  if (options.touch) {
    state.touch = createScopeTouchController(options.touch === true ? {} : options.touch, (target) => {
      if (state.active) return null;
      for (const handle of state.handles) {
        const dragTarget = handle.resolveTouchTarget(target);

        if (dragTarget) return dragTarget;
      }

      return null;
    });
  }

  return scope;
}

// ─── createSortable ───────────────────────────────────────────────────────────

/**
 * Makes a list of items sortable via native HTML drag interactions.
 *
 * Provide `getKey` to map each item element to a stable string identity.
 * `createSortable` marks qualifying children with `data-dnd-item` and sets
 * `draggable="true"` automatically.
 *
 * Style the drop indicator by targeting `.dnd-placeholder` in your CSS.
 * Supports keyboard reordering (arrow keys, Home/End) and auto-scrolling near edges.
 *
 * @example
 * ```ts
 * import { createSortable } from '@vielzeug/dnd/sortable';
 *
 * using sortable = createSortable({
 *   element: listEl,
 *   getKey: (el) => el.dataset.id!,
 *   onReorder: ({ before, after }) => {
 *     history.push({ revert: () => setOrder(before) });
 *     setOrder(after);
 *   },
 * });
 * ```
 */
export function createSortable(options: SortableOptions): Sortable {
  const {
    autoScroll = true,
    axis = 'vertical',
    element,
    getKey,
    handle,
    keyboard = true,
    placeholderClass = 'dnd-placeholder',
    scope = createSortableScope(),
  } = options;
  if (axis !== 'vertical' && axis !== 'horizontal') throw new DndError('axis must be "vertical" or "horizontal"');
  const handleSelector = handle?.trim() || null;

  if (handle !== undefined && !handleSelector) {
    warn(
      'handle option is an empty string — no handle elements will be found. Provide a valid CSS selector or omit the option.',
    );
  } else if (handleSelector) {
    try {
      element.querySelector(handleSelector);
    } catch (error) {
      throw new DndError(`Invalid handle selector: "${handle}"`, { cause: error });
    }
  }

  const autoScrollOptions = resolveAutoScrollOptions(autoScroll);
  const scopeState = getSortableScopeState(scope);
  if ([...scopeState.handles].some((registered) => registered.element === element)) {
    throw new DndError('A sortable is already registered for this element in the selected scope.');
  }
  const getItems = (): HTMLElement[] =>
    (options.items ? options.items() : (Array.from(element.children) as HTMLElement[])).filter(
      (item) => item.parentElement === element && item.hasAttribute(ITEM_ATTR),
    );

  const getOrderedIds = (): string[] => getItems().map((el) => getKey(el));
  const managedElements = new Map<HTMLElement, ManagedElementState>();
  const originalContainerRole = element.getAttribute('role');

  const rememberElement = (managedElement: HTMLElement): ManagedElementState => {
    const existing = managedElements.get(managedElement);

    if (existing) return existing;

    const state: ManagedElementState = {
      dataDndHandle: managedElement.getAttribute(HANDLE_ATTR),
      dataDndItem: managedElement.getAttribute(ITEM_ATTR),
      draggable: managedElement.getAttribute('draggable'),
      role: managedElement.getAttribute('role'),
      tabIndex: managedElement.getAttribute('tabindex'),
      touchAction: managedElement.style.touchAction,
    };

    managedElements.set(managedElement, state);

    return state;
  };

  const restoreAttribute = (managedElement: HTMLElement, name: string, value: string | null): void => {
    if (value === null) {
      managedElement.removeAttribute(name);
    } else {
      managedElement.setAttribute(name, value);
    }
  };

  const syncItems = (items = getItems()): void => {
    items.forEach((el) => {
      const itemState = rememberElement(el);

      if (itemState.role === null) el.setAttribute('role', 'listitem');

      if (itemState.tabIndex === null) el.tabIndex = 0;

      if (handle !== undefined) {
        handleSelector &&
          el.querySelectorAll<HTMLElement>(handleSelector).forEach((handleEl) => {
            rememberElement(handleEl);
            handleEl.setAttribute(HANDLE_ATTR, '');
            handleEl.setAttribute('draggable', 'true');
            if (scopeState.touch) handleEl.style.touchAction = 'none';
          });
      } else {
        el.setAttribute('draggable', 'true');
        // A native mouse drag has no competing gesture to arbitrate; touch does. Without this,
        // a mobile browser can decide the very first bit of finger movement is a page
        // scroll/pan — a decision it makes independently of, and before, this library's own
        // Gesture activation-distance/`preventDefault()` logic ever runs — and hand the rest of the
        // gesture to native scrolling. Once that happens the item never receives the
        // `dragover` sequence needed to update the drop target, so the session ends up
        // committing back to wherever it started: indistinguishable from the drop "reverting".
        // `touch-action: none` opts the element out of every default touch gesture from
        // `pointerdown` onward, leaving the whole interaction to this library's own JS.
        if (scopeState.touch) el.style.touchAction = 'none';
      }
    });
  };

  const markItems = (): void => {
    const seenKeys = new Set<string>();

    // When an explicit items provider is given, use it directly; otherwise scan
    // the container's direct children for elements that have a key.
    const provided = options.items ? options.items() : (Array.from(element.children) as HTMLElement[]);
    const candidates = provided.filter((item) => item instanceof HTMLElement && item.parentElement === element);
    const keyed: HTMLElement[] = [];

    if (candidates.length !== provided.length) {
      warn('items returned an element that is not a direct child of the sortable container; it was ignored.');
    }

    for (const el of candidates) {
      try {
        const key = getKey(el);

        if (key) {
          if (seenKeys.has(key)) {
            warn(
              `getKey returned the duplicate key "${key}" for two sibling items — the duplicate item was excluded. Ensure getKey returns a unique value per item.`,
            );
            continue;
          }

          seenKeys.add(key);
          keyed.push(el);
        }
      } catch (err) {
        warn(
          `getKey threw for a child element — the item will not be sortable. Check your getKey implementation. ${String(err)}`,
        );
      }
    }

    cleanupItems();
    for (const el of keyed) {
      rememberElement(el);
      el.setAttribute(ITEM_ATTR, '');
    }
    syncItems(keyed);
  };

  const cleanupItems = (): void => {
    for (const [managedElement, state] of managedElements) {
      restoreAttribute(managedElement, HANDLE_ATTR, state.dataDndHandle);
      restoreAttribute(managedElement, ITEM_ATTR, state.dataDndItem);
      restoreAttribute(managedElement, 'draggable', state.draggable);
      restoreAttribute(managedElement, 'role', state.role);
      restoreAttribute(managedElement, 'tabindex', state.tabIndex);
      managedElement.style.touchAction = state.touchAction;
    }

    managedElements.clear();
  };

  const createPlaceholder = (source: HTMLElement): HTMLElement => {
    const p = document.createElement('div');

    p.className = placeholderClass;
    p.setAttribute('aria-hidden', 'true');

    if (axis === 'horizontal') {
      p.style.width = `${source.offsetWidth}px`;
    } else {
      p.style.height = `${source.offsetHeight}px`;
    }

    return p;
  };

  const handle_: ContainerHandle = {
    commitReorder: (event) =>
      notify(
        'onReorder',
        options.onReorder,
        Object.freeze({ after: immutableIds(event.after), before: immutableIds(event.before), item: event.item }),
      ),
    element,
    getOrderedIds,
    getOrderedItems: getItems,
    isDisabled: () => resolveDisabled(options.disabled),
    notifyBeforeReorder: (from, to) => notify('onBeforeReorder', options.onBeforeReorder, from, to),
    notifyDragEnd: (id, event) => notify('onDragEnd', options.onDragEnd, id, event),
    notifyDragStart: (id, event) => notify('onDragStart', options.onDragStart, id, event),
    notifyInteraction: (event) => notify('onInteraction', options.onInteraction, Object.freeze(event)),
    resolveTouchTarget: (target) => {
      if (resolveDisabled(options.disabled) || !element.contains(target)) return null;

      const item = target.closest<HTMLElement>(`[${ITEM_ATTR}]`);

      if (!item || !getItems().includes(item)) return null;

      if (handle === undefined) return item;
      if (!handleSelector) return null;

      const handleTarget = target.closest<HTMLElement>(handleSelector);

      return handleTarget && item.contains(handleTarget) ? handleTarget : null;
    },
  };

  const handleDragStart = (e: DragEvent): void => {
    if (scopeState.active) return;

    if (handle_.isDisabled()) return;

    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>(`[${ITEM_ATTR}]`);

    if (!item || !getItems().includes(item)) return;

    if (handle !== undefined) {
      const handleTarget = handleSelector ? target.closest(handleSelector) : null;
      if (!handleTarget || !item.contains(handleTarget)) return;
    }

    const originalParent = item.parentElement;

    if (!originalParent) return;

    const placeholder = createPlaceholder(item);
    const originalNextSibling = item.nextSibling;
    const activeId = getKey(item);

    // Snapshot only the source handle at drag start; targets are snapshotted lazily.
    const initialOrders = new Map<ContainerHandle, string[]>();

    initialOrders.set(handle_, handle_.getOrderedIds());
    item.setAttribute('data-dragging', '');
    originalParent.insertBefore(placeholder, originalNextSibling);

    const session: DragSession = {
      draggedEl: item,
      draggedId: activeId,
      hideFrame: null,
      initialOrders,
      originalDisplay: item.style.display,
      originalNextSibling,
      originalParent,
      placeholder,
      source: handle_,
      target: handle_,
    };

    if (!isTouchDragEvent(e) || e.__dndTouchPreview) scheduleHide(session);

    scopeState.active = session;

    if (e.dataTransfer) {
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', activeId);

        if (options.dragImage) {
          const preview =
            typeof options.dragImage === 'function' ? options.dragImage(activeId, item, e) : options.dragImage;
          const [offsetX, offsetY] = options.dragImageOffset ?? [0, 0];

          if (preview) e.dataTransfer.setDragImage(preview, offsetX, offsetY);
        }
      } catch (error) {
        warn(`drag preview setup failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    handle_.notifyDragStart(session.draggedId, e);
    handle_.notifyInteraction({
      index: handle_.getOrderedIds().indexOf(activeId),
      itemId: activeId,
      total: handle_.getOrderedIds().length,
      type: 'pickup',
    });
  };

  const handleDragOver = (e: DragEvent): void => {
    const session = scopeState.active;

    if (!session) return;

    if (session.source.isDisabled() || handle_.isDisabled()) return;

    e.preventDefault();
    maybeAutoScroll(e, element, axis, autoScrollOptions);

    // Lazily snapshot this handle's order the first time it becomes a target.
    snapshotOrder(session, handle_);

    const { draggedEl, placeholder } = session;
    const target = (e.target as HTMLElement).closest<HTMLElement>(`[${ITEM_ATTR}]`);

    if (target && !getItems().includes(target)) return;

    if (!target) {
      // Only append placeholder when it isn't already inside this container.
      // Moving it to the end on every over-empty-space event causes the
      // placeholder to oscillate between positions as the cursor moves.
      if (placeholder.parentElement !== element) {
        element.appendChild(placeholder);
      }

      session.target = handle_;

      return;
    }

    if (target === draggedEl || target === placeholder) return;

    const rect = target.getBoundingClientRect();
    const insertAfter =
      axis === 'vertical' ? e.clientY >= rect.top + rect.height / 2 : e.clientX >= rect.left + rect.width / 2;

    element.insertBefore(placeholder, insertAfter ? target.nextSibling : target);
    session.target = handle_;
  };

  const handleDrop = (e: DragEvent): void => {
    const session = scopeState.active;

    if (!session) return;

    if (session.source.isDisabled() || handle_.isDisabled()) return;

    e.preventDefault();
    // Record the drop target; the actual commit happens in handleDragEnd where
    // dataTransfer.dropEffect tells us whether the browser accepted the operation.
    session.target = handle_;
  };

  const handleDragEnd = (e: DragEvent): void => {
    if (scopeState.active?.source !== handle_) return;

    finishSession(scopeState, e, false);
  };

  const handleKeydown = (e: KeyboardEvent): void => {
    if (!keyboard || handle_.isDisabled()) return;

    const eventTarget = e.target as HTMLElement | null;
    const item = eventTarget?.closest<HTMLElement>(`[${ITEM_ATTR}]`);

    if (!eventTarget || !item || !getItems().includes(item)) return;

    const interactive = eventTarget.closest<HTMLElement>(
      'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"]',
    );
    const keyboardHandle = handleSelector ? eventTarget.closest<HTMLElement>(handleSelector) : null;

    if (interactive && (!keyboardHandle || !item.contains(keyboardHandle))) return;

    const items = getItems();
    const prevIndex = items.indexOf(item);
    const targetIndex = keyboardTargetIndex(items, item, e.key, axis);

    // null means unrecognized key or boundary — let the browser handle it (e.g. page scroll)
    if (targetIndex === null) return;

    const targetItem = items[targetIndex];
    if (!targetItem) return;

    const prevOrder = items.map(getKey);
    const reorderedItems = [...items];
    reorderedItems.splice(prevIndex, 1);
    reorderedItems.splice(targetIndex, 0, item);
    const newOrder = reorderedItems.map(getKey);
    const activeId = getKey(item);

    e.preventDefault();
    handle_.notifyBeforeReorder(immutableIds(prevOrder), immutableIds(newOrder));
    element.insertBefore(item, targetIndex > prevIndex ? targetItem.nextSibling : targetItem);
    item.focus();
    handle_.commitReorder({ after: newOrder, before: prevOrder, item: activeId });
    handle_.notifyInteraction({
      index: targetIndex,
      itemId: activeId,
      previousIndex: prevIndex,
      total: newOrder.length,
      type: 'move',
    });
  };

  markItems();

  let stopTouch: (() => void) | undefined;
  const disposable = createDisposable(() => {
    scopeState.disposables.delete(disposable.dispose);

    if (
      scopeState.active &&
      (scopeState.active.source === handle_ || scopeState.active.target === handle_) &&
      !scopeState.touch?.cancel()
    ) {
      finishSession(scopeState, new Event('dragend') as DragEvent, true);
    }

    stopTouch?.();
    scopeState.handles.delete(handle_);
    restoreAttribute(element, 'role', originalContainerRole);
    cleanupItems();
  });

  scopeState.handles.add(handle_);
  stopTouch = scopeState.touch?.register(element);

  if (originalContainerRole === null) element.setAttribute('role', 'list');

  element.addEventListener('dragstart', handleDragStart, { signal: disposable.disposalSignal });
  element.addEventListener('dragover', handleDragOver, { signal: disposable.disposalSignal });
  element.addEventListener('drop', handleDrop, { signal: disposable.disposalSignal });
  element.addEventListener('dragend', handleDragEnd, { signal: disposable.disposalSignal });
  element.addEventListener('keydown', handleKeydown, { signal: disposable.disposalSignal });

  // Register with scope so scope.dispose() can tear this down
  scopeState.disposables.add(disposable.dispose);

  return {
    get disposalSignal() {
      return disposable.disposalSignal;
    },
    dispose: disposable.dispose,
    get disposed() {
      return disposable.disposed;
    },
    get isDragging() {
      return scopeState.active?.source === handle_;
    },
    [Symbol.dispose]: disposable[Symbol.dispose],
    refresh: () => {
      markItems();
    },
  };
}

// ─── applyReorder ─────────────────────────────────────────────────────────────

/**
 * Applies a sorted key array to a backing data array.
 * Unknown keys are ignored; omitted items are appended and duplicate backing keys throw `DndError`.
 */
export function applyReorder<T>(items: readonly T[], ids: readonly string[], getKey: (item: T) => string): T[] {
  const byId = new Map<string, T>();

  for (const item of items) {
    const id = getKey(item);
    if (byId.has(id)) throw new DndError(`Duplicate item key: "${id}"`);
    byId.set(id, item);
  }
  const ordered: T[] = [];

  for (const id of ids) {
    if (!byId.has(id)) continue;

    const item = byId.get(id) as T;

    ordered.push(item);
    byId.delete(id);
  }

  for (const item of byId.values()) ordered.push(item);

  return ordered;
}

export { DndError, DndScopeError } from './errors.js';
export type { Disposable } from './types.js';
