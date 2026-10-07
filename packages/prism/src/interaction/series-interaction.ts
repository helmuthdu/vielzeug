import { keyId } from '../core/cartesian-model';
import type { ChartEventHandlers } from '../core/chart-scaffold';
import { chartArea } from '../core/layout';
import { createSvgElement } from '../svg/element';
import type { Point } from '../svg/path';
import type { ChartDimensions, ChartEvent, ChartMargin, Datum, Series, SeriesValue } from '../types';
import { type Announcer, describeValues } from './announcer';
import type { CrosshairState } from './crosshair';
import { getMousePosition } from './events';
import { comparisonContent, type TooltipState } from './tooltip';

export interface SeriesInteractionOptions {
  announcer: Announcer;
  colors: () => string[];
  crosshair?: CrosshairState | null;
  dims: () => ChartDimensions;
  getData: () => Datum[][];
  getPoints: () => Point[][];
  getSeriesList: () => Series[];
  /** Effective chart margin (including any dual-axis widening): hit bounds and tooltip offsets use this, never the shared dimensions. */
  margin: ChartMargin;
  /** Receives one marker per series at the active key. */
  markers: SVGGElement;
  onClick?: ((event: ChartEvent) => void) | undefined;
  onHover?: ((event: ChartEvent | null) => void) | undefined;
  /** Parent of the per-series groups; the nearest series is emphasised and the rest dim. */
  seriesGroup: SVGGElement;
  svg: SVGSVGElement;
  tooltip?: TooltipState | null;
}

interface KeyEntry {
  datum: Datum | undefined;
  point: Point | undefined;
}

const keyOrder = (key: Datum['key']): number => (key instanceof Date ? key.getTime() : Number(key));

export function keyLabel(key: Datum['key']): string {
  return key instanceof Date ? key.toLocaleDateString() : String(key);
}

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

