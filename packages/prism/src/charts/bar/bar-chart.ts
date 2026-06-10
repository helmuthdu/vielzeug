import type { BarChartConfig, BarVariant, ChartHandle, DataPoint } from '../../types';

import { renderAxis } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { resolve } from '../../core/resolve';
import { getMousePosition } from '../../interaction/events';
import { bandScale } from '../../scales/band';
import { linearScale } from '../../scales/linear';
import { createSvgElement } from '../../svg/element';
import { seriesColor } from '../../types';
import { renderBars } from './bar-renderer';

// ─── Scale context ────────────────────────────────────────────────────────────
// Uniform representation for both orientations. "band" is always the category
// axis; "value" is always the value axis. Callers use `horizontal` to know
// which SVG dimension each maps to.

interface BarScaleContext {
  bandCenter: (cat: string) => number;
  bandwidth: number;
  baselinePx: number;
  horizontal: boolean;
  stacked: boolean;
  stackedTops: number[][]; // [seriesIdx][catIdx] = cumulative top value
  valueScale: ReturnType<typeof linearScale>;
}

function variantFlags(variant: BarVariant): { horizontal: boolean; stacked: boolean } {
  return {
    horizontal: variant === 'grouped-horizontal' || variant === 'stacked-horizontal',
    stacked: variant === 'stacked' || variant === 'stacked-horizontal',
  };
}

// ─── Hit detection helpers ────────────────────────────────────────────────────

function findCatIdx(pos: number, categories: string[], sc: BarScaleContext): number {
  for (let i = 0; i < categories.length; i++) {
    const center = sc.bandCenter(categories[i]);
    const start = center - sc.bandwidth / 2;

    if (pos >= start && pos < start + sc.bandwidth) return i;
  }

  return -1;
}

function findSeriesIdx(
  pos: { x: number; y: number },
  catIdx: number,
  categories: string[],
  _allData: DataPoint[][],
  sc: BarScaleContext,
  seriesCount: number,
): number {
  if (sc.stacked) {
    if (sc.horizontal) {
      // Walk series left→right; first whose right edge >= pos.x
      for (let si = 0; si < seriesCount; si++) {
        const rightX = sc.valueScale.map(sc.stackedTops[si]?.[catIdx] ?? 0);

        if (rightX >= pos.x) return si;
      }

      return seriesCount - 1;
    } else {
      // Walk series bottom→top; find where bar top crosses above pos.y
      for (let si = 0; si < seriesCount; si++) {
        const topY = sc.valueScale.map(sc.stackedTops[si]?.[catIdx] ?? 0);

        if (topY <= pos.y) return si;
      }

      return seriesCount - 1;
    }
  } else {
    // Grouped: sub-division within band
    const subSize = sc.bandwidth / seriesCount;
    const bandStart = sc.bandCenter(categories[catIdx]) - sc.bandwidth / 2;
    const offset = sc.horizontal ? pos.y - bandStart : pos.x - bandStart;
    const subIdx = Math.floor(offset / subSize);

    return Math.max(0, Math.min(seriesCount - 1, subIdx));
  }
}

