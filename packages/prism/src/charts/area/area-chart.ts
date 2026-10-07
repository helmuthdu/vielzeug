import { positionAxis, renderAxis, resolveTickCount } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { buildXScale, buildYScale } from '../../core/cartesian-scales';
import { clearCartesianDom, createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { seriesDomId } from '../../core/series-id';
import { createCrosshair } from '../../interaction/crosshair';
import { createSeriesInteraction, ensureMarkerGroup } from '../../interaction/series-interaction';
import { createSvgElement } from '../../svg/element';
import type { Point } from '../../svg/path';
import { seriesColor } from '../../theme';
import type { AreaChartConfig, AreaSeriesConfig, ChartHandle, XAxisConfig, YAxisConfig } from '../../types';
import { computeAreaPoints, renderArea } from './area-renderer';

export function createAreaChart(container: HTMLElement, config: AreaChartConfig): ChartHandle<AreaSeriesConfig[]> {
  let crosshair: ReturnType<typeof createCrosshair> | null = null;
  let markers: SVGGElement | null = null;
  let seriesList = config.series;

  return createChartScaffold(
    container,
    config,
    (ctx) => {
      const { groups, legend, tooltip } = ctx;
      const dims = ctx.dimensions;
      const area = chartArea(dims.width, dims.height, dims.margin);
      const allData = seriesList.map((series) => series.data);
      const allX = allData.flat().map((datum) => datum.key);
      const allY = allData.flat().map((d) => d.value);

      if (allX.length === 0) {
        clearCartesianDom(groups, legend, tooltip, crosshair);
        markers?.replaceChildren();

        return;
      }

      if (config.crosshair && !crosshair) {
        crosshair = createCrosshair(ctx.chartArea, config.crosshair);
      }

      const xScale = buildXScale(allX, area.width);
      const yScale = buildYScale(allY, area.height);
      const baselineY = yScale.map(0);

      // Axes render by default (value axis with gridlines); `false` opts out.
      const xAxisConfig: XAxisConfig | false = config.xAxis === false ? false : (config.xAxis ?? {});
      const yAxisConfig: YAxisConfig | false = config.yAxis === false ? false : (config.yAxis ?? { grid: true });

      if (yAxisConfig && yAxisConfig.grid) {
        renderGrid(
          groups.grid,
          yScale,
          yAxisConfig.grid,
          area.width,
          'horizontal',
          resolveTickCount(yAxisConfig, area.height, 'left'),
        );
      }

      if (xAxisConfig && xAxisConfig.grid) {
        renderGrid(
          groups.grid,
          xScale,
          xAxisConfig.grid,
          area.height,
          'vertical',
          resolveTickCount(xAxisConfig, area.width, 'bottom'),
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

      for (let i = 0; i < seriesList.length; i++) {
        const series = seriesList[i];
        let group = groups.series.children[i] as SVGGElement | undefined;

        if (!group) {
          group = createSvgElement('g', { class: 'prism-area-series' });
          groups.series.appendChild(group);
        }

        group.setAttribute('data-series-id', seriesDomId(series, i));

        const points = computeAreaPoints(allData[i], xScale, yScale);

        allPoints.push(points);

        renderArea(group, points, baselineY, {
          color: seriesColor(i, series.color),
          curve: series.curve ?? 'linear',
          disposalSignal: ctx.disposalSignal,
          fill: series.fill ?? 'gradient',
          fillOpacity: series.fillOpacity,
          marks: series.data,
          showLine: series.showLine !== false,
          transition: config.transition,
        });
      }

      legend?.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
      tooltip?.hide();
      markers = ensureMarkerGroup(ctx.chartArea, markers);

      return createSeriesInteraction({
        announcer: ctx.announcer,
        colors: () => seriesList.map((s, i) => seriesColor(i, s.color)),
        crosshair,
        dims: () => ctx.dimensions,
        getData: () => allData,
        getPoints: () => allPoints,
        getSeriesList: () => seriesList,
        margin: ctx.dimensions.margin,
        markers,
        onClick: config.onClick,
        onHover: config.onHover,
        seriesGroup: groups.series,
        svg: ctx.svg,
        tooltip,
      });
    },
    (data) => {
      seriesList = data;
    },
  );
}
