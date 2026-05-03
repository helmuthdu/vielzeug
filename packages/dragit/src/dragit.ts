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
  /**
   * Selector for the drag handle inside each item.
   * When omitted the whole item is the handle.
   */
  handle?: string;
  /**
   * The attribute that stores each item's identity.
   * @default 'data-sort-id'
   */
  itemAttribute?: string;
  /** Sorting axis used to compute insertion position. @default 'vertical' */
  axis?: 'vertical' | 'horizontal';
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
    axis = 'vertical',
    disabled,
    element,
    handle,
    itemAttribute = 'data-sort-id',
    onDragEnd: onDragEndCb,
    onDragStart: onDragStartCb,
    onReorder,
    placeholderClass = 'dragit-placeholder',
  } = options;

  let draggedEl: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;
  let originalOrder: string[] = [];
  let originalNextSibling: ChildNode | null = null;
  let lastOverTarget: HTMLElement | null = null;
  let lastInsertAfter = false;

  const getItems = (): HTMLElement[] =>
    Array.from(element.children).filter((c) => (c as HTMLElement).hasAttribute(itemAttribute)) as HTMLElement[];

  const getOrderedIds = (): string[] => getItems().map((el) => el.getAttribute(itemAttribute)!);

  const getId = (el: HTMLElement): string => el.getAttribute(itemAttribute) ?? '';

  const refreshItems = (): void => {
    getItems().forEach((el) => {
      el.setAttribute('role', 'listitem');

      if (handle) {
        el.removeAttribute('draggable');
        el.querySelectorAll<HTMLElement>(handle).forEach((h) => h.setAttribute('draggable', 'true'));
      } else {
        el.setAttribute('draggable', 'true');
      }
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

  const handleDragStart = (e: DragEvent): void => {
    if (resolveDisabled(disabled)) return;

    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>(`[${itemAttribute}]`);

    if (!item) return;

    if (handle && !target.closest(handle)) return;

    lastOverTarget = null;
    lastInsertAfter = false;

    originalOrder = getOrderedIds();
    originalNextSibling = item.nextSibling;
    draggedEl = item;
    draggedEl.setAttribute('data-dragging', '');

    placeholder = createPlaceholder(draggedEl);
    draggedEl.parentElement?.insertBefore(placeholder, draggedEl.nextSibling);

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', getId(item));
    }

    onDragStartCb?.(getId(item), e);
  };

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();

    if (!draggedEl || !placeholder) return;

    const target = (e.target as HTMLElement).closest<HTMLElement>(`[${itemAttribute}]`);

    if (!target || target === draggedEl) return;

    const rect = target.getBoundingClientRect();
    const insertAfter =
      axis === 'vertical' ? e.clientY >= rect.top + rect.height / 2 : e.clientX >= rect.left + rect.width / 2;

    if (target === lastOverTarget && insertAfter === lastInsertAfter) return;

    lastOverTarget = target;
    lastInsertAfter = insertAfter;

    element.insertBefore(placeholder, insertAfter ? target.nextSibling : target);
  };

  const handleDragEnd = (e: DragEvent): void => {
    if (!draggedEl) return;

    const draggedId = getId(draggedEl);

    const cancelled = e.dataTransfer?.dropEffect === 'none';

    draggedEl.removeAttribute('data-dragging');

    if (placeholder?.parentElement) {
      if (cancelled) {
        element.insertBefore(draggedEl, originalNextSibling);
      } else {
        placeholder.parentElement.insertBefore(draggedEl, placeholder);
      }

      placeholder.remove();
    }

    placeholder = null;
    draggedEl = null;
    lastOverTarget = null;
    originalNextSibling = null;

    onDragEndCb?.(draggedId, e);

    if (!cancelled && !resolveDisabled(disabled)) {
      const newOrder = getOrderedIds();

      if (newOrder.some((id, i) => id !== originalOrder[i])) onReorder?.(newOrder);
    }
  };

  refreshItems();

  element.setAttribute('role', 'list');
  element.addEventListener('dragstart', handleDragStart);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragend', handleDragEnd);

  const observer = new MutationObserver(() => refreshItems());

  observer.observe(element, { childList: true });

  return {
    ...asDisposable(() => {
      observer.disconnect();
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragend', handleDragEnd);

      if (draggedEl) {
        draggedEl.removeAttribute('data-dragging');
      }

      placeholder?.remove();
      draggedEl = null;
      placeholder = null;
      originalNextSibling = null;
      lastOverTarget = null;
      lastInsertAfter = false;

      element.removeAttribute('role');

      getItems().forEach((el) => {
        el.removeAttribute('draggable');
        el.removeAttribute('role');

        if (handle) {
          el.querySelectorAll<HTMLElement>(handle).forEach((h) => h.removeAttribute('draggable'));
        }
      });
    }),
    get isDragging() {
      return draggedEl !== null;
    },
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