export function createSeriesInteraction(opts: SeriesInteractionOptions): ChartEventHandlers {
  let keyboardIndex = -1;
  let active = false;

  const renderedHit = (event: Event): { datum: Datum; point: Point; seriesIndex: number } | null => {
    const target = event.target;
    if (
      !(target instanceof SVGElement) ||
      target.tagName.toLowerCase() !== 'circle' ||
      !opts.seriesGroup.contains(target) ||
      !target.parentElement
    )
      return null;
    let group: Element | null = target.parentElement;
    while (group && group.parentNode !== opts.seriesGroup) group = group.parentElement;
    if (!group) return null;
    const seriesIndex = [...opts.seriesGroup.children].indexOf(group);
    const datumIndex = [...target.parentElement.children].indexOf(target);
    const datum = opts.getData()[seriesIndex]?.[datumIndex];
    const point = opts.getPoints()[seriesIndex]?.[datumIndex];
    return datum && point ? { datum, point, seriesIndex } : null;
  };

  const entriesAt = (key: Datum['key']): KeyEntry[] => {
    const id = keyId(key);
    const allPoints = opts.getPoints();

    return opts.getData().map((data, seriesIndex) => {
      const datumIndex = data.findIndex((datum) => keyId(datum.key) === id);

      return datumIndex === -1
        ? { datum: undefined, point: undefined }
        : { datum: data[datumIndex], point: allPoints[seriesIndex]?.[datumIndex] };
    });
  };

  const nearestIndex = (entries: KeyEntry[], posY: number): number => {
    let best = -1;
    let minDistance = Infinity;

    entries.forEach(({ point }, index) => {
      if (!point) return;

      const distance = Number.isFinite(posY) ? Math.abs(point.y - posY) : 0;

      if (distance < minDistance) {
        minDistance = distance;
        best = index;
      }
    });

    return best;
  };

  const highlight = (entries: KeyEntry[], emphasised: number): void => {
    const colors = opts.colors();

    opts.markers.replaceChildren();
    entries.forEach(({ point }, index) => {
      if (!point) return;

      opts.markers.appendChild(
        createSvgElement('circle', {
          class: 'prism-active-point',
          cx: point.x,
          cy: point.y,
          fill: colors[index],
          r: 4,
        }),
      );
    });

    const groups = [...opts.seriesGroup.children];

    opts.seriesGroup.classList.toggle('prism-series-focused', emphasised >= 0 && groups.length > 1);
    for (const [index, group] of groups.entries()) group.classList.toggle('prism-series-active', index === emphasised);
  };

  const clear = (): void => {
    opts.crosshair?.hide();
    opts.tooltip?.hide();
    opts.announcer.clear();
    highlight([], -1);
    active = false;
    opts.onHover?.(null);
  };

  const eventFor = (
    key: Datum['key'],
    posY: number,
    originalEvent: Event,
  ): { entries: KeyEntry[]; event: ChartEvent; index: number } | null => {
    const entries = entriesAt(key);
    const hit = renderedHit(originalEvent);
    const index = hit?.seriesIndex ?? nearestIndex(entries, posY);
    if (hit) entries[index] = { datum: hit.datum, point: hit.point };
    const seriesList = opts.getSeriesList();
    const datum = entries[index]?.datum;

    if (index < 0 || !datum) return null;

    const values: SeriesValue[] = entries.map((entry, i) => ({ datum: entry.datum, series: seriesList[i] }));

    return { entries, event: { datum, originalEvent, series: seriesList[index], values }, index };
  };

  const focus = (key: Datum['key'], pos: Point | null, originalEvent: Event): void => {
    const found = eventFor(key, pos?.y ?? Number.NaN, originalEvent);

    if (!found) return;

    const { entries, event, index } = found;
    const point = entries[index].point!;
    const dims = opts.dims();
    const area = chartArea(dims.width, dims.height, opts.margin);
    const raw = opts.crosshair?.snap === false && pos;
    const label = keyLabel(key);
    const values = event.values ?? [];
    const colors = opts.colors();

    opts.crosshair?.show(raw ? pos.x : point.x, raw ? pos.y : point.y, area.width, area.height);
    highlight(entries, index);

    const spoken = describeValues(label, values);

    if (opts.tooltip) {
      const rows = values.flatMap(({ datum, series }, i) =>
        datum ? [{ color: colors[i], name: series.name, value: String(datum.value) }] : [],
      );

      opts.tooltip.show(
        point.x + opts.margin.left,
        point.y + opts.margin.top,
        event.datum,
        event.series,
        comparisonContent(opts.svg.ownerDocument, label, rows, spoken),
      );
    } else {
      opts.announcer.announce(spoken);
    }

    active = true;
    opts.onHover?.(event);
  };

  const pointerKey = (event: MouseEvent): { key: Datum['key']; pos: Point } | null => {
    const rendered = renderedHit(event);
    if (rendered) return { key: rendered.datum.key, pos: rendered.point };
    const allPoints = opts.getPoints();

    if (allPoints.every((points) => points.length === 0)) return null;

    const dims = opts.dims();
    const pos = getMousePosition(opts.svg, event, opts.margin.left, opts.margin.top);
    const area = chartArea(dims.width, dims.height, opts.margin);

    if (pos.x < 0 || pos.x > area.width || pos.y < 0 || pos.y > area.height) return null;

    const key = findNearestKey(opts.getData(), allPoints, pos.x);

    return key === null ? null : { key, pos };
  };

  const sortedKeys = (): Datum['key'][] =>
    [
      ...new Map(
        opts
          .getData()
          .flat()
          .map((datum) => [keyId(datum.key), datum.key]),
      ).values(),
    ].sort((a, b) => keyOrder(a) - keyOrder(b));

  const onMouseMove = (event: MouseEvent): void => {
    const hit = pointerKey(event);

    if (hit) focus(hit.key, hit.pos, event);
    else if (active) clear();
  };

  const onClick = (event: MouseEvent): void => {
    if (!opts.onClick) return;

    const hit = pointerKey(event);
    const found = hit && eventFor(hit.key, hit.pos.y, event);

    if (found) opts.onClick(found.event);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const keys = sortedKeys();

    if (keys.length === 0) return;

    const last = keys.length - 1;
    const target: Record<string, number> = {
      ArrowLeft: keyboardIndex < 0 ? last : Math.max(0, keyboardIndex - 1),
      ArrowRight: keyboardIndex < 0 ? 0 : Math.min(last, keyboardIndex + 1),
      End: last,
      Home: 0,
    };

    if (event.key in target) {
      event.preventDefault();
      keyboardIndex = target[event.key];
      focus(keys[keyboardIndex], null, event);
    } else if ((event.key === 'Enter' || event.key === ' ') && keyboardIndex >= 0 && opts.onClick) {
      event.preventDefault();

      const found = eventFor(keys[keyboardIndex], Number.NaN, event);

      if (found) opts.onClick(found.event);
    } else if (event.key === 'Escape') {
      keyboardIndex = -1;
      clear();
    }
  };

  return { onClick, onKeyDown, onMouseLeave: clear, onMouseMove };
}

/** Group for the per-series active markers, reused across renders. */
export function ensureMarkerGroup(parent: SVGGElement, current: SVGGElement | null): SVGGElement {
  if (current && parent.contains(current)) return current;

  const group = createSvgElement('g', {
    'aria-hidden': 'true',
    class: 'prism-active-points',
    'pointer-events': 'none',
  });

  parent.appendChild(group);

  return group;
}
