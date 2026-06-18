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
  accept?: string[];
  /**
   * Maximum number of files accepted per drop. Files beyond this limit are
   * treated as rejected and forwarded to `onDropRejected`.
   *
   * When omitted there is no limit.
   */
  maxFiles?: number;
  /**
   * Optional async file gating. Called after type/extension filtering, before `onDrop`.
   * Return (or resolve) `false` to move all type-accepted files to `onDropRejected`.
   *
   * Only receives type-accepted files (after `accept` and `maxFiles` filtering).
   * Files already rejected by the `accept` filter are forwarded to `onDropRejected`
   * unconditionally and are not passed to this function.
   *
   * While validation is in progress `zone.validating` is `true` and `onValidatingChange`
   * is called with `true`.
   *
   * @example
   * ```ts
   * onValidate: async (files) => {
   *   const ok = await checkServerQuota(files);
   *   return ok;
   * }
   * ```
   */
  onValidate?: (files: File[]) => boolean | Promise<boolean>;
  /**
   * When `true`, all drag events are ignored and hover state does not change.
   *
   * Note: a disabled zone does not call `preventDefault` on drag or paste events,
   * so underlying elements (such as text editors) will still receive them.
   */
  disabled?: boolean;
  /**
   * The `dropEffect` to set on `dataTransfer` during `dragover`.
   * @default 'copy'
   */
  dropEffect?: DataTransfer['dropEffect'];
  /** Called when files are dropped or pasted (when `paste: true` and `onPaste` is omitted). Receives accepted files only. */
  onDrop?: (files: File[]) => void;
  /**
   * Called when dropped or pasted files are rejected by the `accept` filter, `maxFiles` limit, or `onValidate`.
   */
  onDropRejected?: (files: File[]) => void;
  /**
   * Called whenever hover state toggles.
   * Use this for drag-over styling.
   */
  onHoverChange?: (hovered: boolean) => void;
  /**
   * Called whenever the async validation state changes.
   * Use this to drive loading spinners.
   *
   * @example
   * ```ts
   * onValidatingChange: (v) => { spinnerEl.hidden = !v; }
   * ```
   */
  onValidatingChange?: (validating: boolean) => void;
  /**
   * When `true`, a `paste` event listener is added to `window`. Pasted files run
   * through the same `accept`, `maxFiles`, and `onValidate` pipeline as dropped files.
   * @default false
   */
  paste?: boolean;
  /**
   * Called when files are pasted via the clipboard. Falls back to `onDrop` when omitted.
   * Only active when `paste: true`.
   */
  onPaste?: (files: File[]) => void;
}

