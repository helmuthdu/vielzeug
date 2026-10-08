import { devOnly, warn } from '../_dev';
import { createSvgElement, removeChildren, setAttributes } from '../svg/element';
import { createTextElement, estimateTextWidth } from '../svg/text';
import type { AxisConfig, AxisPosition } from '../types';
import { type AnyScale, mapTick } from './scale-utils';

/** Default `--prism-font-size-label` in px, used to estimate category label size. */
const LABEL_FONT_SIZE = 11;
const LABEL_GAP = 8;

const COMPACT = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3, notation: 'compact' });

/**
 * Dates localize; magnitudes of 1e5 and above render in compact notation ("123K",
 * "1.23M") so a long number cannot crop against the default 50 px value-axis margin.
 * With three significant digits every compact label is at most as wide as "99999",
 * the widest plain label below the threshold. Opt out with `tickFormat: String`.
 */
const defaultTickFormat = (v: Date | number | string): string => {
  if (v instanceof Date) return v.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  if (typeof v === 'number' && Math.abs(v) >= 1e5) return COMPACT.format(v);

  return String(v);
};

/**
 * The single tick source for an axis and its gridlines: explicit `tickValues` when set,
 * scale-generated ticks otherwise. Keeping grid on this same array is what stops
 * gridlines from drifting off the rendered ticks.
 */
export function resolveTicks(scale: AnyScale, config: AxisConfig, tickCount: number): (Date | number | string)[] {
  return config.tickValues ? [...config.tickValues] : scale.ticks(tickCount);
}

/** Development-only check that explicit tickValues match the scale they render on. */
function warnOffScaleTicks(scale: AnyScale, tickValues: ReadonlyArray<Date | number | string>): void {
  devOnly(() => {
    if ('bandwidth' in scale) {
      for (const tick of tickValues) {
        if (!scale.domain.includes(tick as string)) {
          warn(`renderAxis: tickValue "${String(tick)}" is not a category in the band scale's domain.`);
        }
      }

      return;
    }

    const toMs = (v: Date | number): number => (v instanceof Date ? v.getTime() : v);
    const [a, b] = scale.domain;
    const lo = Math.min(toMs(a), toMs(b));
    const hi = Math.max(toMs(a), toMs(b));

    for (const tick of tickValues) {
      const value = tick instanceof Date ? tick.getTime() : Number(tick);

      if (Number.isNaN(value) || value < lo || value > hi) {
        warn(`renderAxis: tickValue "${String(tick)}" is outside the axis domain and renders off-canvas.`);
      }
    }
  });
}

/**
 * Resolves the tick count an axis will render for a given scale/length: charts pass it to
 * `resolveTicks` for both the axis and its gridlines so the two stay aligned.
 * `defaultPosition` must match the one passed to the corresponding `renderAxis` call
 * ('bottom' for xAxis, 'left' for yAxis).
 */
export function positionAxis(parent: SVGGElement, position: AxisPosition, width: number, height: number): void {
  const transform =
    position === 'bottom' ? `translate(0,${height})` : position === 'right' ? `translate(${width},0)` : undefined;

  if (transform) parent.setAttribute('transform', transform);
  else parent.removeAttribute('transform');
}

export function resolveTickCount(config: AxisConfig, length: number, defaultPosition: AxisPosition): number {
  const position = config.position ?? defaultPosition;
  const isHorizontal = position === 'bottom' || position === 'top';
  const defaultTickCount = isHorizontal ? Math.max(2, Math.floor(length / 80)) : Math.max(2, Math.floor(length / 50));

  return config.tickCount ?? defaultTickCount;
}

/** How many category labels fit along the axis without their estimated boxes overlapping. */
function categoryTickCount(
  domain: readonly string[],
  format: (value: string) => string,
  length: number,
  isHorizontal: boolean,
): number {
  if (domain.length === 0) return 0;

  const size = isHorizontal
    ? Math.max(...domain.map((value) => estimateTextWidth(format(value), LABEL_FONT_SIZE)))
    : LABEL_FONT_SIZE * 1.3;

  return Math.max(1, Math.min(domain.length, Math.floor(length / (size + LABEL_GAP))));
}

/**
 * `defaultPosition` is applied when `config.position` is unset: pass `'bottom'` for an
 * xAxis call and `'left'` for a yAxis call so an unconfigured axis renders on its
 * conventional side instead of always defaulting to a horizontal bottom axis.
 */
export function renderAxis(
  parent: SVGGElement,
  scale: AnyScale,
  config: AxisConfig,
  length: number,
  defaultPosition: AxisPosition = 'bottom',
): void {
  removeChildren(parent);

  const position = config.position ?? defaultPosition;
  const isHorizontal = position === 'bottom' || position === 'top';
  const isInverted = position === 'top' || position === 'left';
  const tickSize = 6;
  const tickDirection = isInverted ? -1 : 1;

  const axisLine = createSvgElement('line', {
    'aria-hidden': 'true',
    class: 'prism-axis-line',
    x1: isHorizontal ? 0 : 0,
    x2: isHorizontal ? length : 0,
    y1: isHorizontal ? 0 : 0,
    y2: isHorizontal ? 0 : length,
  });

  parent.appendChild(axisLine);

  const format = config.tickFormat ?? defaultTickFormat;
  const tickCount =
    config.tickCount === undefined && 'bandwidth' in scale
      ? categoryTickCount(scale.domain, format, length, isHorizontal)
      : resolveTickCount(config, length, defaultPosition);
  const ticks = resolveTicks(scale, config, tickCount);

  if (config.tickValues) warnOffScaleTicks(scale, config.tickValues);

  for (const tick of ticks) {
    const pos = mapTick(scale, tick);
    const tickLine = createSvgElement('line', {
      'aria-hidden': 'true',
      class: 'prism-axis-tick',
      x1: isHorizontal ? pos : 0,
      x2: isHorizontal ? pos : tickSize * tickDirection,
      y1: isHorizontal ? 0 : pos,
      y2: isHorizontal ? tickSize * tickDirection : pos,
    });

    parent.appendChild(tickLine);

    const label = createTextElement(format(tick), {
      'aria-hidden': 'true',
      class: 'prism-axis-label',
      'dominant-baseline': isHorizontal ? (isInverted ? 'auto' : 'hanging') : 'middle',
      'text-anchor': isHorizontal ? 'middle' : isInverted ? 'end' : 'start',
      x: isHorizontal ? pos : tickSize * tickDirection * 1.5,
      y: isHorizontal ? tickSize * tickDirection * 1.5 : pos,
    });

    parent.appendChild(label);
  }

  if (config.label) {
    const labelEl = createTextElement(config.label, {
      class: 'prism-axis-title',
      'dominant-baseline': 'middle',
      'text-anchor': 'middle',
    });

    if (isHorizontal) {
      setAttributes(labelEl, { x: length / 2, y: tickSize * tickDirection * 6 });
    } else {
      setAttributes(labelEl, {
        transform: `translate(${tickSize * tickDirection * 7}, ${length / 2}) rotate(-90)`,
      });
    }

    parent.appendChild(labelEl);
  }
}
