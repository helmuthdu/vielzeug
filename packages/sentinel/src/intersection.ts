import { resolveElementWindow } from './_platform.ts';
import { createSentinel } from './core.ts';
import { SentinelUnavailableError } from './errors.ts';
import type { IntersectionState, Sentinel, SentinelOptions } from './types.ts';

export interface CreateIntersectionOptions extends SentinelOptions {
  readonly root?: Element | Document | null;
  readonly rootMargin?: string;
  readonly scrollMargin?: string;
  readonly threshold?: number | number[];
}

export function createIntersection(
  element: Element,
  options?: CreateIntersectionOptions,
): Sentinel<IntersectionState | null> {
  const target = resolveElementWindow(element);
  const IntersectionObserverConstructor = target.IntersectionObserver;
  if (typeof IntersectionObserverConstructor !== 'function') {
    throw new SentinelUnavailableError('IntersectionObserver is not available in this environment.');
  }

  return createSentinel<IntersectionState | null>(
    {
      initialValue: null,
      ...options,
    },
    (update) => {
      const observer = new IntersectionObserverConstructor(
        (entries) => {
          const entry = entries.at(-1);
          if (!entry) return;

          update({
            intersectionRatio: entry.intersectionRatio,
            isIntersecting: entry.isIntersecting,
          });
        },
        {
          root: options?.root,
          rootMargin: options?.rootMargin,
          scrollMargin: options?.scrollMargin,
          threshold: options?.threshold,
        },
      );

      try {
        observer.observe(element);
      } catch (error) {
        observer.disconnect();
        throw error;
      }

      return () => observer.disconnect();
    },
  );
}
