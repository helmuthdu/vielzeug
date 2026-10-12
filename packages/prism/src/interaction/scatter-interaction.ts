import type { ChartEventHandlers } from '../core/chart-scaffold';
import { chartArea } from '../core/layout';
import { createSvgElement } from '../svg/element';
import type { Point } from '../svg/path';
import type { ChartDimensions, ChartEvent, ChartMargin, ContinuousDatum, Series, TooltipConfig } from '../types';
import { type Announcer, describeValues } from './announcer';
import type { CrosshairState } from './crosshair';
import { getMousePosition } from './events';
import { keyLabel } from './series-interaction';
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
  /** Parent of the per-series point groups; the active series is emphasised and the rest dim. */
  seriesGroup: SVGGElement;
  svg: SVGSVGElement;
  tooltip?: TooltipState | null;
  /** Value/title formatters from the tooltip config, applied to the row and spoken text alike. */
  tooltipFormat?: Pick<TooltipConfig, 'titleFormat' | 'valueFormat'>;
}

interface Hit {
  datum: ContinuousDatum;
  point: Point;
  seriesIndex: number;
}

/**
 * Pointer and keyboard interaction for a scatter plot. A scatter point is an
 * independent `(x, y)` pair rather than one sample at a shared key, so the active
 * point is the one nearest the pointer in two dimensions, events carry no
 * cross-series `values`, and keyboard navigation walks every point in x order.
 */
export function createScatterInteraction(opts: ScatterInteractionOptions): ChartEventHandlers {
  let keyboardIndex = -1;
  let active = false;

  const hitAt = (seriesIndex: number, pointIndex: number): Hit | null => {
    const datum = opts.getData()[seriesIndex]?.[pointIndex];
    const point = opts.getPoints()[seriesIndex]?.[pointIndex];

    return datum && point ? { datum, point, seriesIndex } : null;
  };

  const renderedHit = (event: Event): Hit | null => {
    const target = event.target;

    if (
      !(target instanceof SVGElement) ||
      !target.classList.contains('prism-scatter-point') ||
      !target.parentElement ||
      target.parentElement.parentNode !== opts.seriesGroup
    )
      return null;

    return hitAt(
      [...opts.seriesGroup.children].indexOf(target.parentElement),
      [...target.parentElement.children].indexOf(target),
    );
  };

  const nearestHit = (pos: Point): Hit | null => {
    let best: Hit | null = null;
    let minDistance = Infinity;

    for (const [seriesIndex, points] of opts.getPoints().entries()) {
      for (const pointIndex of points.keys()) {
        const hit = hitAt(seriesIndex, pointIndex);

        if (!hit) continue;

        const distance = Math.hypot(hit.point.x - pos.x, hit.point.y - pos.y);

        if (distance < minDistance) {
          minDistance = distance;
          best = hit;
        }
      }
    }

    return best;
  };

  // Every point across every series in x order (then y, then series order), for keyboard traversal.
  const orderedHits = (): Hit[] => {
    const hits: Hit[] = [];

    for (const [seriesIndex, data] of opts.getData().entries()) {
      for (const pointIndex of data.keys()) {
        const hit = hitAt(seriesIndex, pointIndex);

        if (hit) hits.push(hit);
      }
    }

    return hits.sort((a, b) => a.point.x - b.point.x || a.point.y - b.point.y || a.seriesIndex - b.seriesIndex);
  };

  const eventFor = (hit: Hit, originalEvent: Event): ChartEvent => ({
    datum: hit.datum,
    originalEvent,
    series: opts.getSeriesList()[hit.seriesIndex],
  });

  const highlight = (hit: Hit | null): void => {
    const groups = [...opts.seriesGroup.children];

    opts.markers.replaceChildren();

    if (hit) {
      opts.markers.appendChild(
        createSvgElement('circle', {
          class: 'prism-active-point',
          cx: hit.point.x,
          cy: hit.point.y,
          fill: opts.colors()[hit.seriesIndex],
          r: 4,
        }),
      );
    }

    opts.seriesGroup.classList.toggle('prism-series-focused', hit !== null && groups.length > 1);
    for (const [index, group] of groups.entries())
      group.classList.toggle('prism-series-active', index === hit?.seriesIndex);
  };

  const clear = (): void => {
    opts.crosshair?.hide();
    opts.tooltip?.hide();
    opts.announcer.clear();
    highlight(null);
    active = false;
    opts.onHover?.(null);
  };

  const focus = (hit: Hit, raw: Point | null, originalEvent: Event): void => {
    const dims = opts.dims();
    const area = chartArea(dims.width, dims.height, opts.margin);
    const follow = opts.crosshair?.snap === false && raw;
    const event = eventFor(hit, originalEvent);
    const { datum, series } = event;
    const label = opts.tooltipFormat?.titleFormat ? opts.tooltipFormat.titleFormat(datum.key) : keyLabel(datum.key);
    const valueFormat = opts.tooltipFormat?.valueFormat;
    const spoken = describeValues(label, [{ datum, series }], valueFormat ?? String);

    opts.crosshair?.show(follow ? raw.x : hit.point.x, follow ? raw.y : hit.point.y, area.width, area.height);
    highlight(hit);

    if (opts.tooltip) {
      const row = {
        color: opts.colors()[hit.seriesIndex],
        name: series.name,
        value: valueFormat ? valueFormat(datum.value, datum, series) : String(datum.value),
      };

      opts.tooltip.show(
        hit.point.x + opts.margin.left,
        hit.point.y + opts.margin.top,
        datum,
        series,
        comparisonContent(opts.svg.ownerDocument, label, [row], spoken),
      );
    } else {
      opts.announcer.announce(spoken);
    }

    active = true;
    opts.onHover?.(event);
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
      ArrowLeft: keyboardIndex < 0 ? last : Math.max(0, keyboardIndex - 1),
      ArrowRight: keyboardIndex < 0 ? 0 : Math.min(last, keyboardIndex + 1),
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
