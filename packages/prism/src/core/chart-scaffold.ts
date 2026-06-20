import type { Readable } from '@vielzeug/ripple';

import { effect, scope } from '@vielzeug/ripple';

import type { LegendState } from '../interaction/legend';
import type { TooltipState } from '../interaction/tooltip';
import type { BaseChartConfig, ChartDimensions, ChartHandle, ChartPluginContext } from '../types';

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
  dimensions: Readable<ChartDimensions>;
  groups: ScaffoldGroups;
  legend: LegendState | null;
  svg: SVGSVGElement;
  tooltip: TooltipState | null;
}

export interface RadialScaffoldContext {
  container: HTMLElement;
  dimensions: Readable<ChartDimensions>;
  legend: LegendState | null;
  svg: SVGSVGElement;
  tooltip: TooltipState | null;
}

export interface ChartEventHandlers {
  onClick?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
}

function runScaffold<TCtx>(
  container: HTMLElement,
  config: BaseChartConfig,
  buildCtx: (
    base: {
      chartArea: SVGGElement;
      dimensions: Readable<ChartDimensions>;
      svg: SVGSVGElement;
    },
    tooltip: TooltipState | null,
    legend: LegendState | null,
  ) => TCtx,
  renderFn: (ctx: TCtx) => ChartEventHandlers | void,
): ChartHandle {
  const base = createChartBase(container, { ariaLabel: config.ariaLabel, margin: config.margin });
  const tooltip = config.tooltip ? createTooltip(container, config.tooltip) : null;
  const legend = config.legend ? createLegend(container, config.legend) : null;
  const ctx = buildCtx(base, tooltip, legend);

  let disposed = false;
  const events = makeEventManager(base.svg);

  const s = scope(() => {
    effect(
      () => {
        if (disposed) return;

        events.attach(renderFn(ctx));
      },
      { scheduler: 'microtask' },
    );
  });

  if (config.plugins) {
    const pluginCtx: ChartPluginContext = { container, dimensions: base.dimensions, svg: base.svg };

    for (const plugin of config.plugins) {
      plugin.install(pluginCtx);
    }
  }

  return {
    dispose() {
      if (disposed) return;

      disposed = true;
      events.detach();

      if (config.plugins) for (const p of config.plugins) p.dispose();

      tooltip?.dispose();
      legend?.dispose();
      s.dispose();
      base.dispose();
    },
    el: base.svg,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}

function makeEventManager(svg: SVGSVGElement): {
  attach(handlers: ChartEventHandlers | void): void;
  detach(): void;
} {
  let active: ChartEventHandlers | null = null;

  return {
    attach(handlers) {
      if (active) {
        if (active.onMouseMove) svg.removeEventListener('mousemove', active.onMouseMove);

        if (active.onMouseLeave) svg.removeEventListener('mouseleave', active.onMouseLeave);

        if (active.onClick) svg.removeEventListener('click', active.onClick);

        active = null;
      }

      if (!handlers) return;

      active = handlers;

      if (handlers.onMouseMove) svg.addEventListener('mousemove', handlers.onMouseMove);

      if (handlers.onMouseLeave) svg.addEventListener('mouseleave', handlers.onMouseLeave);

      if (handlers.onClick) svg.addEventListener('click', handlers.onClick);
    },
    detach() {
      this.attach(undefined);
    },
  };
}

/**
 * Cartesian scaffold: provides grid/axis/series SVG groups and a reactive
 * render loop. `renderFn` is called inside a reactive effect; it returns
 * optional `ChartEventHandlers` that are attached/replaced on every render.
 */
export function createChartScaffold(
  container: HTMLElement,
  config: BaseChartConfig,
  renderFn: (ctx: ScaffoldContext) => ChartEventHandlers | void,
): ChartHandle {
  return runScaffold(
    container,
    config,
    (base, tooltip, legend) => {
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

      return {
        chartArea: base.chartArea,
        container,
        dimensions: base.dimensions,
        groups,
        legend,
        svg: base.svg,
        tooltip,
      } satisfies ScaffoldContext;
    },
    renderFn,
  );
}

/**
 * Radial scaffold: for charts that do not use cartesian axis groups
 * (pie, donut, semi). Provides only tooltip, legend, and the SVG root.
 */
export function createRadialScaffold(
  container: HTMLElement,
  config: BaseChartConfig,
  renderFn: (ctx: RadialScaffoldContext) => ChartEventHandlers | void,
): ChartHandle {
  return runScaffold(
    container,
    config,
    (base, tooltip, legend) =>
      ({
        container,
        dimensions: base.dimensions,
        legend,
        svg: base.svg,
        tooltip,
      }) satisfies RadialScaffoldContext,
    renderFn,
  );
}
