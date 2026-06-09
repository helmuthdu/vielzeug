import { effect, scope } from '@vielzeug/ripple';

import type { BarChartConfig, ChartDimensions, ChartHandle, DataPoint } from '../../types';

import { renderAxis } from '../../axes/axis';
import { renderGrid } from '../../axes/grid';
import { createChartBase } from '../../core/chart-base';
import { chartArea } from '../../core/layout';
import { resolve } from '../../core/resolve';
import { getMousePosition } from '../../interaction/events';
import { createLegend } from '../../interaction/legend';
import { createTooltip } from '../../interaction/tooltip';
import { bandScale } from '../../scales/band';
import { linearScale } from '../../scales/linear';
import { createSvgElement } from '../../svg/element';
import { renderBars } from './bar-renderer';

export function createBarChart(container: HTMLElement, config: BarChartConfig): ChartHandle {
  const base = createChartBase(container, { ariaLabel: config.ariaLabel, margin: config.margin });
  let disposed = false;
  let currentData: DataPoint[][] = [];
  let currentCategories: string[] = [];
  let currentBandwidth = 0;
  let currentXMap: ((cat: string) => number) | null = null;

  const tooltip = config.tooltip ? createTooltip(container, config.tooltip) : null;
  const legend = config.legend ? createLegend(container, config.legend) : null;

  const xAxisGroup = createSvgElement('g', { class: 'prism-x-axis' });
  const yAxisGroup = createSvgElement('g', { class: 'prism-y-axis' });
  const gridGroup = createSvgElement('g', { class: 'prism-grid' });
  const seriesGroup = createSvgElement('g', { class: 'prism-series' });

  base.chartArea.appendChild(gridGroup);
  base.chartArea.appendChild(xAxisGroup);
  base.chartArea.appendChild(yAxisGroup);
  base.chartArea.appendChild(seriesGroup);

  const s = scope(() => {
    effect(
      () => {
        if (disposed) return;

        const dims = base.dimensions.value;
        const area = chartArea(dims.width, dims.height, dims.margin);
        const seriesList = resolve(config.series);

        const allData = seriesList.map((s) => resolve(s.data));

        currentData = allData;

        const categories = [...new Set(allData.flat().map((d) => String(d.x)))];

        currentCategories = categories;

        const allY = allData.flat().map((d) => d.y);

        if (categories.length === 0) return;

        const xScale = bandScale({ domain: categories, range: [0, area.width] });

        currentBandwidth = xScale.bandwidth();
        currentXMap = (cat: string) => xScale.map(cat) + xScale.bandwidth() / 2;

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

        for (let i = 0; i < seriesList.length; i++) {
          const series = seriesList[i];
          let group = seriesGroup.children[i] as SVGGElement | undefined;

          if (!group) {
            group = createSvgElement('g', { class: 'prism-bar-series' });
            seriesGroup.appendChild(group);
          }

          const barData = allData[i].map((d) => ({ x: String(d.x), y: d.y }));

          renderBars(group, barData, xScale, yScale, baselineY, {
            borderRadius: series.borderRadius ?? 0,
            color: series.color ?? `var(--prism-color-${(i % 8) + 1})`,
            seriesCount: seriesList.length,
            seriesIndex: i,
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
    if (!tooltip || currentCategories.length === 0 || !currentXMap) return;

    const dims = base.dimensions.value;
    const pos = getMousePosition(base.svg, event, dims.margin.left, dims.margin.top);
    const area = chartArea(dims.width, dims.height, dims.margin);

    if (pos.x < 0 || pos.x > area.width || pos.y < 0 || pos.y > area.height) {
      tooltip.hide();

      return;
    }

    let nearestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < currentCategories.length; i++) {
      const centerX = currentXMap(currentCategories[i]);
      const dist = Math.abs(centerX - pos.x);

      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    const seriesList = resolve(config.series);
    const hitSeriesIdx = seriesList.findIndex((_, si) => {
      const centerX = currentXMap!(currentCategories[nearestIdx]);
      const barLeft = centerX - currentBandwidth / 2 + (currentBandwidth / seriesList.length) * si;

      return pos.x >= barLeft && pos.x < barLeft + currentBandwidth / seriesList.length;
    });
    const seriesIdx = hitSeriesIdx >= 0 ? hitSeriesIdx : 0;
    const point = currentData[seriesIdx]?.[nearestIdx];

    if (point) {
      const centerX = currentXMap(currentCategories[nearestIdx]);

      tooltip.show(centerX + dims.margin.left, yPosForTooltip(point.y, dims, area), point, seriesList[seriesIdx]);
    }
  };

  function yPosForTooltip(y: number, dims: ChartDimensions, area: { height: number }): number {
    const allData = resolve(config.series).map((s) => resolve(s.data));
    const allY = allData.flat().map((d) => d.y);
    const yScale = linearScale({
      domain: [Math.min(0, ...allY), Math.max(...allY)],
      range: [area.height, 0],
    });

    return yScale.map(y) + dims.margin.top;
  }

  const handleMouseLeave = () => {
    tooltip?.hide();
  };

  if (tooltip) {
    base.svg.addEventListener('mousemove', handleMouseMove);
    base.svg.addEventListener('mouseleave', handleMouseLeave);
  }

  const handle: ChartHandle = {
    dispose() {
      if (disposed) return;

      disposed = true;

      if (tooltip) {
        base.svg.removeEventListener('mousemove', handleMouseMove);
        base.svg.removeEventListener('mouseleave', handleMouseLeave);
      }

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
