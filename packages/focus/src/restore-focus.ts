export type FocusableElement = HTMLElement | SVGElement;
export type FocusTarget = FocusableElement | null | undefined | (() => FocusableElement | null | undefined);

export type RestoreFocusOptions = {
  fallback?: FocusTarget;
  preventScroll?: boolean;
};

export type CaptureFocusOptions = RestoreFocusOptions & {
  signal?: AbortSignal;
  target?: FocusTarget;
};

export type FocusRestoration = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  restore(): boolean;
};

const resolveTarget = (target: FocusTarget): FocusableElement | null | undefined => {
  return typeof target === 'function' ? target() : target;
};

const getDeepActiveElement = (rootDocument: Document): Element | null => {
  let active: Element | null = rootDocument.activeElement;

  while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
};

const isConnected = (target: FocusableElement): boolean => {
  // `isConnected` pierces shadow boundaries (shadow-including root is the document);
  // `ownerDocument.contains` does NOT — it would reject elements inside shadow roots.
  return target.isConnected;
};

const isDisabled = (target: FocusableElement): boolean => {
  return target instanceof HTMLElement && 'disabled' in target && Boolean((target as HTMLInputElement).disabled);
};

const isInert = (target: FocusableElement): boolean => {
  if (target.closest('[inert]')) return true;

  return target instanceof HTMLElement && target.inert;
};

const canRestoreTo = (target: FocusableElement): boolean => {
  return isConnected(target) && !isDisabled(target) && !isInert(target);
};

const focusAndVerify = (target: FocusableElement, preventScroll: boolean | undefined): boolean => {
  target.focus({ preventScroll });

  return getDeepActiveElement(target.ownerDocument) === target;
};

export const restoreFocus = (target: FocusTarget, options: RestoreFocusOptions = {}): boolean => {
  const next = resolveTarget(target);

  if (next && canRestoreTo(next)) {
    return focusAndVerify(next, options.preventScroll);
  }

  if (!options.fallback) return false;

  const fallback = resolveTarget(options.fallback);

  if (!fallback || !canRestoreTo(fallback)) return false;

  return focusAndVerify(fallback, options.preventScroll);
};

export const captureFocus = (options: CaptureFocusOptions = {}): FocusRestoration => {
  const captured = resolveTarget(options.target ?? (() => getDeepActiveElement(document) as FocusableElement | null));
  const disposalController = new AbortController();
  let disposed = false;

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    disposalController.abort();
  };

  if (options.signal) {
    options.signal.addEventListener('abort', dispose, { once: true });
  }

  return {
    get disposalSignal() {
      return disposalController.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    restore() {
      if (disposed) return false;

      if (captured) return restoreFocus(captured, options);

      if (options.fallback) return restoreFocus(options.fallback, options);

      return false;
    },
    [Symbol.dispose]: dispose,
  };
};
