/**
 * @vielzeug/dragit — Drag-and-drop primitives for the DOM.
 *
 * Framework-agnostic. Wraps the HTML Drag & Drop API with:
 *   - Counter-based `drag-over` state (not lost on child entry/exit)
 *   - File type / MIME filtering with pre-validation via `dataTransfer.items`
 */

// ─── Shared helper ────────────────────────────────────────────────────────────

function resolveDisabled(disabled: boolean | (() => boolean) | undefined): boolean {
  if (disabled === undefined) return false;

  return typeof disabled === 'function' ? disabled() : disabled;
}

function asDisposable(destroy: () => void): Disposable {
  return {
    destroy,
    [Symbol.dispose]() {
      destroy();
    },
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DropZoneOptions {
  /** The element to attach drag listeners to. */
  element: HTMLElement;
  /**
   * Accepted file types. Each entry may be:
   *   - A MIME type:            'image/png'
   *   - A MIME wildcard:        'image/*'
   *   - A file extension:       '.pdf'
   *
   * When empty the zone accepts everything.
   */
  accept?: string[] | (() => string[]);
  /**
   * When truthy, all drag events are ignored and hover state does not change.
   * Accepts a function for reactive framework integration.
   * @example disabled={() => isReadOnly.value}
   */
  disabled?: boolean | (() => boolean);
  /**
   * The `dropEffect` to set on `dataTransfer` during `dragover`.
   * @default 'copy'
   */
  dropEffect?: DataTransfer['dropEffect'];
  /** Called when files are dropped. Receives accepted files only. */
  onDrop?: (files: File[], event: DragEvent) => void;
  /** Called when dropped files are rejected by the `accept` filter. */
  onDropRejected?: (files: File[], event: DragEvent) => void;
  /**
   * Called whenever hover state toggles.
   * Use this for drag-over styling.
   */
  onHoverChange?: (hovered: boolean) => void;
}

export interface Disposable {
  destroy(): void;
  [Symbol.dispose](): void;
}

export interface DropZone extends Disposable {
  /** Whether the pointer is currently dragging over the zone. */
  readonly hovered: boolean;
  /** Accepted files from the last drop. */
  readonly files: readonly File[];
  /** Rejected files from the last drop. */
  readonly rejected: readonly File[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesAccept(file: File, accept: string[]): boolean {
  if (!accept.length) return true;

  return accept.some((pattern) => {
    const p = pattern.trim();

    if (p.startsWith('.')) return file.name.toLowerCase().endsWith(p.toLowerCase());

    if (p.endsWith('/*')) return file.type.startsWith(p.slice(0, -1));

    return file.type === p;
  });
}

function resolveAccept(accept: string[] | (() => string[]) | undefined): string[] {
  if (accept === undefined) return [];

  return typeof accept === 'function' ? accept() : accept;
}

/**
 * DataTransferItem does not expose file names, so extension patterns (for example
 * `.pdf`) cannot be validated during drag-over. We treat these as a permissive
 * pre-check and perform exact filtering in `handleDrop` when `File` objects exist.
 */
function itemsMatchAccept(items: DataTransferItemList, accept: string[]): boolean {
  if (!accept.length) return true;

  return Array.from(items).some(
    (item) =>
      item.kind === 'file' &&
      accept.some((pattern) => {
        const p = pattern.trim();

        if (p.endsWith('/*')) return item.type.startsWith(p.slice(0, -1));

        if (p.startsWith('.')) return true; // extension cannot be checked from DataTransferItem

        return item.type === p;
      }),
  );
}

// ─── createDropZone ───────────────────────────────────────────────────────────

/**
 * Attach drag-and-drop behaviour to a DOM element.
 *
 * @example
 * ```ts
 * import { createDropZone } from '@vielzeug/dragit';
 *
 * using zone = createDropZone({
 *   element: dropZoneEl,
 *   accept: ['image/*', '.pdf'],
 *   onDrop: (files) => { console.log('Dropped:', files); },
 *   onHoverChange: (hovered) => {
 *     dropZoneEl.classList.toggle('drag-over', hovered);
 *   },
 * });
 * ```
 */
export function createDropZone(options: DropZoneOptions): DropZone {
  const { accept, disabled, dropEffect = 'copy', element, onDrop, onDropRejected, onHoverChange } = options;

  let dragCounter = 0;
  let files: File[] = [];
  let rejected: File[] = [];

  const isRejectedByFilter = (e: DragEvent): boolean => {
    const acceptedPatterns = resolveAccept(accept);

    if (!acceptedPatterns.length) return false;

    const items = e.dataTransfer?.items;

    return !!items?.length && !itemsMatchAccept(items, acceptedPatterns);
  };

  const setDepth = (next: number): void => {
    const wasHovered = dragCounter > 0;

    dragCounter = Math.max(0, next);

    const hovered = dragCounter > 0;

    if (hovered !== wasHovered) onHoverChange?.(hovered);
  };

  const resetHoverState = (): void => {
    setDepth(0);
  };

  const handleDragEnter = (e: DragEvent): void => {
    e.preventDefault();

    if (resolveDisabled(disabled)) return;

    if (isRejectedByFilter(e)) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';

      return;
    }

    setDepth(dragCounter + 1);
  };

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();

    if (resolveDisabled(disabled)) return;

    if (isRejectedByFilter(e)) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';

      return;
    }

    if (e.dataTransfer) e.dataTransfer.dropEffect = dropEffect;
  };

  const handleDragLeave = (_e: DragEvent): void => {
    if (resolveDisabled(disabled)) return;

    setDepth(dragCounter - 1);
  };

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    resetHoverState();

    if (resolveDisabled(disabled)) return;

    const raw = e.dataTransfer?.files;

    if (!raw) return;

    const acceptedFiles: File[] = [];
    const rejectedFiles: File[] = [];
    const acceptedPatterns = resolveAccept(accept);

    for (const f of Array.from(raw)) {
      (matchesAccept(f, acceptedPatterns) ? acceptedFiles : rejectedFiles).push(f);
    }

    const nextFiles = acceptedFiles;
    const nextRejected = rejectedFiles;

    files = nextFiles;
    rejected = nextRejected;

    if (nextFiles.length > 0) onDrop?.(nextFiles, e);

    if (nextRejected.length > 0) onDropRejected?.(nextRejected, e);
  };

  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);

  window.addEventListener('dragend', resetHoverState);
  window.addEventListener('drop', resetHoverState);

  return {
    ...asDisposable(() => {
      element.removeEventListener('dragenter', handleDragEnter);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragend', resetHoverState);
      window.removeEventListener('drop', resetHoverState);
      resetHoverState();
      files = [];
      rejected = [];
    }),
    get files() {
      return files;
    },
    get hovered() {
      return dragCounter > 0;
    },
    get rejected() {
      return rejected;
    },
  };
}

