import { warn } from '../../_dev';
import { renderAxis, resolveTickCount } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { buildXScale, buildYScale } from '../../core/cartesian-scales';
import { clearCartesianDom, createChartScaffold } from '../../core/chart-scaffold';
import { chartArea } from '../../core/layout';
import { resolveMaybeSignal } from '../../core/resolve';
import { createCrosshair } from '../../interaction/crosshair';
import { createSeriesInteraction } from '../../interaction/series-interaction';
import { createSvgElement } from '../../svg/element';
import type { Point } from '../../svg/path';
import { seriesColor } from '../../theme';
import type { AreaChartConfig, ChartHandle } from '../../types';
import { computeAreaPoints, renderArea } from './area-renderer';

export function createAreaChart(container: HTMLElement, config: AreaChartConfig): ChartHandle {
  let crosshair: ReturnType<typeof createCrosshair> | null = null;
  const seriesSignal = resolveMaybeSignal(config.series);

  let scaffold: ChartHandle | undefined;

  try {
    scaffold = createChartScaffold(container, config, (ctx) => {
      const { groups, legend, tooltip } = ctx;
      const dims = ctx.dimensions.value;
      const area = chartArea(dims.width, dims.height, dims.margin);
      const seriesList = seriesSignal.value;
      const dataSignals = seriesList.map((s) => resolveMaybeSignal(s.data));
      const allData = dataSignals.map((signal) => signal.value);
      const allX = allData.flat().map((d) => d.key as Date | number);
      const allY = allData.flat().map((d) => d.value);

      if (allX.length === 0) {
        warn('createAreaChart: no data');
        clearCartesianDom(groups, legend, tooltip, crosshair);

        return;
      }

      if (config.crosshair && !crosshair) {
        crosshair = createCrosshair(ctx.chartArea, config.crosshair);
      }

      const xScale = buildXScale(allX as (Date | number)[], area.width);
      const yScale = buildYScale(allY, area.height);
      const baselineY = yScale.map(0);

      if (config.yAxis?.grid) {
        renderGrid(
          groups.grid,
          yScale,
          config.yAxis.grid,
          area.width,
          'horizontal',
          resolveTickCount(config.yAxis, area.height, 'left'),
        );
      }

      if (config.xAxis?.grid) {
        renderGrid(
          groups.grid,
          xScale,
          config.xAxis.grid,
          area.height,
          'vertical',
          resolveTickCount(config.xAxis, area.width, 'bottom'),
        );
      }

      if (config.xAxis) {
        groups.xAxis.setAttribute('transform', `translate(0,${area.height})`);
        renderAxis(groups.xAxis, xScale, config.xAxis, area.width, 'bottom');
      }

      if (config.yAxis) renderAxis(groups.yAxis, yScale, config.yAxis, area.height, 'left');

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
          disposalSignal: ctx.disposalSignal,
          fillOpacity: series.fillOpacity ?? 0.3,
          showLine: series.showLine !== false,
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
        getSeriesList: () => seriesSignal.value,
        onClick: config.onClick,
        onHover: config.onHover,
        svg: ctx.svg,
        tooltip,
      });
    });

    return scaffold;
  } catch (error) {
    scaffold?.dispose();
    throw error;
  }
}
