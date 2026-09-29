export type FocusableElement = HTMLElement | SVGElement;
export type FocusTarget = FocusableElement | null | undefined | (() => FocusableElement | null | undefined);

export type RestoreFocusOptions = {
  fallback?: FocusTarget;
  preventScroll?: boolean;
};

export type CaptureFocusOptions = RestoreFocusOptions & {
  signal?: AbortSignal;
};

export type FocusRestorer = () => boolean;

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
  try {
    target.focus({ preventScroll });
    return getDeepActiveElement(target.ownerDocument) === target;
  } catch {
    return false;
  }
};

export const restoreFocus = (target: FocusTarget, options: RestoreFocusOptions = {}): boolean => {
  let next: FocusableElement | null | undefined;
  try {
    next = resolveTarget(target);
  } catch {
    next = null;
  }

  if (next && canRestoreTo(next) && focusAndVerify(next, options.preventScroll)) {
    return true;
  }

  if (!options.fallback) return false;

  let fallback: FocusableElement | null | undefined;
  try {
    fallback = resolveTarget(options.fallback);
  } catch {
    return false;
  }

  if (!fallback || !canRestoreTo(fallback)) return false;

  return focusAndVerify(fallback, options.preventScroll);
};

/**
 * Hands focus to `target` when focus has been lost to the document body — the state left
 * behind when the focused element unmounts mid-swap (browsing a dialog, paging a list),
 * where keydown would never reach a handler and every shortcut dies. Returns `true` when
 * focus was rescued; `false` when focus is already on a real element or the target cannot
 * take focus (the `fallback` option of {@link RestoreFocusOptions} still applies).
 */
export const rescueFocus = (target: FocusTarget, options: RestoreFocusOptions = {}): boolean => {
  const active = getDeepActiveElement(document);

  if (active && active !== document.body) return false;

  return restoreFocus(target, options);
};

export const captureFocus = (options: CaptureFocusOptions = {}): FocusRestorer => {
  let captured = getDeepActiveElement(document) as FocusableElement | null;
  let available = !options.signal?.aborted;

  if (!available) captured = null;

  const cancel = (): void => {
    available = false;
    captured = null;
  };

  if (!options.signal?.aborted) {
    options.signal?.addEventListener('abort', cancel, { once: true });
  }

  return () => {
    if (!available) return false;

    available = false;
    options.signal?.removeEventListener('abort', cancel);

    const target = captured;
    captured = null;

    if (target) {
      return restoreFocus(target, {
        fallback: options.fallback,
        preventScroll: options.preventScroll,
      });
    }

    if (options.fallback) {
      return restoreFocus(options.fallback, {
        preventScroll: options.preventScroll,
      });
    }

    return false;
  };
};