// ─── createSortable ───────────────────────────────────────────────────────────

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
  /** CSS class applied to the placeholder element. @default 'dragit-placeholder' */
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
}

export interface Sortable extends Disposable {
  readonly isDragging: boolean;
  sync(): void;
}

export interface SortableScope {}

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

interface SortableController {
  element: HTMLElement;
  getOrderedIds: () => string[];
  isDisabled: () => boolean;
  notifyDragEnd: (id: string, event: DragEvent) => void;
  notifyDragStart: (id: string, event: DragEvent) => void;
  notifyReorder: (orderedIds: string[]) => void;
}

interface SortableScopeState {
  active: ActiveSortableDrag | null;
  controllers: Set<SortableController>;
}

interface ActiveSortableDrag {
  draggedEl: HTMLElement;
  draggedId: string;
  hideFrame: number | null;
  initialOrders: Map<SortableController, string[]>;
  originalNextSibling: ChildNode | null;
  originalDisplay: string;
  originalParent: HTMLElement;
  placeholder: HTMLElement;
  source: SortableController;
  target: SortableController | null;
}

const HANDLE_ATTR = 'data-dragit-handle';
const ITEM_ATTR = 'data-dragit-item';
const sortableScopeStates = new WeakMap<SortableScope, SortableScopeState>();

interface ResolvedAutoScrollOptions {
  container: boolean;
  edgeThreshold: number;
  speed: number;
  viewport: boolean;
}

function createSortableScopeState(): SortableScopeState {
  return {
    active: null,
    controllers: new Set(),
  };
}

function getSortableScopeState(scope: SortableScope): SortableScopeState {
  const existing = sortableScopeStates.get(scope);

  if (existing) return existing;

  const state = createSortableScopeState();

  sortableScopeStates.set(scope, state);

  return state;
}

export function createSortableScope(): SortableScope {
  const scope: SortableScope = {};

  sortableScopeStates.set(scope, createSortableScopeState());

  return scope;
}

