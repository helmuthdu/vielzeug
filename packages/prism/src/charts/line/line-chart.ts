import { positionAxis, renderAxis, resolveTickCount } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { buildXScale, buildYScale } from '../../core/cartesian-scales';
import { clearCartesianDom, createChartScaffold } from '../../core/chart-scaffold';
import { chartArea, resolveMargin } from '../../core/layout';
import { seriesDomId } from '../../core/series-id';
import { createCrosshair } from '../../interaction/crosshair';
import { createSeriesInteraction, ensureMarkerGroup } from '../../interaction/series-interaction';
import { createSvgElement } from '../../svg/element';
import type { Point } from '../../svg/path';
import { seriesColor } from '../../theme';
import type { ChartHandle, LineChartConfig, LineSeriesConfig, XAxisConfig, YAxisConfig } from '../../types';
import { computePoints, renderLine } from './line-renderer';

export function createLineChart(container: HTMLElement, config: LineChartConfig): ChartHandle<LineSeriesConfig[]> {
  let crosshair: ReturnType<typeof createCrosshair> | null = null;
  let markers: SVGGElement | null = null;
  let rightAxis: SVGGElement | null = null;
  let seriesList = config.series;

  return createChartScaffold(
    container,
    config,
    (ctx, reason) => {
      const { groups, legend, tooltip } = ctx;
      legend?.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
      const dims = ctx.dimensions;
      const hasRight = seriesList.some((series) => series.yAxis === 'right');
      const hasLeftData = seriesList.some((series) => series.yAxis !== 'right' && series.data.length > 0);
      // The right axis widens the right margin; the effective margin stays local to this
      // render pass (and is handed to the interaction layer) instead of mutating shared dims.
      const margin = {
        ...resolveMargin(config.margin),
        right:
          config.margin?.right ??
          (hasRight ? (config.rightYAxis?.label ? 72 : 50) : resolveMargin(config.margin).right),
      };
      const area = chartArea(dims.width, dims.height, margin);
      const allData = seriesList.map((series) => series.data);
      const allX = allData.flat().map((datum) => datum.key);
      const leftY = seriesList
        .filter((series) => series.yAxis !== 'right')
        .flatMap((series) => series.data.map((datum) => datum.value));
      const rightY = seriesList
        .filter((series) => series.yAxis === 'right')
        .flatMap((series) => series.data.map((datum) => datum.value));

      if (allX.length === 0) {
        clearCartesianDom(groups, legend, tooltip, crosshair);
        markers?.replaceChildren();
        rightAxis?.replaceChildren();

        return;
      }

      if (config.crosshair && !crosshair) {
        crosshair = createCrosshair(ctx.chartArea, config.crosshair);
      }

      const xScale = buildXScale(allX, area.width);
      const yScale = buildYScale(leftY, area.height);
      const rightYScale = buildYScale(rightY, area.height);

      // Axes render by default (value axis with gridlines); `false` opts out.
      const xAxisConfig: XAxisConfig | false = config.xAxis === false ? false : (config.xAxis ?? {});
      const yAxisConfig: YAxisConfig | false = config.yAxis === false ? false : (config.yAxis ?? { grid: true });

      if (yAxisConfig && yAxisConfig.grid && (!hasRight || hasLeftData)) {
        renderGrid(
          groups.grid,
          yScale,
          yAxisConfig.grid,
          area.width,
          'horizontal',
          resolveTickCount(yAxisConfig, area.height, 'left'),
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
          resolveTickCount(xAxisConfig, area.width, 'bottom'),
        );
      }

      if (xAxisConfig) {
        positionAxis(groups.xAxis, xAxisConfig.position ?? 'bottom', area.width, area.height);
        renderAxis(groups.xAxis, xScale, xAxisConfig, area.width, 'bottom');
      } else {
        groups.xAxis.replaceChildren();
      }

      if (yAxisConfig && (!hasRight || hasLeftData)) {
        const axis = { ...yAxisConfig, position: hasRight ? ('left' as const) : (yAxisConfig.position ?? 'left') };
        positionAxis(groups.yAxis, axis.position, area.width, area.height);
        renderAxis(groups.yAxis, yScale, axis, area.height, 'left');
      } else {
        groups.yAxis.replaceChildren();
      }

      if (hasRight) {
        if (!rightAxis) {
          rightAxis = createSvgElement('g', { class: 'prism-y-axis-right' });
          ctx.chartArea.appendChild(rightAxis);
        }
        const axis = { ...config.rightYAxis, position: 'right' as const };
        positionAxis(rightAxis, 'right', area.width, area.height);
        renderAxis(rightAxis, rightYScale, axis, area.height, 'right');
      } else {
        rightAxis?.replaceChildren();
      }

      while (groups.series.children.length > seriesList.length) {
        groups.series.removeChild(groups.series.lastChild!);
      }

      const allPoints: Point[][] = [];

      for (let i = 0; i < seriesList.length; i++) {
        const series = seriesList[i];
        let group = groups.series.children[i] as SVGGElement | undefined;

        if (!group) {
          group = createSvgElement('g', { class: 'prism-line-series' });
          groups.series.appendChild(group);
        }

        group.setAttribute('data-series-id', seriesDomId(series, i));

        const seriesScale = series.yAxis === 'right' ? rightYScale : yScale;
        const points = computePoints(allData[i], xScale, seriesScale);

        allPoints.push(points);

        renderLine(group, points, {
          bounds: { height: area.height, width: area.width },
          color: seriesColor(i, series.color),
          curve: series.curve ?? 'linear',
          disposalSignal: ctx.disposalSignal,
          marks: series.data,
          pointRadius: series.pointRadius ?? 3,
          showPoints: series.showPoints ?? false,
          strokeWidth: series.strokeWidth,
          transition: reason === 'resize' ? false : config.transition,
        });
      }

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
        margin,
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
