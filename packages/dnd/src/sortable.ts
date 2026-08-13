import { warn } from './_dev';
import { createDisposable, resolveDisabled } from './_shared';
import { createScopeTouchController, type ScopeTouchController, type TouchInputOptions } from './_touch';
import { DndScopeError } from './errors';
import type { Disposable } from './types';

// ─── Branded scope ────────────────────────────────────────────────────────────

const SCOPE_BRAND = Symbol('SortableScope');

export interface SortableScope extends Disposable {
  /** `true` while any sortable in this scope is actively dragging. */
  readonly isDragging: boolean;
  /**
   * Calls the revert function registered for the most recent cross-container move.
   * A no-op when no move registered a revert function.
   */
  revert(): void;
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
 */
export interface ReorderEvent {
  /** The new ordered list of item keys after the reorder. */
  ids: string[];
  /**
   * Register a revert function that will be called when `sortable.revert()` is invoked.
   * Useful for rolling back optimistic UI updates on server error.
   * Only the most recent `setRevert` registration is retained — a new reorder overwrites it.
   *
   * @example
   * ```ts
   * onReorder: ({ ids, setRevert }) => {
   *   const prev = order;
   *   setOrder(ids);
   *   setRevert(() => setOrder(prev));
   * },
   * ```
   */
  setRevert(fn: () => void): void;
}

/** A single committed move between two containers in the same sortable scope. */
export interface SortableMoveEvent {
  /** Stable identity of the moved item. */
  readonly itemId: string;
  /** Registers a rollback for the most recent scope move. */
  setRevert(fn: () => void): void;
  /** Source container before the move. */
  readonly source: HTMLElement;
  /** Ordered source item IDs after the move. */
  readonly sourceIds: string[];
  /** Target container after the move. */
  readonly target: HTMLElement;
  /** Ordered target item IDs after the move. */
  readonly targetIds: string[];
}

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
  onBeforeReorder?: (from: string[], to: string[]) => void;
  /** Called when a drag ends (whether dropped or cancelled). */
  onDragEnd?: (id: string, event: DragEvent) => void;
  /** Called when the user starts dragging an item. */
  onDragStart?: (id: string, event: DragEvent) => void;
  /**
   * Called with a {@link ReorderEvent} after a successful reorder, only when the order changed.
   *
   * @example
   * ```ts
   * onReorder: ({ ids, setRevert }) => {
   *   const prev = order;
   *   setOrder(ids);
   *   setRevert(() => setOrder(prev));
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
   * Calls the revert function registered via `setRevert` in the last `onReorder` invocation (if any) and clears it.
   * A no-op when no revert function was registered or has already been consumed.
   *
   * Works for both drag-based and keyboard-based reorders.
   * Note: only the most recent reorder can be reverted; a new reorder overwrites the stored function.
   *
   * @example
   * ```ts
   * onReorder: ({ ids, setRevert }) => {
   *   const prev = order;
   *   setOrder(ids);
   *   setRevert(() => setOrder(prev));
   * },
   * // later, on server error:
   * sortable.revert();
   * ```
   */
  revert(): void;
  /**
   * Re-reads the container's children and reapplies `draggable`, ARIA roles,
   * and handle attributes. Call this after programmatically adding, removing,
   * or replacing items — e.g. after a framework render that replaces DOM nodes.
   *
   * Not needed when items are only reordered via drag or keyboard.
   */
  sync(): void;
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
  commitReorder: (orderedIds: string[]) => void;
  readonly element: HTMLElement;
  getOrderedIds: () => string[];
  isDisabled: () => boolean;
  notifyBeforeReorder: (from: string[], to: string[]) => void;
  notifyDragEnd: (id: string, event: DragEvent) => void;
  notifyDragStart: (id: string, event: DragEvent) => void;
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
  commitMove: (event: Omit<SortableMoveEvent, 'setRevert'>) => void;
  /** All sortables registered in this scope, kept for scope.dispose(). */
  disposables: Set<() => void>;
  handles: Set<ContainerHandle>;
  lastRevert: (() => void) | null;
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

  return state;
}

// ─── Option resolution ────────────────────────────────────────────────────────

