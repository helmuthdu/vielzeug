import { PrismRenderError } from '../errors';
import type { CrosshairState } from '../interaction/crosshair';
import type { LegendState } from '../interaction/legend';
import { createLegend } from '../interaction/legend';
import type { TooltipState } from '../interaction/tooltip';
import { createTooltip } from '../interaction/tooltip';
import { createSvgElement, removeChildren } from '../svg/element';
import type { BaseChartConfig, ChartDimensions, ChartHandle } from '../types';
import { createChartBase } from './chart-base';

export interface ScaffoldGroups {
  grid: SVGGElement;
  series: SVGGElement;
  xAxis: SVGGElement;
  yAxis: SVGGElement;
}

/**
 * Clears a cartesian chart's series/grid/axis groups and hides its legend/tooltip/crosshair —
 * shared by every cartesian chart factory's "no data" early-return so an update
 * to empty data leaves a fully blank chart, not a half-cleared one.
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
  dimensions: ChartDimensions;
  /** Aborted when the chart is disposed — renderers use this to stop rescheduling in-flight `requestAnimationFrame` transitions. */
  disposalSignal: AbortSignal;
  groups: ScaffoldGroups;
  legend: LegendState | null;
  svg: SVGSVGElement;
  tooltip: TooltipState | null;
}

export interface RadialScaffoldContext {
  container: HTMLElement;
  dimensions: ChartDimensions;
  /** Aborted when the chart is disposed — renderers use this to stop rescheduling in-flight `requestAnimationFrame` transitions. */
  disposalSignal: AbortSignal;
  legend: LegendState | null;
  svg: SVGSVGElement;
  tooltip: TooltipState | null;
}

export interface ChartEventHandlers {
  onClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
}

function runScaffold<TCtx, TData>(
  container: HTMLElement,
  config: BaseChartConfig,
  buildCtx: (
    base: {
      chartArea: SVGGElement;
      dimensions: ChartDimensions;
      svg: SVGSVGElement;
    },
    tooltip: TooltipState | null,
    legend: LegendState | null,
    disposalSignal: AbortSignal,
  ) => TCtx,
  renderFn: (ctx: TCtx) => ChartEventHandlers | undefined,
  updateData: (data: TData) => void,
): ChartHandle<TData> {
  let render = () => {};
  const base = createChartBase(container, { a11y: config.a11y, margin: config.margin }, () => render());
  const tooltip = config.tooltip ? createTooltip(container, config.tooltip) : null;
  const legend = config.legend ? createLegend(container, config.legend) : null;
  const ac = new AbortController();
  const ctx = buildCtx(base, tooltip, legend, ac.signal);

  let disposed = false;
  const events = makeEventManager(base.svg);

  render = () => {
    if (disposed) return;
    events.attach(renderFn(ctx));
  };

  try {
    render();
  } catch (error) {
    disposed = true;
    ac.abort();
    events.detach();
    tooltip?.dispose();
    legend?.dispose();
    base.dispose();
    throw error instanceof PrismRenderError ? error : new PrismRenderError('Failed to render chart.', { cause: error });
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
      tooltip?.dispose();
      legend?.dispose();
      base.dispose();
    },

    get disposed(): boolean {
      return disposed;
    },

    el: base.svg,

    update(data) {
      if (disposed) throw new PrismRenderError('Cannot update a disposed chart.');
      updateData(data);
      render();
    },

    [Symbol.dispose]() {
      this.dispose();
    },
  };
}

function makeEventManager(svg: SVGSVGElement): {
  attach(handlers: ChartEventHandlers | undefined): void;
  detach(): void;
} {
  let active: ChartEventHandlers | null = null;

  return {
    attach(handlers) {
      if (active) {
        if (active.onMouseMove) svg.removeEventListener('mousemove', active.onMouseMove);

        if (active.onMouseLeave) svg.removeEventListener('mouseleave', active.onMouseLeave);

        if (active.onClick) svg.removeEventListener('click', active.onClick);

        if (active.onKeyDown) svg.removeEventListener('keydown', active.onKeyDown);

        active = null;
      }

      if (!handlers) return;

      active = handlers;

      if (handlers.onMouseMove) svg.addEventListener('mousemove', handlers.onMouseMove);

      if (handlers.onMouseLeave) svg.addEventListener('mouseleave', handlers.onMouseLeave);

      if (handlers.onClick) svg.addEventListener('click', handlers.onClick);

      if (handlers.onKeyDown) svg.addEventListener('keydown', handlers.onKeyDown);
    },
    detach() {
      this.attach(undefined);
    },
  };
}

/**
 * Cartesian scaffold: provides grid/axis/series SVG groups and a render loop.
 * `renderFn` returns optional `ChartEventHandlers` that are attached/replaced
 * after every data update or resize.
 */
export function createChartScaffold<TData>(
  container: HTMLElement,
  config: BaseChartConfig,
  renderFn: (ctx: ScaffoldContext) => ChartEventHandlers | undefined,
  updateData: (data: TData) => void,
): ChartHandle<TData> {
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
    updateData,
  );
}

/**
 * Radial scaffold: for charts that do not use cartesian axis groups
 * (pie, donut, semi). Provides only tooltip, legend, and the SVG root.
 */
export function createRadialScaffold<TData>(
  container: HTMLElement,
  config: BaseChartConfig,
  renderFn: (ctx: RadialScaffoldContext) => ChartEventHandlers | undefined,
  updateData: (data: TData) => void,
): ChartHandle<TData> {
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
    updateData,
  );
}
