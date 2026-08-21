import { listenMediaQuery, resolveWindow } from './_platform.ts';
import { createSentinel } from './core.ts';
import type { Sentinel, ViewportState, WindowSentinelOptions } from './types.ts';

export function createViewport(options?: WindowSentinelOptions): Sentinel<ViewportState> {
  const target = resolveWindow(options?.target);
  const read = (): ViewportState => ({
    dpr: target.devicePixelRatio,
    height: target.innerHeight,
    width: target.innerWidth,
  });

  return createSentinel(
    {
      initialValue: read(),
      ...options,
    },
    (update) => {
      const onResize = () => update(read());
      let stopDprObservation: (() => void) | undefined;

      const observeDpr = () => {
        stopDprObservation?.();
        stopDprObservation = undefined;

        if (typeof target.matchMedia !== 'function') return;

        const mediaQuery = target.matchMedia(`(resolution: ${target.devicePixelRatio}dppx)`);
        stopDprObservation = listenMediaQuery(mediaQuery, () => {
          update(read());
          observeDpr();
        });
      };

      target.addEventListener('resize', onResize);
      observeDpr();

      return () => {
        target.removeEventListener('resize', onResize);
        stopDprObservation?.();
      };
    },
  );
}