export interface DropZone extends Disposable {
  /** Whether the pointer is currently dragging over the zone. */
  readonly hovered: boolean;
  /** `true` while an `onValidate` promise is pending. */
  readonly validating: boolean;
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

/**
 * Filter `files` through `accept` patterns and `maxFiles` limit.
 * Returns accepted and rejected arrays.
 */
function applyFileFilters(
  files: File[],
  accept: string[],
  maxFiles: number | undefined,
): { accepted: File[]; rejected: File[] } {
  const accepted: File[] = [];
  const rejected: File[] = [];

  for (const f of files) {
    (matchesAccept(f, accept) ? accepted : rejected).push(f);
  }

  if (maxFiles !== undefined && accepted.length > maxFiles) {
    rejected.push(...accepted.splice(maxFiles));
  }

  return { accepted, rejected };
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
 * import { createDropZone } from '@vielzeug/dnd';
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
  const {
    accept = [],
    dropEffect = 'copy',
    element,
    maxFiles,
    onDrop,
    onDropRejected,
    onHoverChange,
    onValidatingChange,
  } = options;

  let dragCounter = 0;
  // Whether the *current* drag's payload passes the accept filter.
  // Determined on the first dragenter and held for the duration of the drag.
  let dragAccepted = false;
  let validating = false;
  let disposed = false;
  const abortController = new AbortController();

  const setValidating = (next: boolean): void => {
    validating = next;
    onValidatingChange?.(next);
  };

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

  // Settle the final accepted/rejected split and fire callbacks.
  const settle = (acceptedFiles: File[], rejectedFiles: File[]): void => {
    if (acceptedFiles.length > 0) onDrop?.(acceptedFiles);

    if (rejectedFiles.length > 0) onDropRejected?.(rejectedFiles);
  };

  // Settle for paste events (which may use onPaste instead of onDrop).
  const settleForPaste = (acceptedFiles: File[], rejectedFiles: File[]): void => {
    if (acceptedFiles.length > 0) {
      if (options.onPaste) {
        options.onPaste(acceptedFiles);
      } else {
        onDrop?.(acceptedFiles);
      }
    }

    if (rejectedFiles.length > 0) onDropRejected?.(rejectedFiles);
  };

  // Run accept/maxFiles filter, then async onValidate, then settle.
  const dispatchWithValidation = (rawFiles: File[], settleFn: (accepted: File[], rejected: File[]) => void): void => {
    const { accepted, rejected: rej } = applyFileFilters(rawFiles, accept, maxFiles);

    if (options.onValidate) setValidating(true);

    void Promise.resolve(options.onValidate && accepted.length > 0 ? options.onValidate(accepted) : true)
      .then((valid) => {
        if (options.onValidate) setValidating(false);

        if (disposed) return;

        if (valid) {
          settleFn(accepted, rej);
        } else {
          // validation failed — all type-accepted files become rejected
          settleFn([], [...rej, ...accepted]);
        }
      })
      .catch(() => {
        if (options.onValidate) setValidating(false);

        if (disposed) return;

        settleFn([], [...rej, ...accepted]);
      });
  };

  const handleDragEnter = (e: DragEvent): void => {
    if (resolveDisabled(options.disabled)) return;

    e.preventDefault();

    // Evaluate the filter once per drag (on first entry) — the payload is
    // constant for the lifetime of a drag operation.
    if (dragCounter === 0) {
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
    if (resolveDisabled(options.disabled)) return;

    e.preventDefault();

    if (e.dataTransfer) e.dataTransfer.dropEffect = dragAccepted ? dropEffect : 'none';
  };

  const handleDragLeave = (_e: DragEvent): void => {
    // Always decrement to balance the paired dragenter — disabling after enter
    // must not leave the counter permanently incremented.
    updateCounter(dragCounter - 1);
  };

  const handleDrop = (e: DragEvent): void => {
    // Reset counter first (idempotent at 0) so hover never sticks even when disabled.
    resetCounter();

    if (resolveDisabled(options.disabled)) return;

    e.preventDefault();

    const raw = e.dataTransfer?.files;

    if (!raw) return;

    dispatchWithValidation(Array.from(raw), settle);
  };

  const handlePaste = (e: ClipboardEvent): void => {
    if (resolveDisabled(options.disabled)) return;

    const clipFiles = e.clipboardData?.files;

    if (!clipFiles?.length) return;

    e.preventDefault();
    dispatchWithValidation(Array.from(clipFiles), settleForPaste);
  };

  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);

  if (options.paste) window.addEventListener('paste', handlePaste);

  // These global listeners catch drags that end outside the zone.
  // The window 'drop' also fires for in-zone drops, but resetCounter() is idempotent at counter=0.
  window.addEventListener('dragend', resetCounter);
  window.addEventListener('drop', resetCounter);

  const destroy = (): void => {
    if (disposed) return;

    disposed = true;
    abortController.abort();
    element.removeEventListener('dragenter', handleDragEnter);
    element.removeEventListener('dragover', handleDragOver);
    element.removeEventListener('dragleave', handleDragLeave);
    element.removeEventListener('drop', handleDrop);

    if (options.paste) window.removeEventListener('paste', handlePaste);

    window.removeEventListener('dragend', resetCounter);
    window.removeEventListener('drop', resetCounter);
    resetCounter();
  };

  return {
    get disposalSignal() {
      return abortController.signal;
    },
    dispose: destroy,
    get disposed() {
      return disposed;
    },
    get hovered() {
      return dragCounter > 0 && dragAccepted;
    },
    [Symbol.dispose]: destroy,
    get validating() {
      return validating;
    },
  };
}
