import { resolveWindow } from './_platform.ts';
import { createSentinel } from './core.ts';
import type { FullscreenSentinel, FullscreenState, SentinelOptions } from './types.ts';

type FullscreenWindow = Window & { document: Document };

/**
 * A sentinel-backed fullscreen view. `request()` enters fullscreen for an element (default:
 * the document element), `exit()` leaves it, and `toggle()` flips it: all degrade silently
 * when the Fullscreen API is missing or the browser refuses (user-activation requirements).
 * Disposing the sentinel exits fullscreen and stops tracking `fullscreenchange`.
 */
export function createFullscreen(
  options?: SentinelOptions & { readonly target?: FullscreenWindow },
): FullscreenSentinel {
  const target = resolveWindow(options?.target);
  const doc = target.document;
  const supported = typeof doc.documentElement?.requestFullscreen === 'function';

  const read = (): FullscreenState => ({ active: doc.fullscreenElement !== null, supported });
  let updateState: (value: FullscreenState) => void = () => {};

  const request = (element?: Element): void => {
    if (doc.fullscreenElement || !supported) return;
    void (element ?? doc.documentElement).requestFullscreen().catch(() => {
      // Requires user activation in some browsers, or the element may refuse; degrade silently.
    });
  };

  const exit = (): void => {
    if (!doc.fullscreenElement) return;
    void doc.exitFullscreen().catch(() => {
      // Degrade silently.
    });
  };

  const sentinel = createSentinel<FullscreenState>({ initialValue: read(), ...options }, (update) => {
    updateState = update;

    const onFullscreenChange = (): void => updateState(read());

    doc.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      doc.removeEventListener('fullscreenchange', onFullscreenChange);
      if (doc.fullscreenElement) exit();
    };
  });

  return {
    ...sentinel,
    exit,
    request,
    toggle(element?: Element): void {
      if (doc.fullscreenElement) exit();
      else request(element);
    },
  };
}
