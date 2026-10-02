import type { ChartHandle } from '@vielzeug/prism';
import { onBeforeUnmount, onMounted, type Ref, watch } from 'vue';

/**
 * Bridges a framework-agnostic Prism chart factory into a component: bind `container` to the
 * chart host through a template ref; the chart is created once a container and a non-empty
 * series exist, updated when the config changes, and disposed when either goes away or the
 * scope ends. Window resizes re-sync through the same path, so a remounted container rebuilds
 * its chart.
 */
export function usePrismChart<C extends { series: readonly unknown[] }>(
  container: Ref<HTMLElement | null>,
  create: (element: HTMLElement, config: C) => ChartHandle<C['series']>,
  config: () => C,
): void {
  let chart: ChartHandle<C['series']> | null = null;
  let resizeFrame: number | null = null;

  function sync(): void {
    const element = container.value;
    const next = config();

    // A missing container or an empty series keeps no chart: the surface is hidden or has
    // nothing to draw, and an earlier chart on it must not linger.
    if (!element || next.series.length === 0) {
      chart?.dispose();
      chart = null;
      return;
    }

    if (chart) chart.update(next.series);
    else chart = create(element, next);
  }

  function scheduleResize(): void {
    if (resizeFrame !== null) return;

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      sync();
    });
  }

  // Watching the container covers the populated/empty template swap too: an unmounted container
  // disposes its chart, and a remounted one rebuilds it without waiting for new data.
  watch([container, config], sync, { flush: 'post' });
  onMounted(() => {
    sync();
    window.addEventListener('resize', scheduleResize);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('resize', scheduleResize);
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    chart?.dispose();
    chart = null;
  });
}
