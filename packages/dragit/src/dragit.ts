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
  accept?: string[];
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
  onDragEnter?: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  /** Called every `dragover` frame — use to set `dropEffect`. */
  onDragOver?: (event: DragEvent) => void;
  /** Called when files are dropped. Receives accepted files only. */
  onDrop?: (files: File[], event: DragEvent) => void;
  /** Called when dropped files are rejected by the `accept` filter. */
  onDropRejected?: (files: File[], event: DragEvent) => void;
  /**
   * Called whenever hover state toggles.
   * Replaces manual `onDragEnter` / `onDragLeave` for simple styling.
   */
  onHoverChange?: (hovered: boolean) => void;
}

export interface DropZone {
  /** Whether the pointer is currently dragging over the zone. */
  readonly hovered: boolean;
  /** Programmatically release all listeners and state. */
  destroy(): void;
  [Symbol.dispose](): void;
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
  const {
    accept = [],
    disabled,
    dropEffect = 'copy',
    element,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onDropRejected,
    onHoverChange,
  } = options;

  let dragCounter = 0;

  const isRejectedByFilter = (e: DragEvent): boolean => {
    if (!accept.length) return false;

    const items = e.dataTransfer?.items;

    return !!items?.length && !itemsMatchAccept(items, accept);
  };

  const setDepth = (next: number): void => {
    const wasHovered = dragCounter > 0;

    dragCounter = Math.max(0, next);

    if (dragCounter > 0 !== wasHovered) onHoverChange?.(dragCounter > 0);
  };

  const handleDragEnter = (e: DragEvent): void => {
    e.preventDefault();

    if (resolveDisabled(disabled)) return;

    if (isRejectedByFilter(e)) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';

      return;
    }

    setDepth(dragCounter + 1);
    onDragEnter?.(e);
  };

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();

    if (resolveDisabled(disabled)) return;

    if (isRejectedByFilter(e)) {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';

      return;
    }

    if (e.dataTransfer) e.dataTransfer.dropEffect = dropEffect;

    onDragOver?.(e);
  };

  const handleDragLeave = (e: DragEvent): void => {
    if (resolveDisabled(disabled)) return;

    setDepth(dragCounter - 1);

    if (dragCounter === 0) onDragLeave?.(e);
  };

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    setDepth(0);

    if (resolveDisabled(disabled)) return;

    const raw = e.dataTransfer?.files;

    if (!raw) return;

    const files: File[] = [];
    const rejected: File[] = [];

    for (const f of Array.from(raw)) {
      (matchesAccept(f, accept) ? files : rejected).push(f);
    }

    if (files.length > 0) onDrop?.(files, e);

    if (rejected.length > 0) onDropRejected?.(rejected, e);
  };

  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);

  return {
    destroy() {
      element.removeEventListener('dragenter', handleDragEnter);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
      dragCounter = 0;
    },
    get hovered() {
      return dragCounter > 0;
    },
    [Symbol.dispose]() {
      this.destroy();
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
  onDragEnd?: (event: DragEvent) => void;
}

export interface Sortable {
  destroy(): void;
  [Symbol.dispose](): void;
}

/**
 * Makes a list of items sortable via mouse / touch drag.
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
    disabled,
    element,
    handle,
    itemAttribute = 'data-sort-id',
    onDragEnd: onDragEndCb,
    onDragStart: onDragStartCb,
    onReorder,
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

    p.className = 'dragit-placeholder';
    p.setAttribute('aria-hidden', 'true');
    p.style.height = `${source.offsetHeight}px`;

    return p;
  };

  const handleDragStart = (e: DragEvent): void => {
    if (resolveDisabled(disabled)) return;

    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>(`[${itemAttribute}]`);

    if (!item) return;

    if (handle && !target.closest(handle)) return;

    originalOrder = getOrderedIds();
    originalNextSibling = item.nextSibling;
    draggedEl = item;
    draggedEl.setAttribute('data-dragging', '');
    draggedEl.style.opacity = '0';

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
    const insertAfter = e.clientY >= rect.top + rect.height / 2;

    if (target === lastOverTarget && insertAfter === lastInsertAfter) return;

    lastOverTarget = target;
    lastInsertAfter = insertAfter;

    element.insertBefore(placeholder, insertAfter ? target.nextSibling : target);
  };

  const handleDragEnd = (e: DragEvent): void => {
    if (!draggedEl) return;

    const cancelled = e.dataTransfer?.dropEffect === 'none';

    draggedEl.removeAttribute('data-dragging');
    draggedEl.style.opacity = '';

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

    onDragEndCb?.(e);

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
    destroy() {
      observer.disconnect();
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragend', handleDragEnd);

      if (draggedEl) {
        draggedEl.removeAttribute('data-dragging');
        draggedEl.style.opacity = '';
      }

      placeholder?.remove();
      draggedEl = null;
      placeholder = null;

      getItems().forEach((el) => {
        el.removeAttribute('draggable');
        el.removeAttribute('role');

        if (handle) {
          el.querySelectorAll<HTMLElement>(handle).forEach((h) => h.removeAttribute('draggable'));
        }
      });
    },
    [Symbol.dispose]() {
      this.destroy();
    },
  };
}
