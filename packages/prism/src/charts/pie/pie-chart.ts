import { effect, isSignal, scope } from '@vielzeug/ripple';

import type { ChartHandle, PieChartConfig, PieSliceConfig } from '../../types';

import { resolveEasing } from '../../animation/easing';
import { tweenNumber } from '../../animation/tween';
import { createChartBase } from '../../core/chart-base';
import { createTooltip } from '../../interaction/tooltip';
import { createSvgElement, setAttributes } from '../../svg/element';
import { seriesColor } from '../../types';
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

  const base = createChartBase(container, { ariaLabel: config.ariaLabel });
  const svg = base.svg;

  // Pie uses its own SVG groups appended directly to svg (not chartArea)
  const bgCircle = createSvgElement('circle', { class: 'prism-pie-bg', 'pointer-events': 'none' });
  const pieGroup = createSvgElement('g', {
    class: 'prism-pie-slices',
    'shape-rendering': 'geometricPrecision',
  });
  const labelGroup = createSvgElement('g', { class: 'prism-pie-labels', 'pointer-events': 'none' });

  svg.appendChild(bgCircle);
  svg.appendChild(pieGroup);
  svg.appendChild(labelGroup);

  const tooltip = config.tooltip ? createTooltip(container, config.tooltip) : null;
  let currentArcs: Arc[] = [];

  function getGeometry(): { cx: number; cy: number; inner: number; outer: number } {
    const { height: h, width: w } = base.dimensions.value;
    const isSemi = variant === 'semi';
    const cx = w / 2;
    const cy = isSemi ? h * 0.85 : h / 2;
    const padding = 8;
    const outer = isSemi ? Math.min(cx, cy) - padding : Math.min(w, h) / 2 - padding;
    const defaultInner = variant === 'pie' ? 0 : Math.round(outer * 0.55);
    const inner = config.innerRadius !== undefined ? config.innerRadius : defaultInner;

    return { cx, cy, inner, outer: Math.max(inner + 1, outer) };
  }

  function renderSlices(slices: PieSliceConfig[]): void {
    const { cx, cy, inner, outer } = getGeometry();
    const { end, start } = semiAngles(variant);

    currentArcs = computeArcs(
      slices,
      cx,
      cy,
      outer,
      inner,
      start,
      end,
      padPixels,
      cornerRadius,
      (i) => seriesColor(i),
      false,
    );

    // Background circle fills the center hole so it matches the container bg
    setAttributes(bgCircle, { cx, cy, r: inner > 0 ? inner + padPixels : 0 });
    bgCircle.setAttribute('style', 'fill:var(--prism-bg,#fff)');

    while (pieGroup.children.length > currentArcs.length) pieGroup.removeChild(pieGroup.lastChild!);

    while (labelGroup.children.length > currentArcs.length) labelGroup.removeChild(labelGroup.lastChild!);

    const dur = config.transition?.duration ?? 400;
    const easing = resolveEasing(config.transition?.easing);
    const fullStart = start;

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

    // Clock-sweep animation: all slices exist at final position but we
    // reveal them by masking with a sweeping end-angle from fullStart → full end.
    if (dur > 0) {
      let rafStart: number | null = null;
      const totalEnd = end;

      const frame = (ts: number) => {
        if (rafStart === null) rafStart = ts;

        const t = easing(Math.min(1, (ts - rafStart) / dur));
        const revealAngle = tweenNumber(fullStart, totalEnd, t);

        for (let j = 0; j < currentArcs.length; j++) {
          const a = currentArcs[j];
          const el = pieGroup.children[j] as SVGPathElement | undefined;

          if (!el) continue;

          if (revealAngle <= a.startAngle) {
            // Not yet revealed
            setAttributes(el, { d: '' });
          } else {
            // Partially or fully revealed
            const visibleEnd = Math.min(a.endAngle, revealAngle);
            const visibleArc: Arc = { ...a, endAngle: visibleEnd };

            setAttributes(el, { d: arcPath(visibleArc) });
          }
        }

        if (t < 1) requestAnimationFrame(frame);
        else renderLabels();
      };

      requestAnimationFrame(frame);
    } else {
      for (let j = 0; j < currentArcs.length; j++) {
        const a = currentArcs[j];
        const el = pieGroup.children[j] as SVGPathElement | undefined;

        if (el) setAttributes(el, { d: arcPath(a) });
      }

      renderLabels();
    }
  }

  function renderLabels(): void {
    const slices = isSignal(config.data) ? config.data.value : config.data;

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

  function setupInteraction(): () => void {
    const handleMouseMove = (e: MouseEvent) => {
      if (!config.onHover && !tooltip) return;

      const svgRect = svg.getBoundingClientRect();
      const mx = e.clientX - svgRect.left;
      const my = e.clientY - svgRect.top;

      let hit = -1;

      for (let i = 0; i < currentArcs.length; i++) {
        const arc = currentArcs[i];
        const dx = mx - arc.centerX;
        const dy = my - arc.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < arc.outerRadius && dist >= arc.innerRadius) {
          let angle = Math.atan2(dx, -dy);

          if (angle < 0) angle += TWO_PI;

          let normAngle = angle;

          if (variant === 'semi') {
            normAngle = Math.atan2(dx, -dy);

            if (normAngle >= 0) normAngle -= TWO_PI;
          }

          if (normAngle >= arc.startAngle - 1e-9 && normAngle <= arc.endAngle + 1e-9) {
            hit = i;
            break;
          }

          if (angle >= arc.startAngle - 1e-9 && angle <= arc.endAngle + 1e-9) {
            hit = i;
            break;
          }
        }
      }

      if (hit >= 0) {
        const arc = currentArcs[hit];

        config.onHover?.(arc.slice, hit);

        if (tooltip) {
          const { x, y } = arcCentroid(arc);
          const svgR = svg.getBoundingClientRect();
          const contR = container.getBoundingClientRect();

          tooltip.show(
            x + (svgR.left - contR.left),
            y + (svgR.top - contR.top),
            { x: arc.slice.label ?? String(hit), y: arc.slice.value },
            { color: arc.color, data: [], name: arc.slice.label ?? '' },
          );
        }
      } else {
        config.onHover?.(null, null);
        tooltip?.hide();
      }
    };

    const handleMouseLeave = () => {
      config.onHover?.(null, null);
      tooltip?.hide();
    };

    const handleClick = (e: MouseEvent) => {
      if (!config.onClick) return;

      const svgRect = svg.getBoundingClientRect();
      const mx = e.clientX - svgRect.left;
      const my = e.clientY - svgRect.top;

      for (let i = 0; i < currentArcs.length; i++) {
        const arc = currentArcs[i];
        const dx = mx - arc.centerX;
        const dy = my - arc.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < arc.outerRadius && dist >= arc.innerRadius) {
          let angle = Math.atan2(dx, -dy);

          if (angle < 0) angle += TWO_PI;

          if (variant === 'semi') {
            let a = Math.atan2(dx, -dy);

            if (a >= 0) a -= TWO_PI;

            if (a >= arc.startAngle - 1e-9 && a <= arc.endAngle + 1e-9) {
              config.onClick(arc.slice, i);

              return;
            }
          } else if (angle >= arc.startAngle - 1e-9 && angle <= arc.endAngle + 1e-9) {
            config.onClick(arc.slice, i);

            return;
          }
        }
      }
    };

    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseleave', handleMouseLeave);
    svg.addEventListener('click', handleClick);

    return () => {
      svg.removeEventListener('mousemove', handleMouseMove);
      svg.removeEventListener('mouseleave', handleMouseLeave);
      svg.removeEventListener('click', handleClick);
    };
  }

  let disposed = false;
  const cleanupInteraction = setupInteraction();

  const s = scope(() => {
    effect(
      () => {
        if (disposed) return;

        const slices = isSignal(config.data) ? config.data.value : config.data;

        renderSlices(slices);
      },
      { scheduler: 'raf' },
    );
  });

  return {
    dispose() {
      if (disposed) return;

      disposed = true;
      cleanupInteraction();
      tooltip?.destroy();
      s.dispose();
      base.dispose();
    },
    el: svg,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
