import { chartArea } from '../core/layout';
import { createSvgElement } from '../svg/element';
import type { Point } from '../svg/path';
import type { ChartDimensions, ChartEvent, ChartMargin, ContinuousDatum, Series } from '../types';
import type { Announcer } from './announcer';
import type { CrosshairState } from './crosshair';
import { getMousePosition } from './events';
import { comparisonContent, type TooltipState } from './tooltip';

export interface ScatterInteractionOptions {
  announcer: Announcer;
  colors: () => string[];
  crosshair?: CrosshairState | null;
  dims: () => ChartDimensions;
  /** Per-series data, parallel to `getPoints`; each datum is one independent point. */
  getData: () => ContinuousDatum[][];
  getPoints: () => Point[][];
  getSeriesList: () => Series[];
  /** Effective chart margin: hit bounds and tooltip offsets use this, never the shared dimensions. */
  margin: ChartMargin;
  /** Receives the single active-point marker. */
  markers: SVGGElement;
  onClick?: ((event: ChartEvent) => void) | undefined;
  onHover?: ((event: ChartEvent | null) => void) | undefined;
  /** Parent of the per-series point groups; used to resolve a hit target back to its series. */
  seriesGroup: SVGGElement;
  svg: SVGSVGElement;
  tooltip?: TooltipState | null;
}

interface Hit {
  datum: ContinuousDatum;
  point: Point;
  seriesIndex: number;
}

/** A scatter point's x label: dates read as dates, numbers as-is. */
const xLabel = (key: number | Date): string => (key instanceof Date ? key.toLocaleDateString() : String(key));

/**
 * Pointer and keyboard interaction for a scatter plot. Unlike the shared
 * series interaction (which groups every series' datum at one common key), a
 * scatter point is an independent `(x, y)` pair, so the active point is the one
 * nearest the pointer in two dimensions, and keyboard navigation walks the
 * points in x order.
 */
