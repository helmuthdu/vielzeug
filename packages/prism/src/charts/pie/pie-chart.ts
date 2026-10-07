import { resolveEasing } from '../../animation/easing';
import { resolveMotion } from '../../animation/motion';
import { startTween } from '../../animation/transition';
import { tweenNumber } from '../../animation/tween';
import type { ChartEventHandlers } from '../../core/chart-scaffold';
import { createRadialScaffold } from '../../core/chart-scaffold';
import { createSvgElement, setAttributes } from '../../svg/element';
import { estimateTextWidth } from '../../svg/text';
import { seriesColor } from '../../theme';
import type { ChartHandle, PieChartConfig, PieSliceConfig } from '../../types';
import { type Arc, arcCentroid, arcPath, computeArcs } from './pie-renderer';

const TWO_PI = 2 * Math.PI;
/** Default `--prism-pie-label-size` in px, used to decide whether a label fits its slice. */
const LABEL_FONT_SIZE = 12;

/** A label fits when its slice is wide enough along the centroid arc and thick enough radially. */
function labelFits(arc: Arc, label: string): boolean {
  const thickness = arc.outerRadius - arc.innerRadius;
  const midRadius = (arc.outerRadius + arc.innerRadius) / 2;
  const arcLength = (arc.endAngle - arc.startAngle - 2 * arc.padAngle) * midRadius;

  return thickness >= LABEL_FONT_SIZE * 1.4 && arcLength >= estimateTextWidth(label, LABEL_FONT_SIZE) + 8;
}

const SEMI_START = -Math.PI / 2; // -90° = 9-o'clock (left)
const SEMI_END = Math.PI / 2; // +90° = 3-o'clock (right) → true 180° half-circle

function semiAngles(variant: PieChartConfig['variant']): { end: number; start: number } {
  return variant === 'semi' ? { end: SEMI_END, start: SEMI_START } : { end: TWO_PI, start: 0 };
}

