import type { ChartEventHandlers } from '../core/chart-scaffold';
import type { Point } from '../svg/path';
import type { ChartDimensions, ChartEvent, Datum, Series } from '../types';
import type { CrosshairState } from './crosshair';
import type { TooltipState } from './tooltip';

import { chartArea } from '../core/layout';
import { getMousePosition } from './events';
import { nearestPointX } from './hit-test';

export interface SeriesInteractionOptions {
  crosshair?: CrosshairState | null;
  dims: () => ChartDimensions;
  getData: () => Datum[][];
  getPoints: () => Point[][];
  getSeriesList: () => Series[];
  onClick?: ((event: ChartEvent) => void) | undefined;
  onHover?: ((event: ChartEvent | null) => void) | undefined;
  svg: SVGSVGElement;
  tooltip?: TooltipState | null;
}

function findNearestSeries(allPoints: Point[][], idx: number, posY: number): number {
  let nearestSi = 0;
  let minYDist = Infinity;

  for (let si = 0; si < allPoints.length; si++) {
    const pt = allPoints[si]?.[idx];

    if (pt) {
      const d = Math.abs(pt.y - posY);

      if (d < minYDist) {
        minYDist = d;
        nearestSi = si;
      }
    }
  }

  return nearestSi;
}

export function createSeriesInteraction(opts: SeriesInteractionOptions): ChartEventHandlers {
  const onMouseMove = (event: MouseEvent) => {
    const allPoints = opts.getPoints();

    if (allPoints.length === 0 || allPoints[0].length === 0) return;

    const dims = opts.dims();
    const pos = getMousePosition(opts.svg, event, dims.margin.left, dims.margin.top);
    const area = chartArea(dims.width, dims.height, dims.margin);

    if (pos.x < 0 || pos.x > area.width || pos.y < 0 || pos.y > area.height) {
      opts.crosshair?.hide();
      opts.tooltip?.hide();

      return;
    }

    const baseSeries = allPoints[0] ?? [];
    const idx = nearestPointX(baseSeries, pos.x);

    if (idx < 0) return;

    const pt = baseSeries[idx];

    opts.crosshair?.show(pt.x, pt.y, area.width, area.height);

    const nearestSi = findNearestSeries(allPoints, idx, pos.y);
    const siPt = allPoints[nearestSi]?.[idx];
    const dataPoint = opts.getData()[nearestSi]?.[idx];
    const series = opts.getSeriesList()[nearestSi];

    if (siPt && dataPoint && series) {
      opts.tooltip?.show(siPt.x + dims.margin.left, siPt.y + dims.margin.top, dataPoint, series);
      opts.onHover?.({ datum: dataPoint, originalEvent: event, series });
    }
  };

  const onMouseLeave = () => {
    opts.crosshair?.hide();
    opts.tooltip?.hide();
    opts.onHover?.(null);
  };

  const onClick = (event: MouseEvent) => {
    if (!opts.onClick) return;

    const allPoints = opts.getPoints();

    if (allPoints.length === 0 || allPoints[0].length === 0) return;

    const dims = opts.dims();
    const pos = getMousePosition(opts.svg, event, dims.margin.left, dims.margin.top);
    const area = chartArea(dims.width, dims.height, dims.margin);

    if (pos.x < 0 || pos.x > area.width || pos.y < 0 || pos.y > area.height) return;

    const idx = nearestPointX(allPoints[0], pos.x);

    if (idx < 0) return;

    const nearestSi = findNearestSeries(allPoints, idx, pos.y);
    const dataPoint = opts.getData()[nearestSi]?.[idx];
    const series = opts.getSeriesList()[nearestSi];

    if (dataPoint && series) {
      opts.onClick({ datum: dataPoint, originalEvent: event, series });
    }
  };

  return { onClick, onMouseLeave, onMouseMove };
}