export function createScatterInteraction(opts: ScatterInteractionOptions): {
  onClick: (event: MouseEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onMouseLeave: () => void;
  onMouseMove: (event: MouseEvent) => void;
} {
  let keyboardIndex = -1;
  let active = false;

  const renderedHit = (event: Event): Hit | null => {
    const target = event.target;

    if (
      !(target instanceof SVGElement) ||
      target.tagName.toLowerCase() !== 'circle' ||
      !opts.seriesGroup.contains(target) ||
      !target.parentElement
    ) {
      return null;
    }

    let group: Element | null = target.parentElement;

    while (group && group.parentNode !== opts.seriesGroup) group = group.parentElement;

    if (!group) return null;

    const seriesIndex = [...opts.seriesGroup.children].indexOf(group);
    const pointIndex = [...target.parentElement.children].indexOf(target);
    const datum = opts.getData()[seriesIndex]?.[pointIndex];
    const point = opts.getPoints()[seriesIndex]?.[pointIndex];

    return datum && point ? { datum, point, seriesIndex } : null;
  };

  const nearestHit = (pos: Point): Hit | null => {
    const allPoints = opts.getPoints();
    let best: Hit | null = null;
    let minDistance = Infinity;

    for (const [seriesIndex, points] of allPoints.entries()) {
      const data = opts.getData()[seriesIndex];

      for (const [pointIndex, point] of points.entries()) {
        const datum = data?.[pointIndex];

        if (!datum) continue;

        const distance = Math.hypot(point.x - pos.x, point.y - pos.y);

        if (distance < minDistance) {
          minDistance = distance;
          best = { datum, point, seriesIndex };
        }
      }
    }

    return best;
  };

  const eventFor = (hit: Hit, originalEvent: Event): ChartEvent => ({
    datum: hit.datum,
    originalEvent,
    series: opts.getSeriesList()[hit.seriesIndex],
  });

  const highlight = (hit: Hit): void => {
    opts.markers.replaceChildren(
      createSvgElement('circle', {
        class: 'prism-active-point',
        cx: hit.point.x,
        cy: hit.point.y,
        fill: opts.colors()[hit.seriesIndex],
      }),
    );
  };

  const clear = (): void => {
    opts.crosshair?.hide();
    opts.tooltip?.hide();
    opts.announcer.clear();
    opts.markers.replaceChildren();
    active = false;
    opts.onHover?.(null);
  };

  const focus = (hit: Hit, raw: Point | null, originalEvent: Event): void => {
    const dims = opts.dims();
    const area = chartArea(dims.width, dims.height, opts.margin);
    const x = opts.crosshair?.snap === false && raw ? raw.x : hit.point.x;
    const y = opts.crosshair?.snap === false && raw ? raw.y : hit.point.y;
    const label = xLabel(hit.datum.key);
    const spoken = `${opts.getSeriesList()[hit.seriesIndex].name}: x ${label}, y ${hit.datum.value}`;

    opts.crosshair?.show(x, y, area.width, area.height);
    highlight(hit);

    if (opts.tooltip) {
      opts.tooltip.show(
        hit.point.x + opts.margin.left,
        hit.point.y + opts.margin.top,
        hit.datum,
        opts.getSeriesList()[hit.seriesIndex],
        comparisonContent(opts.svg.ownerDocument, opts.getSeriesList()[hit.seriesIndex].name, [], spoken),
      );
    } else {
      opts.announcer.announce(spoken);
    }

    active = true;
    opts.onHover?.(eventFor(hit, originalEvent));
  };

  const pointerHit = (event: MouseEvent): { hit: Hit; raw: Point } | null => {
    const rendered = renderedHit(event);

    if (rendered) return { hit: rendered, raw: rendered.point };

    const dims = opts.dims();
    const raw = getMousePosition(opts.svg, event, opts.margin.left, opts.margin.top);
    const area = chartArea(dims.width, dims.height, opts.margin);

    if (raw.x < 0 || raw.x > area.width || raw.y < 0 || raw.y > area.height) return null;

    const hit = nearestHit(raw);

    return hit ? { hit, raw } : null;
  };

  // Every point across every series, in x order, for keyboard traversal.
  const orderedHits = (): Hit[] => {
    const hits: Hit[] = [];

    for (const [seriesIndex, data] of opts.getData().entries()) {
      const points = opts.getPoints()[seriesIndex];

      for (const [pointIndex, datum] of data.entries()) {
        const point = points?.[pointIndex];

        if (point) hits.push({ datum, point, seriesIndex });
      }
    }

    return hits.sort((a, b) => a.point.x - b.point.x || a.point.y - b.point.y);
  };

  const onMouseMove = (event: MouseEvent): void => {
    const found = pointerHit(event);

    if (found) focus(found.hit, found.raw, event);
    else if (active) clear();
  };

  const onClick = (event: MouseEvent): void => {
    if (!opts.onClick) return;

    const found = pointerHit(event);

    if (found) opts.onClick(eventFor(found.hit, event));
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const hits = orderedHits();

    if (hits.length === 0) return;

    const last = hits.length - 1;
    const target: Record<string, number> = {
      ArrowDown: keyboardIndex < 0 ? 0 : Math.min(last, keyboardIndex + 1),
      ArrowLeft: keyboardIndex < 0 ? last : Math.max(0, keyboardIndex - 1),
      ArrowRight: keyboardIndex < 0 ? 0 : Math.min(last, keyboardIndex + 1),
      ArrowUp: keyboardIndex < 0 ? last : Math.max(0, keyboardIndex - 1),
      End: last,
      Home: 0,
    };

    if (event.key in target) {
      event.preventDefault();
      keyboardIndex = target[event.key];
      focus(hits[keyboardIndex], null, event);
    } else if ((event.key === 'Enter' || event.key === ' ') && keyboardIndex >= 0 && opts.onClick) {
      event.preventDefault();

      opts.onClick(eventFor(hits[keyboardIndex], event));
    } else if (event.key === 'Escape') {
      keyboardIndex = -1;
      clear();
    }
  };

  return { onClick, onKeyDown, onMouseLeave: clear, onMouseMove };
}