function isOutsideBars(
  pos: { x: number; y: number },
  catIdx: number,
  allData: DataPoint[][],
  sc: BarScaleContext,
  seriesCount: number,
): boolean {
  const lastSi = seriesCount - 1;
  const maxVal = sc.stacked
    ? (sc.stackedTops[lastSi]?.[catIdx] ?? 0)
    : Math.max(...Array.from({ length: seriesCount }, (_, si) => allData[si]?.[catIdx]?.y ?? 0));
  const maxPx = sc.valueScale.map(maxVal);

  // Horizontal: pos.x beyond right edge; vertical: pos.y above top edge
  return sc.horizontal ? pos.x > maxPx : pos.y < maxPx;
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function createBarChart(container: HTMLElement, config: BarChartConfig): ChartHandle {
  return createChartScaffold(container, config, (ctx) => {
    const { groups, legend, tooltip } = ctx;
    const dims = ctx.dimensions.value;
    const area = chartArea(dims.width, dims.height, dims.margin);
    const seriesList = resolve(config.series);
    const allData = seriesList.map((s) => resolve(s.data));
    const categories = [...new Set(allData.flat().map((d) => String(d.x)))];

    if (categories.length === 0) {
      if (import.meta.env?.DEV) console.warn('[prism] createBarChart: no data');

      return;
    }

    const { horizontal, stacked } = variantFlags(config.variant ?? 'grouped');

    // Value domain
    let vMax: number;
    let vMin: number;

    if (stacked) {
      const sums = categories.map((cat) =>
        allData.reduce((sum, sd) => {
          const pt = sd.find((d) => String(d.x) === cat);

          return sum + (pt ? Math.max(0, pt.y) : 0);
        }, 0),
      );

      vMax = Math.max(...sums);
      vMin = 0;
    } else {
      const allY = allData.flat().map((d) => d.y);

      vMax = Math.max(...allY);
      vMin = Math.min(0, ...allY);
    }

    // Build uniform scale context
    const catScale = horizontal
      ? bandScale({ domain: categories, range: [0, area.height] })
      : bandScale({ domain: categories, range: [0, area.width] });

    const valScale = horizontal
      ? linearScale({ domain: [vMin, vMax], range: [0, area.width] })
      : linearScale({ domain: [vMin, vMax], range: [area.height, 0] });

    const stackedTops: number[][] = [];
    const stackTops: Record<string, number> = {};

    for (const cat of categories) stackTops[cat] = 0;

    const sc: BarScaleContext = {
      bandCenter: (cat) => catScale.map(cat) + catScale.bandwidth() / 2,
      bandwidth: catScale.bandwidth(),
      baselinePx: valScale.map(0),
      horizontal,
      stacked,
      stackedTops,
      valueScale: valScale,
    };

    // Axes & grid
    if (horizontal) {
      if (config.xAxis?.grid) renderGrid(groups.grid, valScale, config.xAxis.grid, area.height, area.width, 'vertical');

      if (config.yAxis) renderAxis(groups.yAxis, catScale, config.yAxis, area.height);

      if (config.xAxis) {
        groups.xAxis.setAttribute('transform', `translate(0,${area.height})`);
        renderAxis(groups.xAxis, valScale, config.xAxis, area.width);
      }
    } else {
      if (config.yAxis?.grid)
        renderGrid(groups.grid, valScale, config.yAxis.grid, area.height, area.width, 'horizontal');

      if (config.xAxis) {
        groups.xAxis.setAttribute('transform', `translate(0,${area.height})`);
        renderAxis(groups.xAxis, catScale, config.xAxis, area.width);
      }

      if (config.yAxis) renderAxis(groups.yAxis, valScale, config.yAxis, area.height);
    }

    // Series groups
    while (groups.series.children.length > seriesList.length) {
      groups.series.removeChild(groups.series.lastChild!);
    }

    for (let i = 0; i < seriesList.length; i++) {
      const series = seriesList[i];
      let group = groups.series.children[i] as SVGGElement | undefined;

      if (!group) {
        group = createSvgElement('g', { class: 'prism-bar-series' });
        groups.series.appendChild(group);
      }

      const barData = allData[i].map((d) => {
        const x = String(d.x);

        if (stacked) {
          const base = stackTops[x] ?? 0;
          const top = base + Math.max(0, d.y);

          stackTops[x] = top;

          return { base, x, y: top };
        }

        return { base: 0, x, y: d.y };
      });

      stackedTops[i] = barData.map((d) => d.y);

      const baselineYs = stacked ? barData.map((d) => valScale.map(d.base)) : undefined;

      renderBars(group, barData, catScale, valScale, sc.baselinePx, {
        baselineYs,
        borderRadius: series.borderRadius ?? 0,
        color: seriesColor(i, series.color),
        horizontal,
        seriesCount: seriesList.length,
        seriesIndex: i,
        stacked,
        transition: config.transition,
      });
    }

    if (legend) {
      legend.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
    }

    if (tooltip) tooltip.hide();

    // ─── Event handlers (close over render-derived state) ─────────────────────

    const onMouseMove = (event: MouseEvent) => {
      const d = ctx.dimensions.value;
      const pos = getMousePosition(ctx.svg, event, d.margin.left, d.margin.top);
      const a = chartArea(d.width, d.height, d.margin);

      if (pos.x < 0 || pos.x > a.width || pos.y < 0 || pos.y > a.height) {
        tooltip?.hide();

        return;
      }

      const posBand = horizontal ? pos.y : pos.x;
      const catIdx = findCatIdx(posBand, categories, sc);

      if (catIdx === -1) {
        tooltip?.hide();

        return;
      }

      if (isOutsideBars(pos, catIdx, allData, sc, seriesList.length)) {
        tooltip?.hide();

        return;
      }

      const seriesIdx = findSeriesIdx(pos, catIdx, categories, allData, sc, seriesList.length);
      const point = allData[seriesIdx]?.[catIdx];

      if (point) {
        const bandCenterPx = sc.bandCenter(categories[catIdx]);
        const stackedTop = stacked ? (stackedTops[seriesIdx]?.[catIdx] ?? point.y) : point.y;
        const valuePx = valScale.map(stackedTop);

        const tooltipX = horizontal ? valuePx + d.margin.left : bandCenterPx + d.margin.left;
        const tooltipY = horizontal ? bandCenterPx + d.margin.top : valuePx + d.margin.top;

        tooltip?.show(tooltipX, tooltipY, point, seriesList[seriesIdx]);
        config.onHover?.({ originalEvent: event, point, series: seriesList[seriesIdx] });
      }
    };

    const onMouseLeave = () => {
      tooltip?.hide();
      config.onHover?.(null);
    };

    const onClick = (event: MouseEvent) => {
      if (!config.onClick) return;

      const d = ctx.dimensions.value;
      const pos = getMousePosition(ctx.svg, event, d.margin.left, d.margin.top);
      const a = chartArea(d.width, d.height, d.margin);

      if (pos.x < 0 || pos.x > a.width || pos.y < 0 || pos.y > a.height) return;

      const posBand = horizontal ? pos.y : pos.x;
      const catIdx = findCatIdx(posBand, categories, sc);

      if (catIdx === -1) return;

      const seriesIdx = findSeriesIdx(pos, catIdx, categories, allData, sc, seriesList.length);
      const point = allData[seriesIdx]?.[catIdx];

      if (point) {
        config.onClick({ originalEvent: event, point, series: seriesList[seriesIdx] });
      }
    };

    return { onClick, onMouseLeave, onMouseMove };
  });
}
