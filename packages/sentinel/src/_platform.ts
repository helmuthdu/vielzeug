import { SentinelUnavailableError } from './errors.ts';

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

export type ObserverWindow = Window & {
  readonly IntersectionObserver?: {
    new (callback: IntersectionObserverCallback, options?: IntersectionObserverInit): IntersectionObserver;
  };
  readonly ResizeObserver?: {
    new (callback: ResizeObserverCallback): ResizeObserver;
  };
};

export function resolveWindow(target?: Window): Window {
  if (target) return target;
  if (typeof window === 'undefined') {
    throw new SentinelUnavailableError('Window is not available in this environment.');
  }

  return window;
}

export function resolveElementWindow(element: Element): ObserverWindow {
  const ownerWindow = element.ownerDocument.defaultView;
  if (!ownerWindow) {
    throw new SentinelUnavailableError('The element is not connected to a Window.');
  }

  return ownerWindow;
}

export function listenMediaQuery(mediaQuery: MediaQueryList, listener: () => void): () => void {
  const onChange = () => listener();

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }

  const legacyMediaQuery = mediaQuery as LegacyMediaQueryList;
  if (typeof legacyMediaQuery.addListener === 'function') {
    legacyMediaQuery.addListener(onChange);
    return () => legacyMediaQuery.removeListener?.(onChange);
  }

  return () => {};
}
