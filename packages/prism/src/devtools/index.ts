/**
 * @vielzeug/prism — debug utilities for chart visualisation.
 *
 * Import from the dedicated sub-path so debug code is tree-shaken from
 * production bundles:
 * ```ts
 * import { debugChart } from '@vielzeug/prism/devtools';
 * ```
 *
 * Internal validation warnings (misuse of the public API) are emitted
 * automatically in development builds and live in the private `src/_dev.ts`
 * module. They are not part of this sub-path.
 */

import type { ChartHandle } from '../types';

/** Options for {@link debugChart}. */
export interface DebugChartOptions {
  /**
   * Label used in log prefixes. Defaults to `'chart'`, producing `[prism:chart]`.
   * Useful when debugging multiple charts on the same page so their log output
   * can be distinguished:
   * ```ts
   * debugChart(createLineChart(el, config), { label: 'revenue' });
   * // [prism:revenue] mounted
   * ```
   */
  label?: string;
}

/**
 * Wraps an already-created {@link ChartHandle} with lifecycle logging pre-wired to
 * `console.debug`, imported from a dedicated sub-path so `console.debug` references
 * and the `ResizeObserver` it uses are tree-shaken from production bundles when this
 * sub-path is not imported.
 *
 * Logs the chart's mount, every resize (via its own `ResizeObserver` on `handle.el`,
 * independent of the chart's internal one), and disposal, each with `[prism:<label>]`
 * prefixes. Returns the same handle unchanged so it can wrap any `create*Chart()` call
 * in place.
 *
 * @example
 * ```ts
 * import { createLineChart } from '@vielzeug/prism';
 * import { debugChart } from '@vielzeug/prism/devtools';
 *
 * const chart = debugChart(createLineChart(container, config), { label: 'revenue' });
 * // [prism:revenue] mounted
 * // [prism:revenue] resized  600×300
 * chart.dispose();
 * // [prism:revenue] disposed
 * ```
 */
export function debugChart<T extends ChartHandle>(handle: T, options?: DebugChartOptions): T {
  const prefix = `[prism:${options?.label ?? 'chart'}]`;

  console.debug(`${prefix} mounted`);

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];

    if (entry) {
      const { height, width } = entry.contentRect;

      console.debug(`${prefix} resized  ${Math.round(width)}×${Math.round(height)}`);
    }
  });

  resizeObserver.observe(handle.el);

  handle.disposalSignal.addEventListener(
    'abort',
    () => {
      resizeObserver.disconnect();
      console.debug(`${prefix} disposed`);
    },
    { once: true },
  );

  return handle;
}
