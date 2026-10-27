import { resolveMotion } from '../../animation/motion';
import { animate } from '../../animation/transition';
import { createSvgElement, setAttributes } from '../../svg/element';
import type { TransitionOption } from '../../types';
import { valueColorFor } from '../heatmap/heatmap-color';

/**
 * One entry per label to paint, in value-axis/band-axis screen space: the
 * value axis runs along x for horizontal bars and along y (inverted) for
 * vertical ones; the band axis is the category axis.
 */
export interface BarValueLabel {
  /** Bar thickness along the category axis (inside-fit room for text height). */
  bandSize: number;
  /** Bar length along the value axis, from the value edge toward the baseline. */
  barLength: number;
  /** Band-axis center of the bar. */
  center: number;
  /** Sign of the bar's value: +1 grows right (horizontal) or up (vertical). */
  dir: 1 | -1;
  text: string;
  /** Value-axis pixel of the bar's value-side edge (screen px, plot-local). */
  valueEdge: number;
}

export interface BarValueLabelOptions {
  /** Plot extent along the value axis (area.width horizontal, area.height vertical). */
  areaExtent: number;
  disposalSignal?: AbortSignal;
  horizontal: boolean;
  transition?: TransitionOption;
}

/**
 * Width estimate for the flip decision, matching the axis-label estimate used
 * across the examples: label font size (11px) times an average advance of
 * 0.6em, plus a small safety pad. Deliberately conservative: a label that is
 * misjudged flips inside its own bar, which is always readable.
 */
const CHAR_PX = 11 * 0.6;
const STANDOFF_PX = 6;
const PAD_PX = 4;
/** Minimum room along the band axis for text to sit inside a bar. */
const INSIDE_BAND_MIN = 16;

function estWidth(text: string): number {
  return text.length * CHAR_PX + PAD_PX;
}

/**
 * Paint (or repaint) the value labels into `group`, replacing its children.
 * Labels sit just past each bar's value-side end; one that would leave the
 * plot flips inside the bar with a fill contrasted against the bar's computed
 * color; one that fits neither way is skipped rather than clipped.
 */
export function renderBarValueLabels(group: SVGGElement, labels: BarValueLabel[], options: BarValueLabelOptions): void {
  while (group.firstChild) group.removeChild(group.firstChild);

  for (const label of labels) {
    const width = estWidth(label.text);
    // The outside direction in value-axis px: positive bars grow right
    // (horizontal) or up-screen (vertical, whose scale is inverted); negative
    // bars mirror. `step` is the signed stand-off toward the outside.
    const step = options.horizontal ? label.dir * STANDOFF_PX : -label.dir * STANDOFF_PX;
    const outsidePos = label.valueEdge + step;
    // Outside fits when the label's box stays inside the plot along the value
    // axis: [outsidePos, outsidePos + width] for horizontal, a text height of
    // ~11px for vertical.
    const outsideFits = options.horizontal
      ? step > 0
        ? outsidePos + width <= options.areaExtent
        : outsidePos - width >= 0
      : step < 0
        ? outsidePos >= 0
        : outsidePos + 11 <= options.areaExtent;
    // Inside: within the bar at its value end, along both axes.
    const insideFits = options.horizontal
      ? label.bandSize > INSIDE_BAND_MIN &&
        (step > 0
          ? label.valueEdge - STANDOFF_PX - width >= 0
          : label.valueEdge + STANDOFF_PX + width <= options.areaExtent)
      : label.barLength > INSIDE_BAND_MIN && label.bandSize >= width;

    if (!outsideFits && !insideFits) continue;

    const inside = !outsideFits;
    const text = createSvgElement('text', {
      class: inside ? 'prism-bar-value prism-bar-value--inside' : 'prism-bar-value',
    });

    text.textContent = label.text;

    if (options.horizontal) {
      setAttributes(text, {
        'dominant-baseline': 'central',
        'text-anchor': inside ? (step > 0 ? 'end' : 'start') : step > 0 ? 'start' : 'end',
        x: String(inside ? label.valueEdge - step : outsidePos),
        y: String(label.center),
      });
    } else {
      setAttributes(text, {
        'dominant-baseline': inside ? (step < 0 ? 'hanging' : 'auto') : step < 0 ? 'auto' : 'hanging',
        'text-anchor': 'middle',
        x: String(label.center),
        y: String(inside ? label.valueEdge - step : outsidePos),
      });
    }

    if (inside) {
      // Contrast against the bar itself: the rect's computed fill resolves CSS
      // colors (jsdom leaves it empty, where the theme text fallback applies).
      const bar = barAt(group, options, label);
      const fill = bar ? getComputedStyle(bar).fill : '';

      text.style.setProperty('fill', valueColorFor(fill, 'var(--prism-text-color, #0f172a)'));
    }

    group.appendChild(text);
  }

  // Bars grow in; labels fade in over the same window so they never sit on
  // empty space mid-reveal. Reduced motion (duration 0) shows them directly.
  const motion = resolveMotion(options.transition, { defaultStagger: 0 });

  if (motion.duration > 0) {
    animate(
      [{ attrs: { opacity: { from: 0, to: 1 } }, el: group }],
      { ...motion, stagger: 0 },
      undefined,
      options.disposalSignal,
    );
  }
}

/**
 * The bar a flipped label sits in: a rect whose band contains the label
 * center. Only used to read a computed fill for contrast, so an approximate
 * match is acceptable and a miss falls back to theme text.
 */
function barAt(group: SVGGElement, options: BarValueLabelOptions, label: BarValueLabel): SVGRectElement | null {
  const bars = [...(group.parentElement?.querySelectorAll<SVGRectElement>('.prism-bar') ?? [])];

  for (const bar of bars) {
    const bandPos = Number(bar.getAttribute(options.horizontal ? 'y' : 'x'));
    const size = Number(bar.getAttribute(options.horizontal ? 'height' : 'width'));

    if (label.center >= bandPos && label.center <= bandPos + size) return bar;
  }

  return bars[0] ?? null;
}