export function createPieChart(container: HTMLElement, config: PieChartConfig): ChartHandle<PieSliceConfig[]> {
  const variant = config.variant ?? 'pie';
  const padPixels = config.padPixels ?? (variant === 'pie' ? 0 : 8);
  const cornerRadius = config.cornerRadius ?? (variant === 'pie' ? 0 : 8);
  let data = config.data;

  // Pie SVG elements live directly on the SVG (not inside chartArea groups).
  // We create them once and reuse across renders.
  const bgCircle = createSvgElement('circle', { class: 'prism-pie-bg', 'pointer-events': 'none' });
  const pieGroup = createSvgElement('g', {
    class: 'prism-pie-slices',
    'shape-rendering': 'geometricPrecision',
  });
  const labelGroup = createSvgElement('g', { class: 'prism-pie-labels', 'pointer-events': 'none' });

  // Current arcs shared between renderFn and event handlers via closure.
  let currentArcs: Arc[] = [];
  // The geometry actually on screen right now (mid-tween included): the update
  // morph interpolates from this, so interrupting a tween never jumps.
  let drawnArcs: Arc[] = [];
  let activeTween: (() => void) | null = null;

  function renderLabels(slices: PieSliceConfig[]): void {
    labelGroup.replaceChildren();

    for (let i = 0; i < currentArcs.length; i++) {
      const arc = currentArcs[i];
      const slice = slices[i];

      if (!slice?.label || !labelFits(arc, slice.label)) continue;

      const { x, y } = arcCentroid(arc);
      const text = createSvgElement('text', { class: 'prism-pie-label' });

      setAttributes(text, {
        'dominant-baseline': 'middle',
        fill: 'var(--prism-pie-label-color, #fff)',
        'font-family': 'var(--prism-font-family, system-ui)',
        'font-size': 'var(--prism-pie-label-size, 12px)',
        'text-anchor': 'middle',
        x,
        y,
      });

      text.textContent = slice.label;
      labelGroup.appendChild(text);
    }
  }

  return createRadialScaffold(
    container,
    {
      a11y: config.a11y,
      legend: config.legend,
      tooltip: config.tooltip,
    },
    (ctx): ChartEventHandlers => {
      const { legend, svg, tooltip } = ctx;

      // Append pie groups to SVG on first render (idempotent).
      if (!svg.contains(bgCircle)) {
        svg.appendChild(bgCircle);
        svg.appendChild(pieGroup);
        svg.appendChild(labelGroup);
      }

      const { height: h, width: w } = ctx.dimensions;
      const isSemi = variant === 'semi';
      const cx = w / 2;
      const cy = isSemi ? h * 0.85 : h / 2;
      const padding = 8;
      const outer = isSemi ? Math.min(cx, cy) - padding : Math.min(w, h) / 2 - padding;
      const defaultInner = variant === 'pie' ? 0 : Math.round(outer * 0.55);
      const inner = config.innerRadius !== undefined ? config.innerRadius : defaultInner;
      const outerR = Math.max(inner + 1, outer);

      const slices = data;
      const { end, start } = semiAngles(variant);

      currentArcs = computeArcs(
        slices,
        cx,
        cy,
        outerR,
        inner,
        start,
        end,
        padPixels,
        cornerRadius,
        (i) => seriesColor(i),
        false,
      );

      setAttributes(bgCircle, { cx, cy, r: inner > 0 ? inner : 0 });
      bgCircle.setAttribute('style', 'fill:var(--prism-bg,#fff)');

      while (pieGroup.children.length > currentArcs.length) pieGroup.removeChild(pieGroup.lastChild!);

      labelGroup.replaceChildren();

      const motion = resolveMotion(config.transition);
      const dur = motion.duration;
      const easing = resolveEasing(motion.easing);

      for (let i = 0; i < currentArcs.length; i++) {
        const arc = currentArcs[i];
        let path = pieGroup.children[i] as SVGPathElement | undefined;

        if (!path) {
          path = createSvgElement('path', { class: 'prism-pie-slice' });
          pieGroup.appendChild(path);
        }

        path.setAttribute('fill', arc.color);
        path.setAttribute('stroke', 'none');
        path.style.cursor = config.onClick || config.onHover ? 'pointer' : '';
      }

      activeTween?.();

      // Mount sweeps the ring in once; an update morphs every slice from its
      // drawn angles to the new ones, which reads as the data changing rather
      // than the chart redrawing.
      const isMount = drawnArcs.length === 0;
      const fromArcs = drawnArcs;

      activeTween = startTween({
        count: 1,
        duration: dur,
        easing,
        onComplete: () => renderLabels(slices),
        onFrame: (progress) => {
          const e = progress(0);

          if (isMount) {
            const revealAngle = tweenNumber(start, end, e);

            drawnArcs = currentArcs.map((a, j) => {
              const el = pieGroup.children[j] as SVGPathElement | undefined;

              if (!el) return a;

              if (revealAngle <= a.startAngle) {
                setAttributes(el, { d: '' });

                return { ...a, endAngle: a.startAngle };
              }

              const visibleEnd = Math.min(a.endAngle, revealAngle);

              setAttributes(el, { d: arcPath({ ...a, endAngle: visibleEnd }) });

              return { ...a, endAngle: visibleEnd };
            });

            return;
          }

          drawnArcs = currentArcs.map((to, j) => {
            const el = pieGroup.children[j] as SVGPathElement | undefined;
            const lastDrawn = fromArcs.at(-1);
            // A slice that was not drawn before grows out of the end of the last drawn one.
            const from: Arc = fromArcs[j] ?? {
              ...to,
              endAngle: lastDrawn?.endAngle ?? start,
              startAngle: lastDrawn?.endAngle ?? start,
            };
            const morphed: Arc = {
              ...to,
              endAngle: tweenNumber(from.endAngle, to.endAngle, e),
              innerRadius: tweenNumber(from.innerRadius, to.innerRadius, e),
              outerRadius: tweenNumber(from.outerRadius, to.outerRadius, e),
              padAngle: tweenNumber(from.padAngle, to.padAngle, e),
              startAngle: tweenNumber(from.startAngle, to.startAngle, e),
            };

            if (!el) return morphed;

            setAttributes(el, {
              d: morphed.endAngle - morphed.startAngle <= 1e-6 ? '' : arcPath(morphed),
            });

            return morphed;
          });
        },
        signal: ctx.disposalSignal,
      });

      legend?.update(currentArcs.map((arc) => ({ color: arc.color, name: arc.slice.label ?? '' })));
      tooltip?.hide();

      const total = currentArcs.reduce((sum, arc) => sum + Math.max(0, arc.slice.value), 0);
      let activeIndex = -1;

      const describe = (arc: Arc): string => {
        const percent = total > 0 ? Math.round((Math.max(0, arc.slice.value) / total) * 1000) / 10 : 0;

        return `${arc.slice.label ?? `Slice ${arc.index + 1}`}: ${arc.slice.value} (${percent}%)`;
      };

      const setActive = (index: number): void => {
        activeIndex = index;
        pieGroup.classList.toggle('prism-pie-focused', index >= 0);
        for (const [i, el] of [...pieGroup.children].entries())
          el.classList.toggle('prism-pie-slice--active', i === index);
      };

      const activate = (index: number, originalEvent: Event): void => {
        const arc = currentArcs[index];

        if (!arc) return;

        setActive(index);
        config.onHover?.({ index, originalEvent, slice: arc.slice });

        const text = describe(arc);

        if (!tooltip) {
          ctx.announcer.announce(text);

          return;
        }

        const { x, y } = arcCentroid(arc);
        const svgRect = svg.getBoundingClientRect();
        const contR = container.getBoundingClientRect();

        tooltip.show(
          x + (svgRect.left - contR.left),
          y + (svgRect.top - contR.top),
          { key: index, value: arc.slice.value },
          { color: arc.color, data: [], name: arc.slice.label ?? '' },
          text,
        );
      };

      const deactivate = (): void => {
        setActive(-1);
        tooltip?.hide();
        ctx.announcer.clear();
        config.onHover?.(null);
      };

      const hitAt = (e: MouseEvent): number => {
        const svgRect = svg.getBoundingClientRect();

        return hitTestArc(currentArcs, e.clientX - svgRect.left, e.clientY - svgRect.top, variant);
      };

      const onMouseMove = (e: MouseEvent): void => {
        const hit = hitAt(e);

        if (hit >= 0) {
          if (hit !== activeIndex) activate(hit, e);
        } else if (activeIndex >= 0) {
          deactivate();
        }
      };

      const onClick = (e: MouseEvent): void => {
        if (!config.onClick) return;

        const hit = hitAt(e);

        if (hit >= 0) config.onClick({ index: hit, originalEvent: e, slice: currentArcs[hit].slice });
      };

      const onKeyDown = (e: KeyboardEvent): void => {
        const count = currentArcs.length;

        if (count === 0) return;

        const step: Record<string, number> = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 };

        if (e.key in step) {
          e.preventDefault();
          activate(
            activeIndex < 0 ? (step[e.key] > 0 ? 0 : count - 1) : (activeIndex + step[e.key] + count) % count,
            e,
          );
        } else if (e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          activate(e.key === 'Home' ? 0 : count - 1, e);
        } else if ((e.key === 'Enter' || e.key === ' ') && activeIndex >= 0 && config.onClick) {
          e.preventDefault();
          config.onClick({ index: activeIndex, originalEvent: e, slice: currentArcs[activeIndex].slice });
        } else if (e.key === 'Escape') {
          deactivate();
        }
      };

      return { onClick, onKeyDown, onMouseLeave: deactivate, onMouseMove };
    },
    (next) => {
      data = next;
    },
  );
}

function hitTestArc(arcs: Arc[], mx: number, my: number, variant: PieChartConfig['variant']): number {
  for (let i = 0; i < arcs.length; i++) {
    const arc = arcs[i];
    const dx = mx - arc.centerX;
    const dy = my - arc.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < arc.outerRadius && dist >= arc.innerRadius) {
      const rawAngle = Math.atan2(dx, -dy);

      if (variant === 'semi') {
        if (rawAngle >= arc.startAngle - 1e-9 && rawAngle <= arc.endAngle + 1e-9) return i;
      } else {
        const angle = rawAngle < 0 ? rawAngle + TWO_PI : rawAngle;

        if (angle >= arc.startAngle - 1e-9 && angle <= arc.endAngle + 1e-9) return i;
      }
    }
  }

  return -1;
}
