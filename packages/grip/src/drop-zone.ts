import { type Disposable, resolveDisabled } from './shared';

// ─── Accept matching ─────────────────────────────────────────────────────────

/**
 * Test whether a `File` matches an accept pattern list.
 *
 * Each pattern can be:
 *   - A MIME type:            `'image/png'`
 *   - A MIME wildcard:        `'image/*'`
 *   - A file extension:       `'.pdf'`
 *
 * An empty list accepts everything.
 */
export function matchesAccept(file: File, accept: string[]): boolean {
  if (!accept.length) return true;

  return accept.some((pattern) => {
    const p = pattern.trim();

    if (p.startsWith('.')) return file.name.toLowerCase().endsWith(p.toLowerCase());

    if (p.endsWith('/*')) return file.type.startsWith(p.slice(0, -1));

    return file.type === p;
  });
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
   * Maximum number of files accepted per drop. Files beyond this limit are
   * treated as rejected and forwarded to `onDropRejected`.
   *
   * When omitted there is no limit.
   */
  maxFiles?: number;
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
  /** Called when dropped files are rejected by the `accept` filter or `maxFiles` limit. */
  onDropRejected?: (files: File[], event: DragEvent) => void;
  /**
   * Called whenever hover state toggles.
   * Use this for drag-over styling.
   */
  onHoverChange?: (hovered: boolean) => void;
}

export interface DropZone extends Disposable {
  /** Whether the pointer is currently dragging over the zone. */
  readonly hovered: boolean;
  /** Accepted files from the last drop. */
  readonly files: readonly File[];
  /** Rejected files from the last drop. */
  readonly rejected: readonly File[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

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
 * Accepts files and provides hover state management with configurable MIME/extension filtering.
 * Calls `onDrop` only for accepted files and `onDropRejected` for filtered files.
 *
 * @example
 * ```ts
 * import { createDropZone } from '@vielzeug/grip';
 *
 * using zone = createDropZone({
 *   element: dropZoneEl,
 *   accept: ['image/*', '.pdf'],
 *   maxFiles: 5,
 *   onDrop: (files) => { console.log('Dropped:', files); },
 *   onHoverChange: (hovered) => {
 *     dropZoneEl.classList.toggle('drag-over', hovered);
 *   },
 * });
 * ```
 */
export function createDropZone(options: DropZoneOptions): DropZone {
  const { disabled, dropEffect = 'copy', element, maxFiles, onDrop, onDropRejected, onHoverChange } = options;

  const getAccept: () => string[] = typeof options.accept === 'function' ? options.accept : () => options.accept ?? [];

  let dragCounter = 0;
  // Whether the *current* drag's payload passes the accept filter.
  // Determined on the first dragenter and held for the duration of the drag.
  let dragAccepted = false;
  let files: File[] = [];
  let rejected: File[] = [];

  const updateCounter = (next: number): void => {
    const wasHovered = dragCounter > 0 && dragAccepted;

    dragCounter = Math.max(0, next);

    // Reset acceptance state when the drag fully leaves so the next drag starts clean.
    if (dragCounter === 0) dragAccepted = false;

    const hovered = dragCounter > 0 && dragAccepted;

    if (hovered !== wasHovered) onHoverChange?.(hovered);
  };

  const resetCounter = (): void => {
    updateCounter(0);
  };

  const handleDragEnter = (e: DragEvent): void => {
    e.preventDefault();

    if (resolveDisabled(disabled)) return;

    // Evaluate the filter once per drag (on first entry) — the payload is
    // constant for the lifetime of a drag operation.
    if (dragCounter === 0) {
      const accept = getAccept();
      const items = e.dataTransfer?.items;

      dragAccepted = !accept.length || !items?.length || itemsMatchAccept(items, accept);
    }

    if (!dragAccepted && e.dataTransfer) {
      e.dataTransfer.dropEffect = 'none';
    }

    // Always increment so every dragenter is paired with its dragleave,
    // regardless of acceptance. This prevents counter under-runs.
    updateCounter(dragCounter + 1);
  };

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault();

    if (resolveDisabled(disabled)) return;

    if (e.dataTransfer) e.dataTransfer.dropEffect = dragAccepted ? dropEffect : 'none';
  };

  const handleDragLeave = (_e: DragEvent): void => {
    // Always decrement to balance the paired dragenter — disabling after enter
    // must not leave the counter permanently incremented.
    updateCounter(dragCounter - 1);
  };

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    resetCounter();

    if (resolveDisabled(disabled)) return;

    const raw = e.dataTransfer?.files;

    if (!raw) return;

    const accept = getAccept();
    const acceptedFiles: File[] = [];
    const rejectedFiles: File[] = [];

    for (const f of Array.from(raw)) {
      (matchesAccept(f, accept) ? acceptedFiles : rejectedFiles).push(f);
    }

    // Apply maxFiles limit: excess accepted files become rejected.
    if (maxFiles !== undefined && acceptedFiles.length > maxFiles) {
      rejectedFiles.push(...acceptedFiles.splice(maxFiles));
    }

    files = acceptedFiles;
    rejected = rejectedFiles;

    if (acceptedFiles.length > 0) onDrop?.(acceptedFiles, e);

    if (rejectedFiles.length > 0) onDropRejected?.(rejectedFiles, e);
  };

  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);

  window.addEventListener('dragend', resetCounter);
  window.addEventListener('drop', resetCounter);

  const destroy = (): void => {
    element.removeEventListener('dragenter', handleDragEnter);
    element.removeEventListener('dragover', handleDragOver);
    element.removeEventListener('dragleave', handleDragLeave);
    element.removeEventListener('drop', handleDrop);
    window.removeEventListener('dragend', resetCounter);
    window.removeEventListener('drop', resetCounter);
    resetCounter();
  };

  return {
    destroy,
    get files() {
      return files;
    },
    get hovered() {
      return dragCounter > 0 && dragAccepted;
    },
    get rejected() {
      return rejected;
    },
    [Symbol.dispose]: destroy,
  };
}
