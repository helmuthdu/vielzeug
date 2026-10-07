import { resolveMotion } from '../../animation/motion';
import type { AnimationTarget } from '../../animation/transition';
import { animate } from '../../animation/transition';
import { createSvgElement, setAttributes } from '../../svg/element';
import type { BandScale, Scale, TransitionOption } from '../../types';

export interface BarRenderOptions {
  baselineYs?: number[];
  borderRadius: number;
  color: string;
  /** Aborted when the owning chart is disposed: stops in-flight transitions from rescheduling. */
  disposalSignal?: AbortSignal;
  horizontal?: boolean;
  seriesCount: number;
  seriesIndex: number;
  stacked?: boolean;
  transition?: TransitionOption;
}

/** Per-bar entrance delay; {@link MAX_STAGGER_TOTAL} bounds how long the last bar waits. */
const DEFAULT_BAR_STAGGER = 20;
/** Upper bound on the total staggered delay a bar chart may add, whatever the per-bar value. */
const MAX_STAGGER_TOTAL = 400;

const activeBarAnimations = new WeakMap<SVGGElement, () => void>();

export function renderBars(
  parent: SVGGElement,
  data: { base: number; dash?: string; key: string; opacity?: number; present: boolean; y: number }[],
  xScale: BandScale,
  yScale: Scale<number>,
  baselineY: number,
  options: BarRenderOptions,
): void {
  while (parent.children.length > data.length) {
    const last = parent.lastElementChild;

    if (last) parent.removeChild(last);
  }

  const bandwidth = xScale.bandwidth();
  const barBand = options.stacked ? bandwidth : bandwidth / options.seriesCount;
  const offset = options.stacked ? 0 : barBand * options.seriesIndex;
  const horizontal = options.horizontal ?? false;

  const enterTargets: AnimationTarget[] = [];
  const updateTargets: AnimationTarget[] = [];
  const motion = resolveMotion(options.transition, { defaultStagger: DEFAULT_BAR_STAGGER });
  const animateBars = motion.duration > 0;
  // A long category axis must not stretch the entrance past ~400 ms of added delay.
  const enterStagger = Math.min(motion.stagger, MAX_STAGGER_TOTAL / Math.max(1, data.length));

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const bandPos = xScale.map(d.key) + offset;
    const barBaselineY = options.baselineYs ? options.baselineYs[i] : baselineY;
    const valuePx = yScale.map(d.y);

    let rect = parent.children[i] as SVGRectElement | undefined;

    const isNew = !rect;

    if (!rect) {
      rect = createSvgElement('rect', { class: 'prism-bar' });
      parent.appendChild(rect);
    }

    rect.style.display = d.present ? '' : 'none';

    // Presentation attributes (not inline styles) so CSS interaction states
    // like the focus-dim rule keep winning over per-datum styling.
    setAttributes(rect, {
      opacity: d.opacity,
      stroke: d.dash ? options.color : undefined,
      'stroke-dasharray': d.dash,
      'stroke-width': d.dash ? 1 : undefined,
    });

    if (horizontal) {
      // Horizontal: category on Y axis, value on X axis
      // baselineY here is actually the baseline X (yScale.map(0) in value-space mapped to screen X)
      const finalWidth = Math.max(0, Math.abs(barBaselineY - valuePx));
      const finalX = Math.min(valuePx, barBaselineY);

      setAttributes(rect, {
        fill: options.color,
        height: Math.max(0, barBand - 1),
        rx: options.borderRadius,
        ry: options.borderRadius,
        y: bandPos,
      });

      if (animateBars) {
        if (isNew) {
          setAttributes(rect, { width: 0, x: barBaselineY });
          enterTargets.push({
            attrs: { width: { from: 0, to: finalWidth }, x: { from: barBaselineY, to: finalX } },
            el: rect,
          });
        } else {
          updateTargets.push({
            attrs: {
              width: { from: Number(rect.getAttribute('width') ?? finalWidth), to: finalWidth },
              x: { from: Number(rect.getAttribute('x') ?? finalX), to: finalX },
            },
            el: rect,
          });
        }
      } else {
        setAttributes(rect, { width: finalWidth, x: finalX });
      }
    } else {
      // Vertical (default)
      const finalHeight = Math.max(0, Math.abs(barBaselineY - valuePx));
      const finalY = Math.min(valuePx, barBaselineY);

      setAttributes(rect, {
        fill: options.color,
        rx: options.borderRadius,
        ry: options.borderRadius,
        width: Math.max(0, barBand - 1),
        x: bandPos,
      });

      if (animateBars) {
        if (isNew) {
          setAttributes(rect, { height: 0, y: barBaselineY });
          enterTargets.push({
            attrs: { height: { from: 0, to: finalHeight }, y: { from: barBaselineY, to: finalY } },
            el: rect,
          });
        } else {
          updateTargets.push({
            attrs: {
              height: { from: Number(rect.getAttribute('height') ?? finalHeight), to: finalHeight },
              y: { from: Number(rect.getAttribute('y') ?? finalY), to: finalY },
            },
            el: rect,
          });
        }
      } else {
        setAttributes(rect, { height: finalHeight, y: finalY });
      }
    }
  }

  if (animateBars) {
    activeBarAnimations.get(parent)?.();

    const cancels: (() => void)[] = [];

    if (enterTargets.length > 0) {
      cancels.push(animate(enterTargets, { ...motion, stagger: enterStagger }, undefined, options.disposalSignal));
    }

    if (updateTargets.length > 0) {
      cancels.push(animate(updateTargets, { ...motion, stagger: 0 }, undefined, options.disposalSignal));
    }

    activeBarAnimations.set(parent, () => {
      for (const cancel of cancels) cancel();
    });
  }
}