function resolveAutoScrollOptions(
  autoScroll: boolean | AutoScrollOptions | undefined,
): ResolvedAutoScrollOptions | null {
  if (autoScroll === false) return null;

  if (autoScroll === true || autoScroll === undefined) return DEFAULT_AUTO_SCROLL;

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

// ─── Session commit / cancel ──────────────────────────────────────────────────

function cancelSession(scopeState: SortableScopeState, event: DragEvent): void {
  const session = scopeState.active;

  if (!session) return;

  restoreSessionElement(session);
  session.originalParent.insertBefore(session.draggedEl, session.originalNextSibling);
  session.placeholder.remove();
  scopeState.active = null;

  session.source.notifyDragEnd(session.draggedId, event);
}

function commitSession(scopeState: SortableScopeState, event: DragEvent): void {
  const session = scopeState.active;

  if (!session) return;

  const targetHandle = session.target;
  const targetElement = session.placeholder.parentElement;

  restoreSessionElement(session);

  if (targetHandle && scopeState.handles.has(targetHandle) && targetElement) {
    targetElement.insertBefore(session.draggedEl, session.placeholder);
  } else {
    session.originalParent.insertBefore(session.draggedEl, session.originalNextSibling);
  }

  session.placeholder.remove();
  scopeState.active = null;

  session.source.notifyDragEnd(session.draggedId, event);

  const changes: Array<{ after: string[]; before: string[]; handle: ContainerHandle }> = [];

  for (const [handle, before] of session.initialOrders) {
    if (!scopeState.handles.has(handle)) continue;

    const afterOrder = handle.getOrderedIds();

    if (hasOrderChanged(before, afterOrder)) {
      changes.push({ after: afterOrder, before, handle });
    }
  }

  for (const { after, before, handle } of changes) {
    handle.notifyBeforeReorder(before, after);
  }

  if (targetHandle && targetHandle !== session.source) {
    const sourceChange = changes.find((change) => change.handle === session.source);
    const targetChange = changes.find((change) => change.handle === targetHandle);

    if (sourceChange && targetChange) {
      scopeState.commitMove({
        itemId: session.draggedId,
        source: session.source.element,
        sourceIds: sourceChange.after,
        target: targetHandle.element,
        targetIds: targetChange.after,
      });
    }

    return;
  }

  for (const { after, handle } of changes) {
    handle.commitReorder(after);
  }
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

function applyKeyboardReorder(
  item: HTMLElement,
  element: HTMLElement,
  getItems: () => HTMLElement[],
  getOrderedIds: () => string[],
  key: string,
  axis: 'vertical' | 'horizontal',
): string[] | null {
  const items = getItems();
  const currentIndex = items.indexOf(item);

  if (currentIndex < 0) return null;

  const isForward = axis === 'vertical' ? key === 'ArrowDown' : key === 'ArrowRight';
  const isBackward = axis === 'vertical' ? key === 'ArrowUp' : key === 'ArrowLeft';
  let targetIndex: number;

  if (isForward) {
    targetIndex = Math.min(items.length - 1, currentIndex + 1);
  } else if (isBackward) {
    targetIndex = Math.max(0, currentIndex - 1);
  } else if (key === 'Home') {
    targetIndex = 0;
  } else if (key === 'End') {
    targetIndex = items.length - 1;
  } else {
    return null;
  }

  // Already at the boundary — return null so the caller does not call preventDefault
  // and the browser can handle the key (e.g. scrolling the page).
  if (targetIndex === currentIndex) return null;

  const targetItem = items[targetIndex];

  if (!targetItem) return null;

  element.insertBefore(item, targetIndex > currentIndex ? targetItem.nextSibling : targetItem);
  item.focus();

  return getOrderedIds();
}

// ─── createSortableScope ──────────────────────────────────────────────────────

/**
 * Create a shared scope for connected sortable containers.
 *
 * Items can be dragged between all sortables that share the same scope.
 * The scope exposes `isDragging` and `dispose()` — calling `dispose()` tears down
 * all member sortables at once.
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
      options.onMove?.({
        ...event,
        setRevert(fn): void {
          state.lastRevert = fn;
        },
      });
    },
    disposables: new Set(),
    handles: new Set(),
    lastRevert: null,
    touch: null,
  };
  const disposable = createDisposable(() => {
    state.touch?.dispose();

    // Dispose all registered sortables (each dispose() call is idempotent)
    for (const disposeFn of state.disposables) {
      disposeFn();
    }
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
    revert() {
      state.lastRevert?.();
      state.lastRevert = null;
    },
    [SCOPE_BRAND]: true as const,
    [Symbol.dispose]: disposable[Symbol.dispose],
  } as SortableScope;

  sortableScopeStates.set(scope, state);

  if (options.touch) {
    state.touch = createScopeTouchController(options.touch === true ? {} : options.touch, (target) => {
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
 * import { createSortable } from '@vielzeug/dnd';
 *
 * using sortable = createSortable({
 *   element: listEl,
 *   getKey: (el) => el.dataset.id!,
 *   onReorder: ({ ids, setRevert }) => {
 *     const prev = order;
 *     setOrder(ids);
 *     setRevert(() => setOrder(prev));
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
  const autoScrollOptions = resolveAutoScrollOptions(autoScroll);
  const scopeState = getSortableScopeState(scope);

  if (handle !== undefined && handle.trim() === '') {
    warn(
      'handle option is an empty string — no handle elements will be found. Provide a valid CSS selector or omit the option.',
    );
  }

  const getItems = (): HTMLElement[] =>
    Array.from(element.children).filter((c) => (c as HTMLElement).hasAttribute(ITEM_ATTR)) as HTMLElement[];

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

  const syncItems = (): void => {
    getItems().forEach((el) => {
      const itemState = rememberElement(el);

      if (itemState.role === null) el.setAttribute('role', 'listitem');

      if (itemState.tabIndex === null) el.tabIndex = 0;

      if (handle) {
        el.querySelectorAll<HTMLElement>(handle).forEach((handleEl) => {
          rememberElement(handleEl);
          handleEl.setAttribute(HANDLE_ATTR, '');
          handleEl.setAttribute('draggable', 'true');
          handleEl.style.touchAction = 'none';
        });
      } else {
        el.setAttribute('draggable', 'true');
        // A native mouse drag has no competing gesture to arbitrate; touch does. Without this,
        // a mobile browser can decide the very first bit of finger movement is a page
        // scroll/pan — a decision it makes independently of, and before, this library's own
        // touch-shim threshold/`preventDefault()` logic ever runs — and hand the rest of the
        // gesture to native scrolling. Once that happens the item never receives the
        // `dragover` sequence needed to update the drop target, so the session ends up
        // committing back to wherever it started: indistinguishable from the drop "reverting".
        // `touch-action: none` opts the element out of every default touch gesture from
        // `touchstart` onward, leaving the whole interaction to this library's own JS.
        el.style.touchAction = 'none';
      }
    });
  };

  const markItems = (): void => {
    const seenKeys = new Set<string>();

    // Mark all children that have a key as sortable items
    Array.from(element.children).forEach((child) => {
      const el = child as HTMLElement;

      try {
        const key = getKey(el);

        if (key) {
          rememberElement(el);

          if (seenKeys.has(key)) {
            warn(
              `getKey returned the duplicate key "${key}" for two sibling items — onReorder's ids and applyReorder may become inconsistent. Ensure getKey returns a unique value per item.`,
            );
          } else {
            seenKeys.add(key);
          }

          el.setAttribute(ITEM_ATTR, '');
        }
      } catch (err) {
        warn(
          `getKey threw for a child element — the item will not be sortable. Check your getKey implementation. ${String(err)}`,
        );
      }
    });

    syncItems();
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

  let lastRevert: (() => void) | null = null;

  const handle_: ContainerHandle = {
    commitReorder: (orderedIds) => {
      if (!options.onReorder) return;

      const event: ReorderEvent = {
        ids: orderedIds,
        setRevert(fn) {
          lastRevert = fn;
        },
      };

      options.onReorder(event);
    },
    element,
    getOrderedIds,
    isDisabled: () => resolveDisabled(options.disabled),
    notifyBeforeReorder: (from, to) => options.onBeforeReorder?.(from, to),
    notifyDragEnd: (id, event) => options.onDragEnd?.(id, event),
    notifyDragStart: (id, event) => options.onDragStart?.(id, event),
    resolveTouchTarget: (target) => {
      if (resolveDisabled(options.disabled) || !element.contains(target)) return null;

      const item = target.closest<HTMLElement>(`[${ITEM_ATTR}]`);

      if (!item || !element.contains(item)) return null;

      if (!handle) return item;

      const handleTarget = target.closest<HTMLElement>(handle);

      return handleTarget && item.contains(handleTarget) ? handleTarget : null;
    },
  };

  scopeState.handles.add(handle_);

  const handleDragStart = (e: DragEvent): void => {
    if (scopeState.active) return;

    if (handle_.isDisabled()) return;

    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>(`[${ITEM_ATTR}]`);

    if (!item) return;

    if (handle && !target.closest(handle)) return;

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
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', activeId);

      if (options.dragImage) {
        const preview =
          typeof options.dragImage === 'function' ? options.dragImage(activeId, item, e) : options.dragImage;
        const [offsetX, offsetY] = options.dragImageOffset ?? [0, 0];

        if (preview) e.dataTransfer.setDragImage(preview, offsetX, offsetY);
      }
    }

    handle_.notifyDragStart(session.draggedId, e);
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

    const tagName = (e.target as HTMLElement | null)?.tagName;

    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

    const item = (e.target as HTMLElement).closest<HTMLElement>(`[${ITEM_ATTR}]`);

    if (!item || !element.contains(item)) return;

    const prevOrder = getOrderedIds();
    const newOrder = applyKeyboardReorder(item, element, getItems, getOrderedIds, e.key, axis);

    // null means unrecognized key or boundary — let the browser handle it (e.g. page scroll)
    if (newOrder === null) return;

    e.preventDefault();
    handle_.notifyBeforeReorder(prevOrder, newOrder);
    handle_.commitReorder(newOrder);
  };

  markItems();

  const disposable = createDisposable(() => {
    scopeState.disposables.delete(disposable.dispose);

    if (scopeState.active && (scopeState.active.source === handle_ || scopeState.active.target === handle_)) {
      finishSession(scopeState, new Event('dragend') as DragEvent, true);
    }

    scopeState.handles.delete(handle_);
    restoreAttribute(element, 'role', originalContainerRole);
    cleanupItems();
  });

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
    revert: () => {
      lastRevert?.();
      lastRevert = null;
    },
    [Symbol.dispose]: disposable[Symbol.dispose],
    sync: () => {
      markItems();
    },
  };
}

// ─── applyReorder ─────────────────────────────────────────────────────────────

/**
 * Applies a sorted key array to a backing data array.
 * Unknown keys are ignored; items not present in `ids` are appended in original order.
 */
export function applyReorder<T>(items: T[], ids: string[], getKey: (item: T) => string): T[] {
  const byId = new Map(items.map((item) => [getKey(item), item] as const));
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
