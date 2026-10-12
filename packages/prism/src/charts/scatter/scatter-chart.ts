import { positionAxis, renderAxis, resolveTickCount, resolveTicks } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { buildXScale, buildYScale } from '../../core/cartesian-scales';
import { clearCartesianDom, createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { seriesDomId } from '../../core/series-id';
import { createCrosshair } from '../../interaction/crosshair';
import { createScatterInteraction } from '../../interaction/scatter-interaction';
import { ensureMarkerGroup } from '../../interaction/series-interaction';
import { createSvgElement } from '../../svg/element';
import type { Point } from '../../svg/path';
import { seriesColor } from '../../theme';
import type { ChartHandle, ScatterChartConfig, ScatterSeriesConfig, XAxisConfig, YAxisConfig } from '../../types';
import { computeScatterPoints, renderScatterPoints } from './scatter-renderer';

export function createScatterChart(
  container: HTMLElement,
  config: ScatterChartConfig,
): ChartHandle<ScatterSeriesConfig[]> {
  let crosshair: ReturnType<typeof createCrosshair> | null = null;
  let markers: SVGGElement | null = null;
  let seriesList = config.series;

  return createChartScaffold(
    container,
    config,
    (ctx, reason) => {
      const { groups, legend, tooltip } = ctx;
      legend?.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
      const dims = ctx.dimensions;
      const area = chartArea(dims.width, dims.height, dims.margin);
      const allData = seriesList.map((series) => series.data);
      const allX = allData.flat().map((datum) => datum.key);
      const allY = allData.flat().map((datum) => datum.value);

      if (allX.length === 0) {
        clearCartesianDom(groups, legend, tooltip, crosshair);
        markers?.replaceChildren();

        return;
      }

      if (config.crosshair && !crosshair) {
        crosshair = createCrosshair(ctx.chartArea, config.crosshair);
      }

      const xScale = buildXScale(allX, area.width);
      // Independent points have no baseline to anchor, so the y domain fits the data.
      const yScale = buildYScale(allY, area.height, false);

      // Axes render by default (value axis with gridlines); `false` opts out. The value
      // axis merges over its default so a partial config keeps the default gridlines.
      const xAxisConfig: XAxisConfig | false = config.xAxis === false ? false : (config.xAxis ?? {});
      const yAxisConfig: YAxisConfig | false = config.yAxis === false ? false : { grid: true, ...config.yAxis };

      if (yAxisConfig && yAxisConfig.grid) {
        renderGrid(
          groups.grid,
          yScale,
          yAxisConfig.grid,
          area.width,
          'horizontal',
          resolveTicks(yScale, yAxisConfig, resolveTickCount(yAxisConfig, area.height, 'left')),
        );
      } else {
        groups.grid.replaceChildren();
      }

      if (xAxisConfig && xAxisConfig.grid) {
        renderGrid(
          groups.grid,
          xScale,
          xAxisConfig.grid,
          area.height,
          'vertical',
          resolveTicks(xScale, xAxisConfig, resolveTickCount(xAxisConfig, area.width, 'bottom')),
        );
      }

      if (xAxisConfig) {
        positionAxis(groups.xAxis, xAxisConfig.position ?? 'bottom', area.width, area.height);
        renderAxis(groups.xAxis, xScale, xAxisConfig, area.width, 'bottom');
      } else {
        groups.xAxis.replaceChildren();
      }

      if (yAxisConfig) {
        positionAxis(groups.yAxis, yAxisConfig.position ?? 'left', area.width, area.height);
        renderAxis(groups.yAxis, yScale, yAxisConfig, area.height, 'left');
      } else {
        groups.yAxis.replaceChildren();
      }

      while (groups.series.children.length > seriesList.length) {
        groups.series.removeChild(groups.series.lastChild!);
      }

      const allPoints: Point[][] = [];

      for (const [i, series] of seriesList.entries()) {
        let group = groups.series.children[i] as SVGGElement | undefined;

        if (!group) {
          group = createSvgElement('g', { class: 'prism-scatter-series' });
          groups.series.appendChild(group);
        }

        group.setAttribute('data-series-id', seriesDomId(series, i));

        const points = computeScatterPoints(series.data, xScale, yScale);

        allPoints.push(points);

        renderScatterPoints(group, points, {
          color: seriesColor(i, series.color),
          disposalSignal: ctx.disposalSignal,
          marks: series.data,
          pointRadius: series.pointRadius ?? 3,
          transition: reason === 'resize' ? false : config.transition,
        });
      }

      tooltip?.hide();
      markers = ensureMarkerGroup(ctx.chartArea, markers);

      return createScatterInteraction({
        announcer: ctx.announcer,
        colors: () => seriesList.map((s, i) => seriesColor(i, s.color)),
        crosshair,
        dims: () => ctx.dimensions,
        getData: () => allData,
        getPoints: () => allPoints,
        getSeriesList: () => seriesList,
        margin: dims.margin,
        markers,
        onClick: config.onClick,
        onHover: config.onHover,
        seriesGroup: groups.series,
        svg: ctx.svg,
        tooltip,
        tooltipFormat: typeof config.tooltip === 'object' ? config.tooltip : undefined,
      });
    },
    (data) => {
      seriesList = data;
    },
  );
}
