/**
 * @vielzeug/dragit — Drag-and-drop primitives for the DOM.
 *
 * Framework-agnostic. Wraps the HTML Drag & Drop API with:
 *   - Counter-based `drag-over` state (not lost on child entry/exit)
 *   - File type / MIME filtering
 *   - Pointer-events fallback detection
 *   - Keyboard activation helpers for accessible drop zones
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
   * No drag events will fire, no visual state will change.
   */
  disabled?: () => boolean;
  onDragEnter?: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  /** Called every `dragover` frame — use to set `dropEffect`. */
  onDragOver?: (event: DragEvent) => void;
  /** Called when files are dropped. Receives the filtered `FileList`. */
  onDrop?: (files: File[], event: DragEvent) => void;
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
 * // Later:
 * zone.destroy();
 * ```
 */
export function createDropZone(options: DropZoneOptions): DropZone {
  const { accept = [], disabled, element, onDragEnter, onDragLeave, onDragOver, onDrop, onHoverChange } = options;

  let dragCounter = 0;
  let hovered = false;

  const isDisabled = (): boolean => (disabled ? disabled() : false);

  const setHover = (next: boolean): void => {
    if (hovered === next) return;

    hovered = next;
    onHoverChange?.(hovered);
  };

  const handleDragEnter = (e: DragEvent): void => {
    e.preventDefault();

    if (isDisabled()) return;

    dragCounter++;
    setHover(true);
    onDragEnter?.(e);
  };

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();

    if (isDisabled()) return;

    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';

    setHover(true);
    onDragOver?.(e);
  };

  const handleDragLeave = (e: DragEvent): void => {
    if (isDisabled()) return;

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

    if (isDisabled()) return;

    const raw = e.dataTransfer?.files;

    if (!raw) return;

    const files = Array.from(raw).filter((f) => matchesAccept(f, accept));

    onDrop?.(files, e);
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
  };
}

// ─── createSortable ───────────────────────────────────────────────────────────

export interface SortableItem {
  element: HTMLElement;
  /** Stable identifier for the item (used in `onReorder` callback). */
  id: string;
}

export interface SortableOptions {
  /** Container element whose direct-child items are sortable. */
  container: HTMLElement;
  /**
   * Selector for the drag handle inside each item.
   * When omitted the whole item is the handle.
   */
  handle?: string;
  /** Called with the new order of item `id`s after a successful drag. */
  onReorder?: (orderedIds: string[]) => void;
  disabled?: () => boolean;
}

export interface Sortable {
  destroy(): void;
}

/**
 * Makes a list of items sortable via mouse / touch drag.
 *
 * Each direct child of `container` must carry a `data-sort-id` attribute.
 *
 * @example
 * ```ts
 * import { createSortable } from '@vielzeug/dragit';
 *
 * const sortable = createSortable({
 *   container: listEl,
 *   onReorder: (ids) => { reorderItems(ids); },
 * });
 *
 * // Later:
 * sortable.destroy();
 * ```
 */
export function createSortable(options: SortableOptions): Sortable {
  const { container, disabled, handle, onReorder } = options;

  const isDisabled = (): boolean => (disabled ? disabled() : false);

  let draggedEl: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;

  const getItems = (): HTMLElement[] =>
    Array.from(container.children).filter((c) => (c as HTMLElement).dataset.sortId) as HTMLElement[];

  const getOrderedIds = (): string[] => getItems().map((el) => el.dataset.sortId!);

  const createPlaceholder = (source: HTMLElement): HTMLElement => {
    const p = document.createElement('div');

    p.className = 'dragit-placeholder';
    p.setAttribute('aria-hidden', 'true');
    p.style.cssText = `
      height: ${source.offsetHeight}px;
      background: var(--color-contrast-100, #f0f0f0);
      border: 2px dashed var(--color-contrast-300, #ccc);
      border-radius: 4px;
      box-sizing: border-box;
    `;

    return p;
  };

  const handleDragStart = (e: DragEvent): void => {
    if (isDisabled()) return;

    const target = e.target as HTMLElement;
    const item = handle ? target.closest<HTMLElement>('[data-sort-id]') : target.closest<HTMLElement>('[data-sort-id]');

    if (!item) return;

    if (handle && !target.closest(handle)) return;

    draggedEl = item;
    draggedEl.setAttribute('data-dragging', '');

    placeholder = createPlaceholder(draggedEl);
    draggedEl.parentElement?.insertBefore(placeholder, draggedEl.nextSibling);

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.sortId ?? '');
    }
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

  const handleDragEnd = (): void => {
    if (!draggedEl) return;

    draggedEl.removeAttribute('data-dragging');

    if (placeholder?.parentElement) {
      placeholder.parentElement.insertBefore(draggedEl, placeholder);
      placeholder.remove();
    }

    placeholder = null;
    draggedEl = null;

    onReorder?.(getOrderedIds());
  };

  container.setAttribute('role', 'list');
  container.addEventListener('dragstart', handleDragStart);
  container.addEventListener('dragover', handleDragOver);
  container.addEventListener('dragend', handleDragEnd);

  return {
    destroy() {
      container.removeEventListener('dragstart', handleDragStart);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragend', handleDragEnd);
    },
  };
}
