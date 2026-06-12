import type { Point } from '../../svg/path';
import type { AreaChartConfig, ChartHandle } from '../../types';

import { warn } from '../../_warn';
import { renderAxis } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { buildXScale, buildYScale } from '../../core/cartesian-scales';
import { createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { resolve } from '../../core/resolve';
import { createCrosshair } from '../../interaction/crosshair';
import { createSeriesInteraction } from '../../interaction/series-interaction';
import { createSvgElement } from '../../svg/element';
import { seriesColor } from '../../theme';
import { computeAreaPoints, renderArea } from './area-renderer';

export function createAreaChart(container: HTMLElement, config: AreaChartConfig): ChartHandle {
  let crosshair: ReturnType<typeof createCrosshair> | null = null;

  return createChartScaffold(container, config, (ctx) => {
    const { groups, legend, tooltip } = ctx;
    const dims = ctx.dimensions.value;
    const area = chartArea(dims.width, dims.height, dims.margin);
    const seriesList = resolve(config.series);
    const allData = seriesList.map((s) => resolve(s.data));
    const allX = allData.flat().map((d) => d.x);
    const allY = allData.flat().map((d) => d.y);

    if (allX.length === 0) {
      warn('createAreaChart: no data');

      return;
    }

    if (config.crosshair && !crosshair) {
      crosshair = createCrosshair(ctx.chartArea, config.crosshair);
    }

    const xScale = buildXScale(allX as (Date | number)[], area.width);
    const yScale = buildYScale(allY, area.height);
    const baselineY = yScale.map(0);

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
        group = createSvgElement('g', { class: 'prism-area-series' });
        groups.series.appendChild(group);
      }

      const points = computeAreaPoints(allData[i], xScale, yScale);

      allPoints.push(points);

      renderArea(group, points, baselineY, {
        color: seriesColor(i, series.color),
        curve: series.curve ?? 'linear',
        fillOpacity: series.fillOpacity ?? 0.3,
        showLine: series.showLine !== false,
        transition: config.transition,
      });
    }

    legend.update(seriesList.map((s, i) => ({ color: seriesColor(i, s.color), name: s.name })));
    tooltip.hide();

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
