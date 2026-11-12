import { SentinelUnavailableError } from './errors.ts';

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

  mediaQuery.addEventListener('change', onChange);

  return () => mediaQuery.removeEventListener('change', onChange);
}
