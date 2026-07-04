import type { Readable } from '@vielzeug/ripple';

import { effect, scope } from '@vielzeug/ripple';

import type { CrosshairState } from '../interaction/crosshair';
import type { LegendState } from '../interaction/legend';
import type { TooltipState } from '../interaction/tooltip';
import type { BaseChartConfig, ChartDimensions, ChartHandle, ChartPlugin, ChartPluginContext } from '../types';

import { error } from '../_dev';
import { createLegend } from '../interaction/legend';
import { createTooltip } from '../interaction/tooltip';
import { createSvgElement, removeChildren } from '../svg/element';
import { createChartBase } from './chart-base';

export interface ScaffoldGroups {
  grid: SVGGElement;
  series: SVGGElement;
  xAxis: SVGGElement;
  yAxis: SVGGElement;
}

/**
 * Clears a cartesian chart's series/grid/axis groups and hides its legend/tooltip/crosshair —
 * shared by every cartesian chart factory's "no data" early-return so a reactive series
 * transitioning to empty leaves a fully blank chart, not a half-cleared one.
 */
export function clearCartesianDom(
  groups: ScaffoldGroups,
  legend: LegendState | null,
  tooltip: TooltipState | null,
  crosshair?: CrosshairState | null,
): void {
  removeChildren(groups.series);
  removeChildren(groups.grid);
  removeChildren(groups.xAxis);
  removeChildren(groups.yAxis);
  legend?.update([]);
  tooltip?.hide();
  crosshair?.hide();
}

export interface ScaffoldContext {
  chartArea: SVGGElement;
  container: HTMLElement;
  dimensions: Readable<ChartDimensions>;
  /** Aborted when the chart is disposed — renderers use this to stop rescheduling in-flight `requestAnimationFrame` transitions. */
  disposalSignal: AbortSignal;
  groups: ScaffoldGroups;
  legend: LegendState | null;
  svg: SVGSVGElement;
  tooltip: TooltipState | null;
}

export interface RadialScaffoldContext {
  container: HTMLElement;
  dimensions: Readable<ChartDimensions>;
  /** Aborted when the chart is disposed — renderers use this to stop rescheduling in-flight `requestAnimationFrame` transitions. */
  disposalSignal: AbortSignal;
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
    disposalSignal: AbortSignal,
  ) => TCtx,
  renderFn: (ctx: TCtx) => ChartEventHandlers | void,
): ChartHandle {
  const base = createChartBase(container, { ariaLabel: config.ariaLabel, margin: config.margin });
  const tooltip = config.tooltip ? createTooltip(container, config.tooltip) : null;
  const legend = config.legend ? createLegend(container, config.legend) : null;
  const ac = new AbortController();
  const ctx = buildCtx(base, tooltip, legend, ac.signal);

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

  const installedPlugins: ChartPlugin[] = [];

  if (config.plugins) {
    const pluginCtx: ChartPluginContext = {
      container,
      dimensions: base.dimensions,
      disposalSignal: ac.signal,
      svg: base.svg,
    };

    for (const plugin of config.plugins) {
      try {
        plugin.install(pluginCtx);
        installedPlugins.push(plugin);
      } catch (err) {
        error('A chart plugin threw during install() — skipping it; the rest of the chart still renders.', err);
      }
    }
  }

  return {
    get disposalSignal(): AbortSignal {
      return ac.signal;
    },

    dispose() {
      if (disposed) return;

      disposed = true;
      ac.abort();
      events.detach();

      for (const p of installedPlugins) {
        try {
          p.dispose();
        } catch (err) {
          error('A chart plugin threw during dispose() — continuing to tear down the rest of the chart.', err);
        }
      }

      tooltip?.dispose();
      legend?.dispose();
      s.dispose();
      base.dispose();
    },

    get disposed(): boolean {
      return disposed;
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
    (base, tooltip, legend, disposalSignal) => {
      const groups: ScaffoldGroups = {
        // Grid lines are purely decorative relative to the root svg's own role="img"/aria-label.
        // Axis groups are NOT hidden wholesale — they can contain a meaningful `.prism-axis-title`;
        // `renderAxis` marks its own decorative tick lines/labels individually instead.
        grid: createSvgElement('g', { 'aria-hidden': 'true', class: 'prism-grid' }),
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
        disposalSignal,
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
    (base, tooltip, legend, disposalSignal) =>
      ({
        container,
        dimensions: base.dimensions,
        disposalSignal,
        legend,
        svg: base.svg,
        tooltip,
      }) satisfies RadialScaffoldContext,
    renderFn,
  );
}
