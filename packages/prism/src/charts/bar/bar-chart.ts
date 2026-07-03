import { isReactive } from '@vielzeug/ripple';

import type { BarChartConfig, BarVariant, ChartHandle } from '../../types';
import type { BarScaleContext } from './bar-scale-context';

import { warn } from '../../_dev';
import { renderAxis } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { getMousePosition } from '../../interaction/events';
import { bandScale } from '../../scales/band';
import { linearScale } from '../../scales/linear';
import { createSvgElement } from '../../svg/element';
import { seriesColor } from '../../theme';
import { findCatIdx, findSeriesIdx, isOutsideBars } from './bar-hit-test';
import { renderBars } from './bar-renderer';

function variantFlags(variant: BarVariant): { horizontal: boolean; stacked: boolean } {
  return {
    horizontal: variant === 'grouped-horizontal' || variant === 'stacked-horizontal',
    stacked: variant === 'stacked' || variant === 'stacked-horizontal',
  };
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function createBarChart(container: HTMLElement, config: BarChartConfig): ChartHandle {
  return createChartScaffold(container, config, (ctx) => {
    const { groups, legend, tooltip } = ctx;
    const dims = ctx.dimensions.value;
    const area = chartArea(dims.width, dims.height, dims.margin);
    const seriesList = isReactive(config.series) ? config.series.value : config.series;
    const allData = seriesList.map((s) => (isReactive(s.data) ? s.data.value : s.data));
    const categories = [...new Set(allData.flat().map((d) => String(d.key)))];

    if (categories.length === 0) {
      warn('createBarChart: no data');

      return;
    }

    const { horizontal, stacked } = variantFlags(config.variant ?? 'grouped');

    // Value domain
    let vMax: number;
    let vMin: number;

    if (stacked) {
      const sums = categories.map((cat) =>
        allData.reduce((sum, sd) => {
          const pt = sd.find((d) => String(d.key) === cat);

          return sum + (pt ? Math.max(0, pt.value) : 0);
        }, 0),
      );

      vMax = Math.max(...sums);
      vMin = 0;
    } else {
      const allY = allData.flat().map((d) => d.value);

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
    const stackTops = Object.create(null) as Record<string, number>;

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
      if (config.xAxis?.grid) renderGrid(groups.grid, valScale, config.xAxis.grid, area.height, 'vertical');

      if (config.yAxis) renderAxis(groups.yAxis, catScale, config.yAxis, area.height);

      if (config.xAxis) {
        groups.xAxis.setAttribute('transform', `translate(0,${area.height})`);
        renderAxis(groups.xAxis, valScale, config.xAxis, area.width);
      }
    } else {
      if (config.yAxis?.grid) renderGrid(groups.grid, valScale, config.yAxis.grid, area.width, 'horizontal');

      if (config.xAxis) {
        groups.xAxis.setAttribute('transform', `translate(0,${area.height})`);
        renderAxis(groups.xAxis, catScale, config.xAxis, area.width);
      }

      if (config.yAxis) renderAxis(groups.yAxis, valScale, config.yAxis, area.height);
    }

    // Series groups
    while (groups.series.children.length > seriesList.length) {
      const last = groups.series.lastElementChild;

      if (last) groups.series.removeChild(last);
    }

    for (let i = 0; i < seriesList.length; i++) {
      const series = seriesList[i];
      let group = groups.series.children[i] as SVGGElement | undefined;

      if (!group) {
        group = createSvgElement('g', { class: 'prism-bar-series' });
        groups.series.appendChild(group);
      }

      const barData = allData[i].map((d) => {
        const key = String(d.key);

        if (stacked) {
          const base = stackTops[key] ?? 0;
          const top = base + Math.max(0, d.value);

          stackTops[key] = top;

          return { base, key, y: top };
        }

        return { base: 0, key, y: d.value };
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

    legend?.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
    tooltip?.hide();

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

      const seriesIdx = findSeriesIdx(pos, catIdx, categories, sc, seriesList.length);
      const point = allData[seriesIdx]?.[catIdx];

      if (point) {
        const bandCenterPx = sc.bandCenter(categories[catIdx]);
        const stackedTop = stacked ? (stackedTops[seriesIdx]?.[catIdx] ?? point.value) : point.value;
        const valuePx = valScale.map(stackedTop);

        const tooltipX = horizontal ? valuePx + d.margin.left : bandCenterPx + d.margin.left;
        const tooltipY = horizontal ? bandCenterPx + d.margin.top : valuePx + d.margin.top;

        tooltip?.show(tooltipX, tooltipY, point, seriesList[seriesIdx]);
        config.onHover?.({ datum: point, originalEvent: event, series: seriesList[seriesIdx] });
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

      const seriesIdx = findSeriesIdx(pos, catIdx, categories, sc, seriesList.length);
      const point = allData[seriesIdx]?.[catIdx];

      if (point) {
        config.onClick({ datum: point, originalEvent: event, series: seriesList[seriesIdx] });
      }
    };

    return { onClick, onMouseLeave, onMouseMove };
  });
}
