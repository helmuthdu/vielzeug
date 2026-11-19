import { FocusConfigError } from './errors.js';

export type DismissalReason = 'outsidePointer' | 'escape';

type EscapeEntry = {
  isActive: () => boolean;
  onDismiss: (reason: DismissalReason) => void;
};

type EscapeRegistry = {
  surfaces: Set<EscapeEntry>;
  listener: (event: KeyboardEvent) => void;
};

/**
 * Escape-enabled dismissals per document, in creation order. A single shared
 * keydown listener walks the set newest-first so stacked surfaces unwind in
 * reverse order and only one surface closes per keypress.
 */
const escapeRegistries = new WeakMap<Document, EscapeRegistry>();

const onDocumentEscape = (registry: EscapeRegistry, event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || event.defaultPrevented) return;

  for (const entry of [...registry.surfaces].reverse()) {
    if (!entry.isActive()) continue;

    event.preventDefault();
    entry.onDismiss('escape');
    return;
  }
};

const registerEscape = (ownerDocument: Document, entry: EscapeEntry): (() => void) => {
  let registry = escapeRegistries.get(ownerDocument);
  if (!registry) {
    const created: EscapeRegistry = {
      listener: (event) => onDocumentEscape(created, event),
      surfaces: new Set(),
    };
    registry = created;
    escapeRegistries.set(ownerDocument, registry);
    ownerDocument.addEventListener('keydown', registry.listener);
  }

  registry.surfaces.add(entry);

  return () => {
    registry.surfaces.delete(entry);
    if (registry.surfaces.size === 0) {
      ownerDocument.removeEventListener('keydown', registry.listener);
      escapeRegistries.delete(ownerDocument);
    }
  };
};

export type DismissalOptions = {
  /**
   * Boundary elements the dismissed surface spans: trigger, panel, host. A
   * pointer that begins inside any of them (shadow roots included) keeps the
   * surface open. Resolved per event, so elements may mount and unmount freely.
   */
  getTargets: () => Array<Element | null | undefined>;
  /** Whether the surface is currently open. Checked per event; dismissal is a no-op while inactive. */
  isActive: () => boolean;
  /** Called when the surface should close. Receives why. */
  onDismiss: (reason: DismissalReason) => void;
  /**
   * Also dismiss on `Escape` (default `false`). Opt-in so components that own
   * their Escape handling do not double-handle it. When several escape-enabled
   * dismissals share a document, only the most recently created active one
   * closes per keypress, so stacked surfaces unwind newest-first.
   */
  escape?: boolean;
  /**
   * Document whose listeners are used (default: the global `document`). Pass
   * `host.ownerDocument` from inside a component that may live in an iframe.
   */
  ownerDocument?: Document;
  /** Aborting dismisses the handle, same as {@link Dismissal.dispose}. */
  signal?: AbortSignal;
};

export type Dismissal = {
  /** Removes both listeners. Idempotent. */
  dispose(): void;
  readonly disposed: boolean;
  [Symbol.dispose](): void;
};

/**
 * Dismisses an active floating surface when a pointer begins outside all of
 * its boundary elements or, with `escape: true`, when `Escape` is pressed.
 *
 * The pointer check runs in the capture phase and matches against
 * `composedPath()`, so clicks inside a shadow root of a boundary element keep
 * the surface open. Components retain ownership of their open state; this
 * only reports that the surface should close.
 *
 * @example
 * ```ts
 * const dismissal = createDismissal({
 *   getTargets: () => [trigger, panel],
 *   isActive: () => open,
 *   onDismiss: () => setOpen(false),
 *   escape: true,
 *   signal: controller.signal,
 * });
 * ```
 */
export const createDismissal = (options: DismissalOptions): Dismissal => {
  if (typeof options.getTargets !== 'function') {
    throw new FocusConfigError('createDismissal requires a getTargets function');
  }
  if (typeof options.isActive !== 'function') {
    throw new FocusConfigError('createDismissal requires an isActive function');
  }
  if (typeof options.onDismiss !== 'function') {
    throw new FocusConfigError('createDismissal requires an onDismiss function');
  }

  const ownerDocument = options.ownerDocument ?? document;
  let disposed = options.signal?.aborted ?? false;

  const onPointerDown = (event: PointerEvent): void => {
    if (!options.isActive()) return;

    const path = event.composedPath();
    const target = path[0] instanceof Node ? path[0] : event.target instanceof Node ? event.target : null;
    const inside = options.getTargets().some((element) => {
      return (
        element !== null &&
        element !== undefined &&
        (path.includes(element) || Boolean(target && element.contains(target)))
      );
    });

    if (!inside) options.onDismiss('outsidePointer');
  };

  let unregisterEscape: (() => void) | undefined;

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    ownerDocument.removeEventListener('pointerdown', onPointerDown, { capture: true });
    if (unregisterEscape) {
      unregisterEscape();
      unregisterEscape = undefined;
    }
    options.signal?.removeEventListener('abort', dispose);
  };

  if (!disposed) {
    ownerDocument.addEventListener('pointerdown', onPointerDown, { capture: true });

    if (options.escape) {
      unregisterEscape = registerEscape(ownerDocument, {
        isActive: options.isActive,
        onDismiss: options.onDismiss,
      });
    }

    if (options.signal) {
      options.signal.addEventListener('abort', dispose, { once: true });
    }
  }

  const dismissal: Dismissal = {
    dispose,
    get disposed() {
      return disposed;
    },
    [Symbol.dispose]: dispose,
  };

  return dismissal;
};
