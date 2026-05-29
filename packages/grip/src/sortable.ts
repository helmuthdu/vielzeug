import { type Disposable, resolveDisabled } from './shared';

// ─── Branded scope ────────────────────────────────────────────────────────────

const SCOPE_BRAND = Symbol('SortableScope');

export interface SortableScope {
  readonly [SCOPE_BRAND]: true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoScrollOptions {
  /** Distance in pixels from an edge that triggers auto-scroll. @default 32 */
  edgeThreshold?: number;
  /** Pixels scrolled per dragover frame while near an edge. @default 18 */
  speed?: number;
  /** Scroll the sortable container while dragging near its edges. @default true */
  container?: boolean;
  /** Scroll the viewport while dragging near the window edges. @default false */
  viewport?: boolean;
}

export interface SortableOptions {
  /** Container element whose direct-child items are sortable. */
  element: HTMLElement;
  /** Shared scope for connected sortable containers. Containers only exchange items within the same scope. */
  scope?: SortableScope;
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
   * The attribute that stores each item's identity.
   * @default 'data-sort-id'
   */
  itemAttribute?: string;
  /** Sorting axis used to compute insertion position. @default 'vertical' */
  axis?: 'vertical' | 'horizontal';
  /** Auto-scrolls the container (and viewport) near edges while dragging. @default true */
  autoScroll?: boolean | AutoScrollOptions;
  /** Optional custom drag preview element. */
  dragImage?: HTMLElement | ((id: string, item: HTMLElement, event: DragEvent) => HTMLElement | null | undefined);
  /** CSS class applied to the placeholder element. @default 'grip-placeholder' */
  placeholderClass?: string;
  /** Called with the new order of item ids after a successful drag, only when the order changed. */
  onReorder?: (orderedIds: string[]) => void;
  /**
   * When truthy, drag interactions are ignored.
   * Accepts a function for reactive framework integration.
   * @example disabled={() => isReadOnly.value}
   */
  disabled?: boolean | (() => boolean);
  /** Called when the user starts dragging an item. */
  onDragStart?: (id: string, event: DragEvent) => void;
  /** Called when a drag ends (whether dropped or cancelled). */
  onDragEnd?: (id: string, event: DragEvent) => void;
  /**
   * Hotspot offset `[x, y]` passed to `setDragImage`.
   * Controls which point of the preview image follows the cursor.
   * @default [0, 0]
   */
  dragImageOffset?: [number, number];
}

export interface Sortable extends Disposable {
  readonly isDragging: boolean;
  sync(): void;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface ResolvedAutoScrollOptions {
  container: boolean;
  edgeThreshold: number;
  speed: number;
  viewport: boolean;
}

interface SortableController {
  element: HTMLElement;
  getOrderedIds: () => string[];
  isDisabled: () => boolean;
  notifyDragEnd: (id: string, event: DragEvent) => void;
  notifyDragStart: (id: string, event: DragEvent) => void;
  notifyReorder: (orderedIds: string[]) => void;
}

interface ActiveSortableDrag {
  draggedEl: HTMLElement;
  draggedId: string;
  hideFrame: number | null;
  /**
   * Order snapshots captured lazily: snapshot is taken the first time a controller
   * becomes the active target (and always for the source at drag start).
   */
  initialOrders: Map<SortableController, string[]>;
  originalNextSibling: ChildNode | null;
  originalDisplay: string;
  originalParent: HTMLElement;
  placeholder: HTMLElement;
  source: SortableController;
  target: SortableController | null;
}

interface SortableScopeState {
  active: ActiveSortableDrag | null;
  controllers: Set<SortableController>;
}

// ─── Internal constants ───────────────────────────────────────────────────────

const HANDLE_ATTR = 'data-grip-handle';
const ITEM_ATTR = 'data-grip-item';
const sortableScopeStates = new WeakMap<SortableScope, SortableScopeState>();
const DEFAULT_AUTO_SCROLL: ResolvedAutoScrollOptions = {
  container: true,
  edgeThreshold: 32,
  speed: 18,
  viewport: false,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** The scope state is always pre-registered by createSortableScope(), so this is a direct lookup. */
function getSortableScopeState(scope: SortableScope): SortableScopeState {
  return sortableScopeStates.get(scope)!;
}

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

function hasOrderChanged(before: string[], after: string[]): boolean {
  return after.length !== before.length || after.some((id, index) => id !== before[index]);
}

function restoreDraggedElement(active: ActiveSortableDrag): void {
  if (active.hideFrame !== null) {
    cancelAnimationFrame(active.hideFrame);
    active.hideFrame = null;
  }

  active.draggedEl.style.display = active.originalDisplay;
  active.draggedEl.removeAttribute('data-dragging');
}

/**
 * Snapshot a controller's current order if not already recorded.
 * Call this when a controller first becomes an active target so we only capture
 * lists that actually participate in the drag.
 */
function snapshotOrder(active: ActiveSortableDrag, controller: SortableController): void {
  if (!active.initialOrders.has(controller)) {
    active.initialOrders.set(controller, controller.getOrderedIds());
  }
}

function cancelActiveDrag(scope: SortableScopeState, event: DragEvent): void {
  const active = scope.active;

  if (!active) return;

  restoreDraggedElement(active);
  active.originalParent.insertBefore(active.draggedEl, active.originalNextSibling);
  active.placeholder.remove();
  scope.active = null;

  active.source.notifyDragEnd(active.draggedId, event);
}

function commitActiveDrag(scope: SortableScopeState, event: DragEvent): void {
  const active = scope.active;

  if (!active) return;

  const targetController = active.target;
  const targetElement = active.placeholder.parentElement;

  restoreDraggedElement(active);

  if (targetController && scope.controllers.has(targetController) && targetElement) {
    targetElement.insertBefore(active.draggedEl, active.placeholder);
  } else {
    active.originalParent.insertBefore(active.draggedEl, active.originalNextSibling);
  }

  active.placeholder.remove();
  scope.active = null;

  active.source.notifyDragEnd(active.draggedId, event);

  for (const [controller, beforeOrder] of active.initialOrders) {
    if (!scope.controllers.has(controller)) continue;

    const afterOrder = controller.getOrderedIds();

    if (!hasOrderChanged(beforeOrder, afterOrder)) continue;

    controller.notifyReorder(afterOrder);
  }
}

function finishActiveDrag(scope: SortableScopeState, event: DragEvent, forceCancel: boolean): void {
  if (!scope.active) return;

  if (
    forceCancel ||
    !event.dataTransfer ||
    event.dataTransfer.dropEffect === 'none' ||
    !scope.active.target ||
    !scope.controllers.has(scope.active.target) ||
    scope.active.source.isDisabled() ||
    scope.active.target.isDisabled()
  ) {
    cancelActiveDrag(scope, event);
  } else {
    commitActiveDrag(scope, event);
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

function canReceiveActiveDrag(scope: SortableScopeState, controller: SortableController): boolean {
  const active = scope.active;

  if (!active) return false;

  return !active.source.isDisabled() && !controller.isDisabled();
}

function applyKeyboardReorder(
  item: HTMLElement,
  element: HTMLElement,
  getItems: () => HTMLElement[],
  getOrderedIds: () => string[],
  key: string,
  axis: 'vertical' | 'horizontal',
  onReorder?: (orderedIds: string[]) => void,
): boolean {
  const items = getItems();
  const currentIndex = items.indexOf(item);

  if (currentIndex < 0) return false;

  const prevOrder = getOrderedIds();
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
    return false;
  }

  if (targetIndex === currentIndex) return true;

  const targetItem = items[targetIndex];

  if (!targetItem) return false;

  if (targetIndex > currentIndex) {
    element.insertBefore(item, targetItem.nextSibling);
  } else {
    element.insertBefore(item, targetItem);
  }

  item.focus();

  const nextOrder = getOrderedIds();

  if (hasOrderChanged(prevOrder, nextOrder)) {
    onReorder?.(nextOrder);
  }

  return true;
}

function clearHandleAttributes(element: HTMLElement): void {
  element.querySelectorAll<HTMLElement>(`[${HANDLE_ATTR}]`).forEach((handleEl) => {
    handleEl.removeAttribute(HANDLE_ATTR);
    handleEl.removeAttribute('draggable');
  });
}

// ─── createSortableScope ──────────────────────────────────────────────────────

export function createSortableScope(): SortableScope {
  const scope = { [SCOPE_BRAND]: true as const } as SortableScope;

  sortableScopeStates.set(scope, { active: null, controllers: new Set() });

  return scope;
}

// ─── createSortable ───────────────────────────────────────────────────────────

/**
 * Makes a list of items sortable via native HTML drag interactions.
 *
 * Each direct child of `element` must carry the identity attribute
 * (`data-sort-id` by default, configurable via `itemAttribute`).
 * `createSortable` sets `draggable="true"` on qualifying children automatically.
 *
 * Style the drop indicator by targeting `.grip-placeholder` in your CSS.
 * Supports keyboard reordering (arrow keys, Home/End) and auto-scrolling near edges.
 *
 * @example
 * ```ts
 * import { createSortable } from '@vielzeug/grip';
 *
 * using sortable = createSortable({
 *   element: listEl,
 *   onReorder: (ids) => { reorderItems(ids); },
 * });
 * ```
 */
export function createSortable(options: SortableOptions): Sortable {
  const {
    autoScroll = true,
    axis = 'vertical',
    element,
    handle,
    itemAttribute = 'data-sort-id',
    keyboard = true,
    placeholderClass = 'grip-placeholder',
    scope = createSortableScope(),
  } = options;
  const autoScrollOptions = resolveAutoScrollOptions(autoScroll);
  const sortableScope = getSortableScopeState(scope);

  const getItems = (): HTMLElement[] =>
    Array.from(element.children).filter((c) => (c as HTMLElement).hasAttribute(itemAttribute)) as HTMLElement[];

  const getOrderedIds = (): string[] => getItems().map((el) => el.getAttribute(itemAttribute)!);

  const getId = (el: HTMLElement): string => el.getAttribute(itemAttribute) ?? '';

  const syncItems = (): void => {
    clearHandleAttributes(element);

    getItems().forEach((el) => {
      el.setAttribute(ITEM_ATTR, '');
      el.setAttribute('role', 'listitem');
      el.tabIndex = 0;

      if (handle) {
        el.removeAttribute('draggable');
        el.querySelectorAll<HTMLElement>(handle).forEach((handleEl) => {
          handleEl.setAttribute(HANDLE_ATTR, '');
          handleEl.setAttribute('draggable', 'true');
        });
      } else {
        el.setAttribute('draggable', 'true');
      }
    });
  };

  const cleanupItems = (): void => {
    clearHandleAttributes(element);

    element.querySelectorAll<HTMLElement>(`[${ITEM_ATTR}]`).forEach((item) => {
      item.removeAttribute(ITEM_ATTR);
      item.removeAttribute('draggable');
      item.removeAttribute('role');
      item.removeAttribute('tabindex');
    });
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

  const controller: SortableController = {
    element,
    getOrderedIds,
    isDisabled: () => resolveDisabled(options.disabled),
    notifyDragEnd: (id, event) => options.onDragEnd?.(id, event),
    notifyDragStart: (id, event) => options.onDragStart?.(id, event),
    notifyReorder: (orderedIds) => options.onReorder?.(orderedIds),
  };

  sortableScope.controllers.add(controller);

  const handleDragStart = (e: DragEvent): void => {
    if (sortableScope.active) return;

    if (controller.isDisabled()) return;

    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>(`[${itemAttribute}]`);

    if (!item) return;

    if (handle && !target.closest(handle)) return;

    const originalParent = item.parentElement;

    if (!originalParent) return;

    const placeholder = createPlaceholder(item);
    const originalNextSibling = item.nextSibling;
    const activeId = getId(item);

    // Snapshot only the source controller at drag start; targets are snapshotted lazily.
    const initialOrders = new Map<SortableController, string[]>();

    initialOrders.set(controller, controller.getOrderedIds());
    item.setAttribute('data-dragging', '');
    originalParent.insertBefore(placeholder, originalNextSibling);

    sortableScope.active = {
      draggedEl: item,
      draggedId: activeId,
      hideFrame:
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(() => {
              if (sortableScope.active?.draggedEl !== item) return;

              item.style.display = 'none';

              if (sortableScope.active) sortableScope.active.hideFrame = null;
            })
          : null,
      initialOrders,
      originalDisplay: item.style.display,
      originalNextSibling,
      originalParent,
      placeholder,
      source: controller,
      target: controller,
    };

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

    controller.notifyDragStart(sortableScope.active.draggedId, e);
  };

  const handleDragOver = (e: DragEvent): void => {
    if (!canReceiveActiveDrag(sortableScope, controller)) return;

    // Re-check per frame: disabled may change reactively after a drag entered.
    if (controller.isDisabled()) return;

    e.preventDefault();
    maybeAutoScroll(e, element, axis, autoScrollOptions);

    const active = sortableScope.active;

    if (!active) return;

    // Lazily snapshot this controller's order the first time it becomes a target.
    snapshotOrder(active, controller);

    const { draggedEl, placeholder } = active;

    const target = (e.target as HTMLElement).closest<HTMLElement>(`[${itemAttribute}]`);

    if (!target) {
      if (placeholder.parentElement !== element || placeholder.nextSibling !== null) {
        element.appendChild(placeholder);
      }

      active.target = controller;

      return;
    }

    if (target === draggedEl || target === placeholder) return;

    const rect = target.getBoundingClientRect();
    const insertAfter =
      axis === 'vertical' ? e.clientY >= rect.top + rect.height / 2 : e.clientX >= rect.left + rect.width / 2;

    element.insertBefore(placeholder, insertAfter ? target.nextSibling : target);
    active.target = controller;
  };

  const handleDrop = (e: DragEvent): void => {
    if (!canReceiveActiveDrag(sortableScope, controller) || controller.isDisabled()) return;

    e.preventDefault();

    if (sortableScope.active) sortableScope.active.target = controller;
  };

  const handleDragEnd = (e: DragEvent): void => {
    if (sortableScope.active?.source !== controller) return;

    finishActiveDrag(sortableScope, e, false);
  };

  const handleKeydown = (e: KeyboardEvent): void => {
    if (!keyboard || controller.isDisabled()) return;

    const tagName = (e.target as HTMLElement | null)?.tagName;

    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

    const item = (e.target as HTMLElement).closest<HTMLElement>(`[${itemAttribute}]`);

    if (!item || !element.contains(item)) return;

    const changed = applyKeyboardReorder(item, element, getItems, getOrderedIds, e.key, axis, options.onReorder);

    if (!changed) return;

    e.preventDefault();
  };

  syncItems();

  element.setAttribute('role', 'list');
  element.addEventListener('dragstart', handleDragStart);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('drop', handleDrop);
  element.addEventListener('dragend', handleDragEnd);
  element.addEventListener('keydown', handleKeydown);

  const destroy = (): void => {
    if (
      sortableScope.active &&
      (sortableScope.active.source === controller || sortableScope.active.target === controller)
    ) {
      finishActiveDrag(sortableScope, new Event('dragend') as DragEvent, true);
    }

    sortableScope.controllers.delete(controller);
    element.removeEventListener('dragstart', handleDragStart);
    element.removeEventListener('dragover', handleDragOver);
    element.removeEventListener('drop', handleDrop);
    element.removeEventListener('dragend', handleDragEnd);
    element.removeEventListener('keydown', handleKeydown);

    element.removeAttribute('role');
    cleanupItems();
  };

  return {
    destroy,
    get isDragging() {
      return sortableScope.active?.source === controller;
    },
    [Symbol.dispose]: destroy,
    sync: syncItems,
  };
}

// ─── applyReorder ─────────────────────────────────────────────────────────────

/**
 * Applies a sortable id order to a data array.
 * Unknown ids are ignored; items not present in `ids` are appended in original order.
 */
export function applyReorder<T>(items: T[], ids: string[], getId: (item: T) => string): T[] {
  const byId = new Map(items.map((item) => [getId(item), item] as const));
  const ordered: T[] = [];

  for (const id of ids) {
    const item = byId.get(id);

    if (!item) continue;

    ordered.push(item);
    byId.delete(id);
  }

  for (const item of items) {
    if (byId.has(getId(item))) ordered.push(item);
  }

  return ordered;
}
