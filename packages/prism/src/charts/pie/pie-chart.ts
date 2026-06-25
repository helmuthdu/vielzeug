import { isSignal } from '@vielzeug/ripple';

import type { ChartEventHandlers } from '../../core/chart-scaffold';
import type { ChartHandle, PieChartConfig, PieSliceConfig } from '../../types';

import { resolveEasing } from '../../animation/easing';
import { tweenNumber } from '../../animation/tween';
import { createRadialScaffold } from '../../core/chart-scaffold';
import { createSvgElement, setAttributes } from '../../svg/element';
import { seriesColor } from '../../theme';
import { type Arc, arcCentroid, arcPath, computeArcs } from './pie-renderer';

const TWO_PI = 2 * Math.PI;

const SEMI_START = -Math.PI / 2; // -90° = 9-o'clock (left)
const SEMI_END = Math.PI / 2; // +90° = 3-o'clock (right) → true 180° half-circle

function semiAngles(variant: PieChartConfig['variant']): { end: number; start: number } {
  return variant === 'semi' ? { end: SEMI_END, start: SEMI_START } : { end: TWO_PI, start: 0 };
}

export function createPieChart(container: HTMLElement, config: PieChartConfig): ChartHandle {
  const variant = config.variant ?? 'pie';
  const padPixels = config.padPixels ?? (variant === 'pie' ? 0 : 8);
  const cornerRadius = config.cornerRadius ?? (variant === 'pie' ? 0 : 8);

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
  let activeRaf: number | null = null;

  function renderLabels(slices: PieSliceConfig[]): void {
    while (labelGroup.children.length > currentArcs.length) labelGroup.removeChild(labelGroup.lastChild!);

    for (let i = 0; i < currentArcs.length; i++) {
      const arc = currentArcs[i];
      const slice = slices[i];

      if (!slice?.label) continue;

      const { x, y } = arcCentroid(arc);
      let text = labelGroup.children[i] as SVGTextElement | undefined;

      if (!text) {
        text = createSvgElement('text', { class: 'prism-pie-label' });
        labelGroup.appendChild(text);
      }

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
    }
  }

  const handle = createRadialScaffold(
    container,
    { ariaLabel: config.ariaLabel, legend: config.legend, plugins: config.plugins, tooltip: config.tooltip },
    (ctx): ChartEventHandlers => {
      const { legend, svg, tooltip } = ctx;

      // Append pie groups to SVG on first render (idempotent).
      if (!svg.contains(bgCircle)) {
        svg.appendChild(bgCircle);
        svg.appendChild(pieGroup);
        svg.appendChild(labelGroup);
      }

      const { height: h, width: w } = ctx.dimensions.value;
      const isSemi = variant === 'semi';
      const cx = w / 2;
      const cy = isSemi ? h * 0.85 : h / 2;
      const padding = 8;
      const outer = isSemi ? Math.min(cx, cy) - padding : Math.min(w, h) / 2 - padding;
      const defaultInner = variant === 'pie' ? 0 : Math.round(outer * 0.55);
      const inner = config.innerRadius !== undefined ? config.innerRadius : defaultInner;
      const outerR = Math.max(inner + 1, outer);

      const slices = isSignal(config.data) ? config.data.value : config.data;
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

      while (labelGroup.children.length > currentArcs.length) labelGroup.removeChild(labelGroup.lastChild!);

      const dur = config.transition?.duration ?? 400;
      const easing = resolveEasing(config.transition?.easing);

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

      if (activeRaf !== null) {
        cancelAnimationFrame(activeRaf);
        activeRaf = null;
      }

      if (dur > 0) {
        let rafStart: number | null = null;

        const frame = (ts: number) => {
          if (rafStart === null) rafStart = ts;

          const t = easing(Math.min(1, (ts - rafStart) / dur));
          const revealAngle = tweenNumber(start, end, t);

          for (let j = 0; j < currentArcs.length; j++) {
            const a = currentArcs[j];
            const el = pieGroup.children[j] as SVGPathElement | undefined;

            if (!el) continue;

            if (revealAngle <= a.startAngle) {
              setAttributes(el, { d: '' });
            } else {
              const visibleEnd = Math.min(a.endAngle, revealAngle);

              setAttributes(el, { d: arcPath({ ...a, endAngle: visibleEnd }) });
            }
          }

          if (t < 1) {
            activeRaf = requestAnimationFrame(frame);
          } else {
            activeRaf = null;
            renderLabels(slices);
          }
        };

        activeRaf = requestAnimationFrame(frame);
      } else {
        for (let j = 0; j < currentArcs.length; j++) {
          const a = currentArcs[j];
          const el = pieGroup.children[j] as SVGPathElement | undefined;

          if (el) setAttributes(el, { d: arcPath(a) });
        }

        renderLabels(slices);
      }

      legend?.update(currentArcs.map((arc) => ({ color: arc.color, name: arc.slice.label ?? '' })));
      tooltip?.hide();

      const onMouseMove = (e: MouseEvent): void => {
        const svgRect = svg.getBoundingClientRect();
        const mx = e.clientX - svgRect.left;
        const my = e.clientY - svgRect.top;
        const hit = hitTestArc(currentArcs, mx, my, variant);

        if (hit >= 0) {
          const arc = currentArcs[hit];

          config.onHover?.(arc.slice, hit);

          const { x, y } = arcCentroid(arc);
          const contR = container.getBoundingClientRect();

          tooltip?.show(
            x + (svgRect.left - contR.left),
            y + (svgRect.top - contR.top),
            { key: hit, value: arc.slice.value },
            { color: arc.color, data: [], name: arc.slice.label ?? '' },
          );
        } else {
          config.onHover?.(null, null);
          tooltip?.hide();
        }
      };

      const onMouseLeave = (): void => {
        config.onHover?.(null, null);
        tooltip?.hide();
      };

      const onClick = (e: MouseEvent): void => {
        if (!config.onClick) return;

        const svgRect = svg.getBoundingClientRect();
        const mx = e.clientX - svgRect.left;
        const my = e.clientY - svgRect.top;
        const hit = hitTestArc(currentArcs, mx, my, variant);

        if (hit >= 0) config.onClick(currentArcs[hit].slice, hit);
      };

      return { onClick, onMouseLeave, onMouseMove };
    },
  );

  return {
    get disposalSignal(): AbortSignal {
      return handle.disposalSignal;
    },

    dispose() {
      if (activeRaf !== null) {
        cancelAnimationFrame(activeRaf);
        activeRaf = null;
      }

      handle.dispose();
    },

    get disposed(): boolean {
      return handle.disposed;
    },

    el: handle.el,

    [Symbol.dispose]() {
      this.dispose();
    },
  };
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
