/**
 * @vielzeug/dragit — Drag-and-drop primitives for the DOM.
 *
 * Framework-agnostic. Wraps the HTML Drag & Drop API with:
 *   - Counter-based `drag-over` state (not lost on child entry/exit)
 *   - File type / MIME filtering with pre-validation via `dataTransfer.items`
 */

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
   * Returns `true` when the zone is disabled.
   * Accepts a function so reactive frameworks can pass a derived/computed value.
   * No drag events will fire, no visual state will change.
   * @example disabled={() => isReadOnly.value}
   */
  disabled?: () => boolean;
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
 * const zone = createDropZone({
 *   element: dropZoneEl,
 *   accept: ['image/*', '.pdf'],
 *   onDrop: (files) => { console.log('Dropped:', files); },
 *   onHoverChange: (hovered) => {
 *     dropZoneEl.classList.toggle('drag-over', hovered);
 *   },
 * });
 *
 * // Later (or use `using zone = createDropZone(...)` for automatic cleanup):
 * zone.destroy();
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
  let hovered = false;

  const setHover = (next: boolean): void => {
    if (hovered === next) return;

    hovered = next;
    onHoverChange?.(hovered);
  };

  const handleDragEnter = (e: DragEvent): void => {
    e.preventDefault();

    if (disabled?.() ?? false) return;

    if (e.dataTransfer?.items && !itemsMatchAccept(e.dataTransfer.items, accept)) {
      e.dataTransfer.dropEffect = 'none';

      return;
    }

    dragCounter++;
    setHover(true);
    onDragEnter?.(e);
  };

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();

    if (disabled?.() ?? false) return;

    if (e.dataTransfer?.items && !itemsMatchAccept(e.dataTransfer.items, accept)) {
      e.dataTransfer.dropEffect = 'none';

      return;
    }

    if (e.dataTransfer) e.dataTransfer.dropEffect = dropEffect;

    setHover(true);
    onDragOver?.(e);
  };

  const handleDragLeave = (e: DragEvent): void => {
    if (disabled?.() ?? false) return;

    if (e.dataTransfer?.items && !itemsMatchAccept(e.dataTransfer.items, accept)) return;

    dragCounter--;

    if (dragCounter <= 0) {
      dragCounter = 0;
      setHover(false);
      onDragLeave?.(e);
    }
  };

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    dragCounter = 0;
    setHover(false);

    if (disabled?.() ?? false) return;

    const raw = e.dataTransfer?.files;

    if (!raw) return;

    const allFiles = Array.from(raw);
    const files = allFiles.filter((f) => matchesAccept(f, accept));
    const rejected = allFiles.filter((f) => !matchesAccept(f, accept));

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
      hovered = false;
    },
    get hovered() {
      return hovered;
    },
    [Symbol.dispose]() {
      this.destroy();
    },
  };
}

// ─── createSortable ───────────────────────────────────────────────────────────

export interface SortableOptions {
  /** Container element whose direct-child items are sortable. */
  container: HTMLElement;
  /**
   * Selector for the drag handle inside each item.
   * When omitted the whole item is the handle.
   */
  handle?: string;
  /** Called with the new order of item `id`s after a successful drag, only when the order changed. */
  onReorder?: (orderedIds: string[]) => void;
  /**
   * Returns `true` when the sortable is disabled.
   * Accepts a function so reactive frameworks can pass a derived/computed value.
   * @example disabled={() => isReadOnly.value}
   */
  disabled?: () => boolean;
  /** Called when the user starts dragging an item. */
  onDragStart?: (id: string, event: DragEvent) => void;
  /** Called when a drag ends (whether dropped or cancelled). */
  onDragEnd?: (event: DragEvent) => void;
}

export interface Sortable {
  /** Re-scan container children and sync `draggable`/`role` state. Call after adding or removing items. */
  refresh(): void;
  destroy(): void;
  [Symbol.dispose](): void;
}

/**
 * Makes a list of items sortable via mouse / touch drag.
 *
 * Each direct child of `container` must carry a `data-sort-id` attribute.
 * `createSortable` sets `draggable="true"` on qualifying children automatically.
 *
 * Style the drop indicator by targeting `.dragit-placeholder` in your CSS.
 *
 * @example
 * ```ts
 * import { createSortable } from '@vielzeug/dragit';
 *
 * using sortable = createSortable({
 *   container: listEl,
 *   onReorder: (ids) => { reorderItems(ids); },
 * });
 * ```
 */
export function createSortable(options: SortableOptions): Sortable {
  const { container, disabled, handle, onDragEnd: onDragEndCb, onDragStart: onDragStartCb, onReorder } = options;

  let draggedEl: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;
  let originalOrder: string[] = [];

  const getItems = (): HTMLElement[] =>
    Array.from(container.children).filter((c) => (c as HTMLElement).dataset.sortId) as HTMLElement[];

  const getOrderedIds = (): string[] => getItems().map((el) => el.dataset.sortId!);

  const refreshItems = (): void => {
    getItems().forEach((el) => {
      el.setAttribute('draggable', 'true');
      el.setAttribute('role', 'listitem');
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
    if (disabled?.() ?? false) return;

    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-sort-id]');

    if (!item) return;

    if (handle && !target.closest(handle)) return;

    originalOrder = getOrderedIds();
    draggedEl = item;
    draggedEl.setAttribute('data-dragging', '');

    placeholder = createPlaceholder(draggedEl);
    draggedEl.parentElement?.insertBefore(placeholder, draggedEl.nextSibling);

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.sortId ?? '');
    }

    onDragStartCb?.(item.dataset.sortId ?? '', e);
  };

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();

    if (!draggedEl || !placeholder) return;

    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-sort-id]');

    if (!target || target === draggedEl) return;

    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (e.clientY < midpoint) {
      container.insertBefore(placeholder, target);
    } else {
      container.insertBefore(placeholder, target.nextSibling);
    }
  };

  const handleDragEnd = (e: DragEvent): void => {
    if (!draggedEl) return;

    draggedEl.removeAttribute('data-dragging');

    if (placeholder?.parentElement) {
      placeholder.parentElement.insertBefore(draggedEl, placeholder);
      placeholder.remove();
    }

    placeholder = null;
    draggedEl = null;

    onDragEndCb?.(e);

    if (!(disabled?.() ?? false)) {
      const newOrder = getOrderedIds();
      const changed = newOrder.some((id, i) => id !== originalOrder[i]);

      if (changed) onReorder?.(newOrder);
    }
  };

  refreshItems();

  container.setAttribute('role', 'list');
  container.addEventListener('dragstart', handleDragStart);
  container.addEventListener('dragover', handleDragOver);
  container.addEventListener('dragend', handleDragEnd);

  return {
    destroy() {
      container.removeEventListener('dragstart', handleDragStart);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragend', handleDragEnd);

      if (draggedEl) draggedEl.removeAttribute('data-dragging');

      placeholder?.remove();
      draggedEl = null;
      placeholder = null;

      getItems().forEach((el) => {
        el.removeAttribute('draggable');
        el.removeAttribute('role');
      });
    },
    refresh() {
      refreshItems();
    },
    [Symbol.dispose]() {
      this.destroy();
    },
  };
}
