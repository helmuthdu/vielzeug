import { warn } from '../../_dev';
import { positionAxis, renderAxis, resolveTickCount, resolveTicks } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { normalizeCartesianSeries } from '../../core/cartesian-model';
import { clearCartesianDom, createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { seriesDomId } from '../../core/series-id';
import { describeValues } from '../../interaction/announcer';
import { getMousePosition } from '../../interaction/events';
import { comparisonContent } from '../../interaction/tooltip';
import { bandScale } from '../../scales/band';
import { linearScale } from '../../scales/linear';
import { createSvgElement, setAttributes } from '../../svg/element';
import { seriesColor } from '../../theme';
import type {
  BarChartConfig,
  BarSeriesConfig,
  BarVariant,
  ChartEvent,
  ChartHandle,
  Datum,
  SeriesValue,
  XAxisConfig,
  YAxisConfig,
} from '../../types';
import { findCatIdx, findSeriesIdx } from './bar-hit-test';
import { renderBars } from './bar-renderer';
import type { BarScaleContext } from './bar-scale-context';

function variantFlags(variant: BarVariant): { horizontal: boolean; stacked: boolean } {
  return {
    horizontal: variant === 'grouped-horizontal' || variant === 'stacked-horizontal',
    stacked: variant === 'stacked' || variant === 'stacked-horizontal',
  };
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function createBarChart(container: HTMLElement, config: BarChartConfig): ChartHandle<BarSeriesConfig[]> {
  let seriesList = config.series;
  let band: SVGRectElement | null = null;

  return createChartScaffold(
    container,
    config,
    (ctx, reason) => {
      const { groups, legend, tooltip } = ctx;
      legend?.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
      const dims = ctx.dimensions;
      const area = chartArea(dims.width, dims.height, dims.margin);
      const sourceData = seriesList.map((series) => series.data);
      const model = normalizeCartesianSeries(seriesList, sourceData);
      const categories = model.domain;
      const allData = model.series.map(({ byKey }) => categories.map((key) => byKey.get(key)));
      const categoryAxis = (axis: XAxisConfig | YAxisConfig) => {
        return {
          ...axis,
          tickFormat: (value: Date | number | string) => {
            const key = String(value);
            const label = model.labels.get(key) ?? value;

            return axis.tickFormat ? axis.tickFormat(label) : String(label);
          },
        };
      };

      if (categories.length === 0) {
        clearCartesianDom(groups, legend, tooltip);
        band?.remove();
        band = null;

        return;
      }

      const { horizontal, stacked } = variantFlags(config.variant ?? 'grouped');

      // Axes render by default; `false` opts out. The value axis (x when horizontal, y
      // otherwise) carries gridlines by default and merges over that default, so a partial
      // config (e.g. only `tickFormat`) keeps the gridlines; the category axis defaults to none.
      const xAxisConfig: XAxisConfig | false =
        config.xAxis === false ? false : horizontal ? { grid: true, ...config.xAxis } : (config.xAxis ?? {});
      const yAxisConfig: YAxisConfig | false =
        config.yAxis === false ? false : horizontal ? (config.yAxis ?? {}) : { grid: true, ...config.yAxis };

      // Value domain
      let vMax: number;
      let vMin: number;

      if (stacked) {
        if (allData.some((seriesData) => seriesData.some((datum) => (datum?.value ?? 0) < 0))) {
          warn(
            'createBarChart: negative values in a stacked/stacked-horizontal series are clamped to 0: stacking mixed-sign data is not supported.',
          );
        }

        const sums = categories.map((_, categoryIndex) =>
          allData.reduce((sum, seriesData) => sum + Math.max(0, seriesData[categoryIndex]?.value ?? 0), 0),
        );

        vMax = Math.max(...sums);
        vMin = 0;
      } else {
        const allY = allData.flatMap((seriesData) => seriesData.flatMap((datum) => (datum ? [datum.value] : [])));

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
        if (xAxisConfig && xAxisConfig.grid) {
          renderGrid(
            groups.grid,
            valScale,
            xAxisConfig.grid,
            area.height,
            'vertical',
            resolveTicks(valScale, xAxisConfig, resolveTickCount(xAxisConfig, area.width, 'bottom')),
          );
        }

        if (yAxisConfig !== false) {
          const yAxis = categoryAxis(yAxisConfig);

          positionAxis(groups.yAxis, yAxis.position ?? 'left', area.width, area.height);
          renderAxis(groups.yAxis, catScale, yAxis, area.height, 'left');
        }

        if (xAxisConfig) {
          positionAxis(groups.xAxis, xAxisConfig.position ?? 'bottom', area.width, area.height);
          renderAxis(groups.xAxis, valScale, xAxisConfig, area.width, 'bottom');
        }
      } else {
        if (yAxisConfig && yAxisConfig.grid) {
          renderGrid(
            groups.grid,
            valScale,
            yAxisConfig.grid,
            area.width,
            'horizontal',
            resolveTicks(valScale, yAxisConfig, resolveTickCount(yAxisConfig, area.height, 'left')),
          );
        }

        if (xAxisConfig !== false) {
          const xAxis = categoryAxis(xAxisConfig);

          positionAxis(groups.xAxis, xAxis.position ?? 'bottom', area.width, area.height);
          renderAxis(groups.xAxis, catScale, xAxis, area.width, 'bottom');
        }

        if (yAxisConfig) {
          positionAxis(groups.yAxis, yAxisConfig.position ?? 'left', area.width, area.height);
          renderAxis(groups.yAxis, valScale, yAxisConfig, area.height, 'left');
        }
      }

      // Series groups
      // Stacked segments stay square so they join cleanly.
      const themeRadius = stacked
        ? 0
        : Number.parseFloat(getComputedStyle(ctx.svg).getPropertyValue('--prism-bar-radius')) || 0;

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

        group.setAttribute('data-series-id', seriesDomId(series, i));

        const barData = categories.map((key, categoryIndex) => {
          const datum = allData[i]?.[categoryIndex];

          if (stacked) {
            const base = stackTops[key] ?? 0;
            const top = base + Math.max(0, datum?.value ?? 0);

            stackTops[key] = top;

            return { base, dash: datum?.dash, key, opacity: datum?.opacity, present: datum !== undefined, y: top };
          }

          return {
            base: 0,
            dash: datum?.dash,
            key,
            opacity: datum?.opacity,
            present: datum !== undefined,
            y: datum?.value ?? 0,
          };
        });

        stackedTops[i] = barData.map((d) => d.y);

        const baselineYs = stacked ? barData.map((d) => valScale.map(d.base)) : undefined;

        renderBars(group, barData, catScale, valScale, sc.baselinePx, {
          baselineYs,
          borderRadius: series.borderRadius ?? themeRadius,
          color: seriesColor(i, series.color),
          disposalSignal: ctx.disposalSignal,
          horizontal,
          seriesCount: seriesList.length,
          seriesIndex: i,
          stacked,
          transition: reason === 'resize' ? false : config.transition,
        });
      }

      tooltip?.hide();
      groups.series.classList.toggle('prism-bars-stacked', stacked);

      if (!band || !ctx.chartArea.contains(band)) {
        band = createSvgElement('rect', { 'aria-hidden': 'true', class: 'prism-bar-band', 'pointer-events': 'none' });
        ctx.chartArea.insertBefore(band, groups.series);
      }

      band.style.display = 'none';

      // ─── Event handlers (close over render-derived state) ─────────────────────

      const colors = seriesList.map((s, i) => seriesColor(i, s.color));
      const labelOf = (catIdx: number): string => String(model.labels.get(categories[catIdx]) ?? categories[catIdx]);
      const tooltipFormat = typeof config.tooltip === 'object' ? config.tooltip : undefined;
      const keyOf = (catIdx: number): Datum['key'] => model.labels.get(categories[catIdx]) ?? categories[catIdx];
      const titleOf = (catIdx: number): string =>
        tooltipFormat?.titleFormat ? tooltipFormat.titleFormat(keyOf(catIdx)) : labelOf(catIdx);
      const formatValue = tooltipFormat?.valueFormat ?? String;
      let activeCat = -1;

      const valuesAt = (catIdx: number): SeriesValue[] =>
        seriesList.map((series, si) => ({ datum: allData[si]?.[catIdx], series }));

      const eventAt = (catIdx: number, seriesIdx: number, originalEvent: Event): ChartEvent | null => {
        const values = valuesAt(catIdx);
        const preferred = values[seriesIdx]?.datum ? seriesIdx : values.findIndex((v) => v.datum);
        const datum = values[preferred]?.datum;

        return datum ? { datum, originalEvent, series: seriesList[preferred], values } : null;
      };

      const setActive = (catIdx: number): void => {
        activeCat = catIdx;
        groups.series.classList.toggle('prism-bars-focused', catIdx >= 0);

        for (const group of groups.series.children) {
          for (const [i, rect] of [...group.children].entries())
            rect.classList.toggle('prism-bar--active', i === catIdx);
        }

        if (!band) return;

        band.style.display = catIdx < 0 ? 'none' : '';

        if (catIdx < 0) return;

        const start = sc.bandCenter(categories[catIdx]) - catScale.bandwidth() / 2 - catScale.gap() / 2;
        const size = catScale.bandwidth() + catScale.gap();
        const a = chartArea(ctx.dimensions.width, ctx.dimensions.height, ctx.dimensions.margin);

        setAttributes(
          band,
          horizontal
            ? { height: size, width: a.width, x: 0, y: start }
            : { height: a.height, width: size, x: start, y: 0 },
        );
      };

      const activate = (catIdx: number, seriesIdx: number, originalEvent: Event): void => {
        const event = eventAt(catIdx, seriesIdx, originalEvent);

        if (!event) return;

        setActive(catIdx);

        const values = event.values ?? [];
        const spoken = describeValues(titleOf(catIdx), values, formatValue);

        if (tooltip) {
          const tops = values.map((v, si) =>
            stacked ? (stackedTops[si]?.[catIdx] ?? 0) : Math.max(0, v.datum?.value ?? 0),
          );
          const valuePx = valScale.map(Math.max(...tops));
          const bandCenterPx = sc.bandCenter(categories[catIdx]);
          const { margin } = ctx.dimensions;
          const rows = values.flatMap((v, si) =>
            v.datum
              ? [{ color: colors[si], name: v.series.name, value: formatValue(v.datum.value, v.datum, v.series) }]
              : [],
          );

          tooltip.show(
            (horizontal ? valuePx : bandCenterPx) + margin.left,
            (horizontal ? bandCenterPx : valuePx) + margin.top,
            event.datum,
            event.series,
            comparisonContent(ctx.svg.ownerDocument, titleOf(catIdx), rows, spoken),
          );
        } else {
          ctx.announcer.announce(spoken);
        }

        config.onHover?.(event);
      };

      const deactivate = (): void => {
        setActive(-1);
        tooltip?.hide();
        ctx.announcer.clear();
        config.onHover?.(null);
      };

      const hit = (event: MouseEvent): { catIdx: number; seriesIdx: number } | null => {
        const d = ctx.dimensions;
        const pos = getMousePosition(ctx.svg, event, d.margin.left, d.margin.top);
        const a = chartArea(d.width, d.height, d.margin);

        if (pos.x < 0 || pos.x > a.width || pos.y < 0 || pos.y > a.height) return null;

        const catIdx = findCatIdx(horizontal ? pos.y : pos.x, categories, sc);

        return catIdx === -1
          ? null
          : { catIdx, seriesIdx: findSeriesIdx(pos, catIdx, categories, sc, seriesList.length) };
      };

      const onMouseMove = (event: MouseEvent) => {
        const target = hit(event);

        if (target) activate(target.catIdx, target.seriesIdx, event);
        else if (activeCat >= 0) deactivate();
      };

      const onClick = (event: MouseEvent) => {
        const target = config.onClick && hit(event);
        const chartEvent = target && eventAt(target.catIdx, target.seriesIdx, event);

        if (chartEvent) config.onClick?.(chartEvent);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        const last = categories.length - 1;
        const prev = activeCat < 0 ? last : Math.max(0, activeCat - 1);
        const next = activeCat < 0 ? 0 : Math.min(last, activeCat + 1);
        const target: Record<string, number> = {
          ArrowDown: next,
          ArrowLeft: prev,
          ArrowRight: next,
          ArrowUp: prev,
          End: last,
          Home: 0,
        };

        if (event.key in target) {
          event.preventDefault();
          activate(target[event.key], 0, event);
        } else if ((event.key === 'Enter' || event.key === ' ') && activeCat >= 0 && config.onClick) {
          event.preventDefault();

          const chartEvent = eventAt(activeCat, 0, event);

          if (chartEvent) config.onClick(chartEvent);
        } else if (event.key === 'Escape') {
          deactivate();
        }
      };

      return { onClick, onKeyDown, onMouseLeave: deactivate, onMouseMove };
    },
    (data) => {
      seriesList = data;
    },
  );
}