function resolveAutoScrollOptions(autoScroll: boolean | AutoScrollOptions | undefined): ResolvedAutoScrollOptions | null {
  if (autoScroll === false) return null;

  if (autoScroll === true || autoScroll === undefined) {
    return {
      container: true,
      edgeThreshold: 32,
      speed: 18,
      viewport: false,
    };
  }

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

function finishActiveDrag(scope: SortableScopeState, event: DragEvent, forceCancel = false): void {
  const active = scope.active;

  if (!active) return;

  const targetController = active.target;
  const targetElement = active.placeholder.parentElement;
  const canCommit =
    !forceCancel &&
    !!event.dataTransfer &&
    event.dataTransfer.dropEffect !== 'none' &&
    !!targetController &&
    scope.controllers.has(targetController) &&
    !active.source.isDisabled() &&
    !targetController.isDisabled() &&
    !!targetElement;

  restoreDraggedElement(active);

  if (canCommit && targetElement) {
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

/**
 * Makes a list of items sortable via native HTML drag interactions.
 *
 * Each direct child of `element` must carry the identity attribute
 * (`data-sort-id` by default, configurable via `itemAttribute`).
 * `createSortable` sets `draggable="true"` on qualifying children automatically.
 *
 * Style the drop indicator by targeting `.dragit-placeholder` in your CSS.
 *
 * @example
 * ```ts
 * import { createSortable } from '@vielzeug/dragit';
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
    placeholderClass = 'dragit-placeholder',
    scope = createSortableScope(),
  } = options;
  const autoScrollOptions = resolveAutoScrollOptions(autoScroll);
  const sortableScope = getSortableScopeState(scope);

  const getItems = (): HTMLElement[] =>
    Array.from(element.children).filter((c) => (c as HTMLElement).hasAttribute(itemAttribute)) as HTMLElement[];

  const getOrderedIds = (): string[] => getItems().map((el) => el.getAttribute(itemAttribute)!);

  const getId = (el: HTMLElement): string => el.getAttribute(itemAttribute) ?? '';

  const syncItems = (): void => {
    element.querySelectorAll<HTMLElement>(`[${HANDLE_ATTR}]`).forEach((handleEl) => {
      handleEl.removeAttribute(HANDLE_ATTR);
      handleEl.removeAttribute('draggable');
    });

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
    element.querySelectorAll<HTMLElement>(`[${HANDLE_ATTR}]`).forEach((handleEl) => {
      handleEl.removeAttribute(HANDLE_ATTR);
      handleEl.removeAttribute('draggable');
    });

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
    notifyDragEnd: (id, event) => {
      options.onDragEnd?.(id, event);
    },
    notifyDragStart: (id, event) => {
      options.onDragStart?.(id, event);
    },
    notifyReorder: (orderedIds) => {
      options.onReorder?.(orderedIds);
    },
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
    const initialOrders = new Map<SortableController, string[]>();
    const originalNextSibling = item.nextSibling;

    for (const peer of sortableScope.controllers) {
      initialOrders.set(peer, peer.getOrderedIds());
    }

    item.setAttribute('data-dragging', '');
    originalParent.insertBefore(placeholder, originalNextSibling);

    sortableScope.active = {
      draggedEl: item,
      draggedId: getId(item),
      hideFrame:
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(() => {
              if (sortableScope.active?.draggedEl !== item) return;

              item.style.display = 'none';
              if (sortableScope.active) sortableScope.active.hideFrame = null;
            })
          : null,
      initialOrders,
      originalNextSibling,
      originalDisplay: item.style.display,
      originalParent,
      placeholder,
      source: controller,
      target: controller,
    };

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', getId(item));

      if (options.dragImage) {
        const preview =
          typeof options.dragImage === 'function' ? options.dragImage(getId(item), item, e) : options.dragImage;

        if (preview) e.dataTransfer.setDragImage(preview, 0, 0);
      }
    }

    controller.notifyDragStart(getId(item), e);
  };

  const handleDragOver = (e: DragEvent): void => {
    if (!canReceiveActiveDrag(sortableScope, controller)) return;

    e.preventDefault();
    maybeAutoScroll(e, element, axis, autoScrollOptions);

    const active = sortableScope.active;

    if (!active) return;

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
    if (!canReceiveActiveDrag(sortableScope, controller)) return;

    e.preventDefault();
    if (sortableScope.active) sortableScope.active.target = controller;
  };

  const handleDragEnd = (e: DragEvent): void => {
    if (sortableScope.active?.source !== controller) return;

    finishActiveDrag(sortableScope, e);
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

  return {
    ...asDisposable(() => {
      if (sortableScope.active && (sortableScope.active.source === controller || sortableScope.active.target === controller)) {
        const syntheticEnd = new Event('dragend', { bubbles: true, cancelable: true }) as DragEvent;

        finishActiveDrag(sortableScope, syntheticEnd, true);
      }

      sortableScope.controllers.delete(controller);
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('drop', handleDrop);
      element.removeEventListener('dragend', handleDragEnd);
      element.removeEventListener('keydown', handleKeydown);

      element.removeAttribute('role');
      cleanupItems();
    }),
    get isDragging() {
      return sortableScope.active?.source === controller;
    },
    sync: syncItems,
  };
}

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
