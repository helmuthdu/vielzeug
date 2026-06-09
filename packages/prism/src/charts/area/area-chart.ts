import { effect, scope } from '@vielzeug/ripple';

import type { Point } from '../../svg/path';
import type { AreaChartConfig, ChartHandle, DataPoint, Scale } from '../../types';

import { renderAxis } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { createChartBase } from '../../core/chart-base';
import { chartArea } from '../../core/layout';
import { resolve } from '../../core/resolve';
import { createCrosshair } from '../../interaction/crosshair';
import { getMousePosition } from '../../interaction/events';
import { nearestPointX } from '../../interaction/hit-test';
import { createLegend } from '../../interaction/legend';
import { createTooltip } from '../../interaction/tooltip';
import { linearScale } from '../../scales/linear';
import { timeScale } from '../../scales/time';
import { createSvgElement } from '../../svg/element';
import { computeAreaPoints, renderArea } from './area-renderer';

export function createAreaChart(container: HTMLElement, config: AreaChartConfig): ChartHandle {
  const base = createChartBase(container, { ariaLabel: config.ariaLabel, margin: config.margin });
  let disposed = false;

  const tooltip = config.tooltip ? createTooltip(container, config.tooltip) : null;
  const crosshair = config.crosshair ? createCrosshair(base.chartArea, config.crosshair) : null;
  const legend = config.legend ? createLegend(container, config.legend) : null;

  const xAxisGroup = createSvgElement('g', { class: 'prism-x-axis' });
  const yAxisGroup = createSvgElement('g', { class: 'prism-y-axis' });
  const gridGroup = createSvgElement('g', { class: 'prism-grid' });
  const seriesGroup = createSvgElement('g', { class: 'prism-series' });

  base.chartArea.appendChild(gridGroup);
  base.chartArea.appendChild(xAxisGroup);
  base.chartArea.appendChild(yAxisGroup);
  base.chartArea.appendChild(seriesGroup);

  let allPoints: Point[][] = [];
  let currentData: DataPoint[][] = [];

  const s = scope(() => {
    effect(
      () => {
        if (disposed) return;

        const dims = base.dimensions.value;
        const area = chartArea(dims.width, dims.height, dims.margin);
        const seriesList = resolve(config.series);

        const allData = seriesList.map((s) => resolve(s.data));

        currentData = allData;

        const allX = allData.flat().map((d) => d.x);
        const allY = allData.flat().map((d) => d.y);

        if (allX.length === 0) return;

        const isTime = allX[0] instanceof Date;
        const xScale: Scale<unknown> = isTime
          ? timeScale({
              domain: [new Date(Math.min(...allX.map(Number))), new Date(Math.max(...allX.map(Number)))],
              range: [0, area.width],
            })
          : linearScale({
              domain: [Math.min(...(allX as number[])), Math.max(...(allX as number[]))],
              range: [0, area.width],
            });

        const yScale = linearScale({
          domain: [Math.min(0, ...allY), Math.max(...allY)],
          range: [area.height, 0],
        });

        if (config.yAxis?.grid) {
          renderGrid(gridGroup, yScale, config.yAxis.grid, area.height, area.width, 'horizontal');
        }

        if (config.xAxis) {
          xAxisGroup.setAttribute('transform', `translate(0,${area.height})`);
          renderAxis(xAxisGroup, xScale, config.xAxis, area.width);
        }

        if (config.yAxis) {
          renderAxis(yAxisGroup, yScale, config.yAxis, area.height);
        }

        while (seriesGroup.children.length > seriesList.length) {
          seriesGroup.removeChild(seriesGroup.lastChild!);
        }

        const baselineY = yScale.map(0);

        allPoints = [];

        for (let i = 0; i < seriesList.length; i++) {
          const series = seriesList[i];
          let group = seriesGroup.children[i] as SVGGElement | undefined;

          if (!group) {
            group = createSvgElement('g', { class: 'prism-area-series' });
            seriesGroup.appendChild(group);
          }

          const points = computeAreaPoints(allData[i], xScale, yScale);

          allPoints.push(points);

          renderArea(group, points, baselineY, {
            color: series.color ?? `var(--prism-color-${(i % 8) + 1})`,
            curve: series.curve ?? 'linear',
            fillOpacity: series.fillOpacity ?? 0.3,
            showLine: series.showLine !== false,
            transition: config.transition,
          });
        }

        if (legend) {
          legend.update(
            seriesList.map((s, i) => ({
              color: s.color ?? `var(--prism-color-${(i % 8) + 1})`,
              name: s.name,
            })),
          );
        }
      },
      { scheduler: 'raf' },
    );
  });

  const handleMouseMove = (event: MouseEvent) => {
    if (allPoints.length === 0 || allPoints[0].length === 0) return;

    const dims = base.dimensions.value;
    const pos = getMousePosition(base.svg, event, dims.margin.left, dims.margin.top);
    const area = chartArea(dims.width, dims.height, dims.margin);

    if (pos.x < 0 || pos.x > area.width || pos.y < 0 || pos.y > area.height) {
      crosshair?.hide();
      tooltip?.hide();

      return;
    }

    const idx = nearestPointX(allPoints[0], pos.x);

    if (idx >= 0) {
      const pt = allPoints[0][idx];

      crosshair?.show(pt.x, pt.y, area.width, area.height);

      if (tooltip) {
        const seriesList = resolve(config.series);
        let nearestSi = 0;
        let minYDist = Infinity;

        for (let si = 0; si < allPoints.length; si++) {
          const siPt = allPoints[si]?.[idx];

          if (siPt) {
            const d = Math.abs(siPt.y - pos.y);

            if (d < minYDist) {
              minYDist = d;
              nearestSi = si;
            }
          }
        }

        const siPt = allPoints[nearestSi]?.[idx];

        if (siPt && currentData[nearestSi]?.[idx]) {
          tooltip.show(
            siPt.x + dims.margin.left,
            siPt.y + dims.margin.top,
            currentData[nearestSi][idx],
            seriesList[nearestSi],
          );
        }
      }
    }
  };

  const handleMouseLeave = () => {
    crosshair?.hide();
    tooltip?.hide();
  };

  base.svg.addEventListener('mousemove', handleMouseMove);
  base.svg.addEventListener('mouseleave', handleMouseLeave);

  const handle: ChartHandle = {
    dispose() {
      if (disposed) return;

      disposed = true;
      base.svg.removeEventListener('mousemove', handleMouseMove);
      base.svg.removeEventListener('mouseleave', handleMouseLeave);
      tooltip?.destroy();
      legend?.destroy();
      s.dispose();
      base.dispose();
    },
    el: base.svg,
    [Symbol.dispose]() {
      this.dispose();
    },
    update() {
      base.dimensions.update((d) => ({ ...d }));
    },
  };

  return handle;
}
