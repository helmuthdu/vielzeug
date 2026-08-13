import { keyId } from '../core/cartesian-model';
import type { ChartEventHandlers } from '../core/chart-scaffold';
import { chartArea } from '../core/layout';
import type { Point } from '../svg/path';
import type { ChartDimensions, ChartEvent, Datum, Series } from '../types';
import type { CrosshairState } from './crosshair';
import { getMousePosition } from './events';
import type { TooltipState } from './tooltip';

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

type SeriesPoint = { datum: Datum; point: Point; seriesIndex: number };

function findNearestKey(allData: Datum[][], allPoints: Point[][], posX: number): Datum['key'] | null {
  let nearest: Datum['key'] | null = null;
  let minXDistance = Infinity;

  for (let seriesIndex = 0; seriesIndex < allPoints.length; seriesIndex++) {
    for (let datumIndex = 0; datumIndex < (allPoints[seriesIndex]?.length ?? 0); datumIndex++) {
      const datum = allData[seriesIndex]?.[datumIndex];
      const point = allPoints[seriesIndex]?.[datumIndex];

      if (!datum || !point) continue;

      const distance = Math.abs(point.x - posX);

      if (distance < minXDistance) {
        minXDistance = distance;
        nearest = datum.key;
      }
    }
  }

  return nearest;
}

function findNearestSeries(
  allData: Datum[][],
  allPoints: Point[][],
  key: Datum['key'],
  posY: number,
): SeriesPoint | null {
  const id = keyId(key);
  let nearest: { datum: Datum; point: Point; seriesIndex: number } | null = null;
  let minYDist = Infinity;

  for (let seriesIndex = 0; seriesIndex < allPoints.length; seriesIndex++) {
    const datumIndex = allData[seriesIndex]?.findIndex((datum) => keyId(datum.key) === id) ?? -1;
    const datum = datumIndex === -1 ? undefined : allData[seriesIndex]?.[datumIndex];
    const point = datumIndex === -1 ? undefined : allPoints[seriesIndex]?.[datumIndex];

    if (!datum || !point) continue;

    const distance = Number.isFinite(posY) ? Math.abs(point.y - posY) : 0;

    if (distance < minYDist) {
      minYDist = distance;
      nearest = { datum, point, seriesIndex };
    }
  }

  return nearest;
}

export function createSeriesInteraction(opts: SeriesInteractionOptions): ChartEventHandlers {
  let keyboardIndex = 0;

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

    const key = findNearestKey(opts.getData(), allPoints, pos.x);

    if (key === null) return;

    const nearest = findNearestSeries(opts.getData(), allPoints, key, pos.y);
    const series = nearest ? opts.getSeriesList()[nearest.seriesIndex] : undefined;
    const crosshairX = opts.crosshair?.snap === false ? pos.x : (nearest?.point.x ?? pos.x);
    const crosshairY = opts.crosshair?.snap === false ? pos.y : (nearest?.point.y ?? pos.y);

    opts.crosshair?.show(
      crosshairX,
      crosshairY,
      area.width,
      area.height,
      series && nearest ? `${series.name}: ${nearest.datum.value}` : undefined,
    );

    if (nearest && series) {
      opts.tooltip?.show(nearest.point.x + dims.margin.left, nearest.point.y + dims.margin.top, nearest.datum, series);
      opts.onHover?.({ datum: nearest.datum, originalEvent: event, series });
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

    const key = findNearestKey(opts.getData(), allPoints, pos.x);

    if (key === null) return;

    const nearest = findNearestSeries(opts.getData(), allPoints, key, pos.y);
    const series = nearest ? opts.getSeriesList()[nearest.seriesIndex] : undefined;

    if (nearest && series) {
      opts.onClick({ datum: nearest.datum, originalEvent: event, series });
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const allData = opts.getData();
    const allPoints = opts.getPoints();
    const domain = [...new Map(allData.flat().map((datum) => [keyId(datum.key), datum.key])).values()];

    if (domain.length === 0) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      keyboardIndex = Math.max(0, Math.min(domain.length - 1, keyboardIndex + (event.key === 'ArrowLeft' ? -1 : 1)));

      const key = domain[keyboardIndex]!;
      const candidate = findNearestSeries(allData, allPoints, key, Number.POSITIVE_INFINITY);
      const series = candidate ? opts.getSeriesList()[candidate.seriesIndex] : undefined;

      if (!candidate || !series) return;

      opts.crosshair?.show(
        candidate.point.x,
        candidate.point.y,
        opts.dims().width,
        opts.dims().height,
        `${series.name}: ${candidate.datum.value}`,
      );
      opts.tooltip?.show(
        candidate.point.x + opts.dims().margin.left,
        candidate.point.y + opts.dims().margin.top,
        candidate.datum,
        series,
      );
      opts.onHover?.({ datum: candidate.datum, originalEvent: event, series });
    }

    if ((event.key === 'Enter' || event.key === ' ') && opts.onClick) {
      event.preventDefault();

      const key = domain[keyboardIndex]!;
      const candidate = findNearestSeries(allData, allPoints, key, Number.POSITIVE_INFINITY);
      const series = candidate ? opts.getSeriesList()[candidate.seriesIndex] : undefined;

      if (candidate && series) opts.onClick({ datum: candidate.datum, originalEvent: event, series });
    }

    if (event.key === 'Escape') {
      opts.crosshair?.hide();
      opts.tooltip?.hide();
      opts.onHover?.(null);
    }
  };

  return { onClick, onKeyDown, onMouseLeave, onMouseMove };
}
