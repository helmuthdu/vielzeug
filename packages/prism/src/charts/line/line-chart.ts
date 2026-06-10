import type { Point } from '../../svg/path';
import type { ChartHandle, LineChartConfig } from '../../types';

import { renderAxis } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { resolve } from '../../core/resolve';
import { createCrosshair } from '../../interaction/crosshair';
import { createSeriesInteraction } from '../../interaction/series-interaction';
import { linearScale } from '../../scales/linear';
import { timeScale } from '../../scales/time';
import { createSvgElement } from '../../svg/element';
import { seriesColor } from '../../types';
import { computePoints, renderLine } from './line-renderer';

export function createLineChart(container: HTMLElement, config: LineChartConfig): ChartHandle {
  return createChartScaffold(container, config, (ctx) => {
    const { groups, legend, tooltip } = ctx;
    const dims = ctx.dimensions.value;
    const area = chartArea(dims.width, dims.height, dims.margin);
    const seriesList = resolve(config.series);
    const allData = seriesList.map((s) => resolve(s.data));
    const allX = allData.flat().map((d) => d.x);
    const allY = allData.flat().map((d) => d.y);

    if (allX.length === 0) return;

    const isTime = allX[0] instanceof Date;
    const xScale = isTime
      ? timeScale({
          domain: [new Date(Math.min(...allX.map(Number))), new Date(Math.max(...allX.map(Number)))],
          range: [0, area.width],
        })
      : linearScale({
          domain: [Math.min(...(allX as number[])), Math.max(...(allX as number[]))],
          range: [0, area.width],
        });

    const yScale = linearScale({ domain: [Math.min(0, ...allY), Math.max(...allY)], range: [area.height, 0] });

    if (config.yAxis?.grid) renderGrid(groups.grid, yScale, config.yAxis.grid, area.height, area.width, 'horizontal');

    if (config.xAxis?.grid) renderGrid(groups.grid, xScale, config.xAxis.grid, area.width, area.height, 'vertical');

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

    if (legend) {
      legend.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
    }

    if (tooltip) tooltip.hide();

    const crosshair = config.crosshair ? createCrosshair(ctx.chartArea, config.crosshair) : null;

    return createSeriesInteraction({
      crosshair,
      dims: () => ctx.dimensions.value,
      getData: () => allData,
      getPoints: () => allPoints,
      getSeriesList: () => resolve(config.series),
      onClick: config.onClick,
      onHover: config.onHover,
      svg: ctx.svg,
      tooltip,
    });
  });
}
