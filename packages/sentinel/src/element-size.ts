import { resolveElementWindow } from './_platform.ts';
import { createSentinel } from './core.ts';
import { SentinelUnavailableError } from './errors.ts';
import type { ElementSizeState, Sentinel, SentinelOptions } from './types.ts';

export function createElementSize(element: Element, options?: SentinelOptions): Sentinel<ElementSizeState | null> {
  const target = resolveElementWindow(element);
  const ResizeObserverConstructor = target.ResizeObserver;
  if (typeof ResizeObserverConstructor !== 'function') {
    throw new SentinelUnavailableError('ResizeObserver is not available in this environment.');
  }

  return createSentinel<ElementSizeState | null>(
    {
      initialValue: null,
      ...options,
    },
    (update) => {
      const observer = new ResizeObserverConstructor((entries) => {
        const entry = entries.at(-1);
        if (!entry) return;

        update({
          height: entry.contentRect.height,
          width: entry.contentRect.width,
        });
      });

      try {
        observer.observe(element, { box: 'content-box' });
      } catch (error) {
        observer.disconnect();
        throw error;
      }

      return () => observer.disconnect();
    },
  );
}
