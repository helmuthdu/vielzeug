import type { Signal } from '@vielzeug/ripple';

import { effect, scope } from '@vielzeug/ripple';

import type { BaseChartConfig, ChartDimensions, ChartHandle } from '../types';

import { createLegend } from '../interaction/legend';
import { createTooltip } from '../interaction/tooltip';
import { createSvgElement } from '../svg/element';
import { createChartBase } from './chart-base';

export interface ScaffoldGroups {
  grid: SVGGElement;
  series: SVGGElement;
  xAxis: SVGGElement;
  yAxis: SVGGElement;
}

export interface ScaffoldContext {
  chartArea: SVGGElement;
  container: HTMLElement;
  dimensions: Signal<ChartDimensions>;
  groups: ScaffoldGroups;
  legend: ReturnType<typeof createLegend>;
  svg: SVGSVGElement;
  tooltip: ReturnType<typeof createTooltip>;
}

const NULL_TOOLTIP: ReturnType<typeof createTooltip> = {
  destroy() {},
  el: null as unknown as HTMLDivElement,
  hide() {},
  show() {},
};

const NULL_LEGEND: ReturnType<typeof createLegend> = {
  destroy() {},
  el: null as unknown as HTMLDivElement,
  update() {},
};

export interface ChartEventHandlers {
  onClick?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
}

/**
 * `renderFn` is called inside a reactive effect whenever signals change.
 * It returns an optional `ChartEventHandlers` object; the scaffold attaches
 * those listeners to the SVG and tears them down before the next render or
 * on dispose — so handlers always close over the freshest render state.
 */
export function createChartScaffold(
  container: HTMLElement,
  config: BaseChartConfig,
  renderFn: (ctx: ScaffoldContext) => ChartEventHandlers | void,
): ChartHandle {
  const base = createChartBase(container, { ariaLabel: config.ariaLabel, margin: config.margin });

  const tooltip = config.tooltip ? createTooltip(container, config.tooltip) : NULL_TOOLTIP;
  const legend = config.legend ? createLegend(container, config.legend) : NULL_LEGEND;

  const groups: ScaffoldGroups = {
    grid: createSvgElement('g', { class: 'prism-grid' }),
    series: createSvgElement('g', { class: 'prism-series' }),
    xAxis: createSvgElement('g', { class: 'prism-x-axis' }),
    yAxis: createSvgElement('g', { class: 'prism-y-axis' }),
  };

  base.chartArea.appendChild(groups.grid);
  base.chartArea.appendChild(groups.xAxis);
  base.chartArea.appendChild(groups.yAxis);
  base.chartArea.appendChild(groups.series);

  const ctx: ScaffoldContext = {
    chartArea: base.chartArea,
    container,
    dimensions: base.dimensions,
    groups,
    legend,
    svg: base.svg,
    tooltip,
  };

  let disposed = false;
  let activeHandlers: ChartEventHandlers | null = null;

  function detachHandlers(): void {
    if (!activeHandlers) return;

    if (activeHandlers.onMouseMove) base.svg.removeEventListener('mousemove', activeHandlers.onMouseMove);

    if (activeHandlers.onMouseLeave) base.svg.removeEventListener('mouseleave', activeHandlers.onMouseLeave);

    if (activeHandlers.onClick) base.svg.removeEventListener('click', activeHandlers.onClick);

    activeHandlers = null;
  }

  function attachHandlers(handlers: ChartEventHandlers | void): void {
    detachHandlers();

    if (!handlers) return;

    activeHandlers = handlers;

    if (handlers.onMouseMove) base.svg.addEventListener('mousemove', handlers.onMouseMove);

    if (handlers.onMouseLeave) base.svg.addEventListener('mouseleave', handlers.onMouseLeave);

    if (handlers.onClick) base.svg.addEventListener('click', handlers.onClick);
  }

  const s = scope(() => {
    effect(
      () => {
        if (disposed) return;

        const handlers = renderFn(ctx);

        attachHandlers(handlers);
      },
      { scheduler: 'raf' },
    );
  });

  if (config.plugins) {
    for (const plugin of config.plugins) {
      plugin.install(base.svg, container);
    }
  }

  return {
    dispose() {
      if (disposed) return;

      disposed = true;
      detachHandlers();

      if (config.plugins) {
        for (const plugin of config.plugins) {
          plugin.destroy();
        }
      }

      tooltip.destroy();
      legend.destroy();
      s.dispose();
      base.dispose();
    },
    el: base.svg,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
