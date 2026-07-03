import { isReactive } from '@vielzeug/ripple';

import type { Point } from '../../svg/path';
import type { ChartHandle, LineChartConfig } from '../../types';

import { warn } from '../../_dev';
import { renderAxis } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { buildXScale, buildYScale } from '../../core/cartesian-scales';
import { createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { createCrosshair } from '../../interaction/crosshair';
import { createSeriesInteraction } from '../../interaction/series-interaction';
import { createSvgElement } from '../../svg/element';
import { seriesColor } from '../../theme';
import { computePoints, renderLine } from './line-renderer';

export function createLineChart(container: HTMLElement, config: LineChartConfig): ChartHandle {
  let crosshair: ReturnType<typeof createCrosshair> | null = null;

  return createChartScaffold(container, config, (ctx) => {
    const { groups, legend, tooltip } = ctx;
    const dims = ctx.dimensions.value;
    const area = chartArea(dims.width, dims.height, dims.margin);
    const seriesList = isReactive(config.series) ? config.series.value : config.series;
    const allData = seriesList.map((s) => (isReactive(s.data) ? s.data.value : s.data));
    const allX = allData.flat().map((d) => d.key as Date | number);
    const allY = allData.flat().map((d) => d.value);

    if (allX.length === 0) {
      warn('createLineChart: no data');

      return;
    }

    if (config.crosshair && !crosshair) {
      crosshair = createCrosshair(ctx.chartArea, config.crosshair);
    }

    const xScale = buildXScale(allX as (Date | number)[], area.width);
    const yScale = buildYScale(allY, area.height);

    if (config.yAxis?.grid) renderGrid(groups.grid, yScale, config.yAxis.grid, area.width, 'horizontal');

    if (config.xAxis?.grid) renderGrid(groups.grid, xScale, config.xAxis.grid, area.height, 'vertical');

    if (config.xAxis) {
      groups.xAxis.setAttribute('transform', `translate(0,${area.height})`);
      renderAxis(groups.xAxis, xScale, config.xAxis, area.width);
    }

    if (config.yAxis) renderAxis(groups.yAxis, yScale, config.yAxis, area.height);

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

      const points = computePoints(allData[i], xScale, yScale);

      allPoints.push(points);

      renderLine(group, points, {
        color: seriesColor(i, series.color),
        curve: series.curve ?? 'linear',
        pointRadius: series.pointRadius ?? 3,
        showPoints: series.showPoints ?? false,
        strokeWidth: series.strokeWidth ?? 2,
        transition: config.transition,
      });
    }

    legend?.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
    tooltip?.hide();

    return createSeriesInteraction({
      crosshair,
      dims: () => ctx.dimensions.value,
      getData: () => allData,
      getPoints: () => allPoints,
      getSeriesList: () => (isReactive(config.series) ? config.series.value : config.series),
      onClick: config.onClick,
      onHover: config.onHover,
      svg: ctx.svg,
      tooltip,
    });
  });
}
