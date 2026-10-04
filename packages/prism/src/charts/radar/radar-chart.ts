import { devOnly, warn } from '../../_dev';
import { resolveEasing } from '../../animation/easing';
import { resolveMotion } from '../../animation/motion';
import { tweenNumber } from '../../animation/tween';
import type { ChartEventHandlers } from '../../core/chart-scaffold';
import { createRadialScaffold } from '../../core/chart-scaffold';
import { uniqueId } from '../../core/ids';
import { polarX, polarY } from '../../core/polar';
import { describeValues } from '../../interaction/announcer';
import { comparisonContent } from '../../interaction/tooltip';
import { createSvgElement, setAttributes } from '../../svg/element';
import { seriesColor } from '../../theme';
import type {
  ChartHandle,
  RadarAxisConfig,
  RadarAxisValue,
  RadarChartConfig,
  RadarEvent,
  RadarGridConfig,
  RadarSeriesConfig,
} from '../../types';
import {
  axisAngles,
  closedPath,
  fitRadius,
  labelPlacement,
  nearestAxis,
  normalize,
  radarPoints,
  resolveAxisDomains,
  ringPath,
  toRadians,
} from './radar-geometry';

/** Default `--prism-font-size-label` (0.6875rem) in px, used to reserve label room. */
const LABEL_FONT_SIZE = 11;
const LABEL_GAP = 12;
const VALUE_OFFSET = 10;
const ARROW_STEPS: Record<string, number> = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 };

function warnOnInvalid(axes: readonly RadarAxisConfig[], series: readonly RadarSeriesConfig[]): void {
  devOnly(() => {
    if (axes.length < 3) warn(`Radar chart needs at least 3 axes, received ${axes.length}.`);

    const keys = new Set(axes.map((axis) => axis.key));

    if (keys.size !== axes.length) warn('Radar chart axis keys must be unique.');

    for (const s of series) {
      for (const d of s.data) {
        if (!keys.has(d.key)) warn(`Radar series "${s.name}" has a value for unknown axis "${d.key}".`);
      }
    }
  });
}

function resolveGrid(grid: RadarChartConfig['grid']): Required<RadarGridConfig> | null {
  if (grid === false) return null;

  return { bands: true, labels: false, levels: 4, shape: 'polygon', ...(typeof grid === 'object' ? grid : {}) };
}

export function createRadarChart(container: HTMLElement, config: RadarChartConfig): ChartHandle<RadarSeriesConfig[]> {
  const { axes } = config;
  const curve = config.curve ?? 'linear';
  const fill = config.fill ?? 'solid';
  const showPoints = config.showPoints ?? true;
  const grid = resolveGrid(config.grid);
  const startAngle = toRadians(config.startAngle ?? 0);
  const angles = axisAngles(axes.length, startAngle);
  const labelGap = LABEL_GAP + (config.showValues ? VALUE_OFFSET : 0);
  const id = uniqueId('prism-radar');
  let series = config.series;

  warnOnInvalid(axes, series);

  const root = createSvgElement('g', { class: 'prism-radar' });
  const defs = createSvgElement('defs');
  const gridGroup = createSvgElement('g', { 'aria-hidden': 'true', class: 'prism-radar-grid' });
  const seriesGroup = createSvgElement('g', { class: 'prism-radar-series-group' });
  const labelGroup = createSvgElement('g', { 'aria-hidden': 'true', class: 'prism-radar-labels' });

  root.append(defs, gridGroup, seriesGroup, labelGroup);

  let drawn: number[][] = [];
  let activeRaf: number | null = null;
  let activeIndex = -1;
  let layout = { cx: 0, cy: 0, radius: 0 };

  const datumAt = (s: RadarSeriesConfig, index: number) => s.data.find((d) => d.key === axes[index].key);
  const valuesAt = (index: number): RadarAxisValue[] => series.map((s) => ({ datum: datumAt(s, index), series: s }));
  const formatValue = (index: number, value: number): string => axes[index].format?.(value) ?? String(value);
  const describe = (index: number): string =>
    describeValues(axes[index].label, valuesAt(index), (value) => formatValue(index, value));

  function draw(fractions: number[][]): void {
    const { cx, cy, radius } = layout;

    fractions.forEach((row, i) => {
      const group = seriesGroup.children[i];

      if (!group) return;

      const points = radarPoints(row, cx, cy, radius, angles);

      group.querySelector('.prism-radar-area')?.setAttribute('d', closedPath(points, curve));
      group.querySelectorAll<SVGCircleElement>('.prism-radar-point').forEach((dot, j) => {
        setAttributes(dot, { cx: points[j].x, cy: points[j].y });
      });
      group.querySelectorAll<SVGTextElement>('.prism-radar-value').forEach((text, j) => {
        const r = radius * row[j] + VALUE_OFFSET;

        setAttributes(text, { x: polarX(cx, r, angles[j]), y: polarY(cy, r, angles[j]) });
      });
    });
  }

  function renderGrid(domains: [number, number][]): void {
    gridGroup.replaceChildren();

    if (!grid) return;

    const { cx, cy, radius } = layout;
    const levels = Math.max(1, Math.round(grid.levels));
    const rings = Array.from({ length: levels }, (_, k) =>
      ringPath(grid.shape, cx, cy, (radius * (k + 1)) / levels, angles),
    );

    if (grid.bands) {
      // Shade alternate rings, starting from the outermost.
      for (let k = levels - 1; k >= 0; k -= 2) {
        gridGroup.appendChild(
          createSvgElement('path', {
            class: 'prism-radar-band',
            d: `${rings[k]}${rings[k - 1] ?? ''}`,
            'fill-rule': 'evenodd',
          }),
        );
      }
    }

    for (const d of rings)
      gridGroup.appendChild(createSvgElement('path', { class: 'prism-radar-ring', d, fill: 'none' }));

    angles.forEach((angle, i) => {
      gridGroup.appendChild(
        createSvgElement('line', {
          class: 'prism-radar-spoke',
          'data-axis': i,
          x1: cx,
          x2: polarX(cx, radius, angle),
          y1: cy,
          y2: polarY(cy, radius, angle),
        }),
      );
    });

    const [d0, d1] = domains[0];
    const shared = domains.every(([a, b]) => a === d0 && b === d1);

    if (!grid.labels || !shared) return;

    // Between the first two spokes, so level values never collide with vertex values.
    const angle = angles[0] + Math.PI / angles.length;

    for (let k = 1; k <= levels; k++) {
      const r = (radius * k) / levels;
      const text = createSvgElement('text', {
        class: 'prism-radar-level',
        'dominant-baseline': 'middle',
        'text-anchor': 'middle',
        x: polarX(cx, r, angle),
        y: polarY(cy, r, angle),
      });

      text.textContent = formatValue(0, Math.round((d0 + ((d1 - d0) * k) / levels) * 100) / 100);
      gridGroup.appendChild(text);
    }
  }

  function renderLabels(): void {
    labelGroup.replaceChildren();

    const { cx, cy, radius } = layout;

    axes.forEach((axis, i) => {
      const { anchor, baseline } = labelPlacement(angles[i]);
      const text = createSvgElement('text', {
        class: 'prism-radar-axis-label',
        'dominant-baseline': baseline,
        'text-anchor': anchor,
        x: polarX(cx, radius + labelGap, angles[i]),
        y: polarY(cy, radius + labelGap, angles[i]),
      });

      text.textContent = axis.label;
      labelGroup.appendChild(text);
    });
  }

  function renderSeries(): void {
    const { cx, cy, radius } = layout;

    defs.replaceChildren();

    while (seriesGroup.children.length > series.length) seriesGroup.lastChild?.remove();

    series.forEach((s, i) => {
      const color = s.color ?? seriesColor(i);
      let group = seriesGroup.children[i] as SVGGElement | undefined;

      if (!group) {
        group = createSvgElement('g', { class: 'prism-radar-series' });
        seriesGroup.appendChild(group);
      }

      group.replaceChildren();

      const area = createSvgElement('path', {
        class: `prism-radar-area prism-radar-area--${fill}`,
        stroke: color,
        'stroke-linejoin': 'round',
        'stroke-width': 2,
      });

      if (fill === 'gradient') {
        const gradientId = `${id}-fill-${i}`;
        const gradient = createSvgElement('radialGradient', {
          cx,
          cy,
          gradientUnits: 'userSpaceOnUse',
          id: gradientId,
          r: radius,
        });

        for (const [offset, opacity] of [
          [0, 0.08],
          [1, 0.55],
        ]) {
          gradient.appendChild(
            createSvgElement('stop', {
              offset,
              'stop-color': color,
              'stop-opacity': opacity,
              style: `stop-color:${color}`,
            }),
          );
        }

        defs.appendChild(gradient);
        setAttributes(area, { fill: `url(#${gradientId})` });
      } else {
        setAttributes(area, { fill: fill === 'none' ? 'none' : color, 'fill-opacity': 0.25 });
      }

      group.appendChild(area);

      if (showPoints) {
        axes.forEach((_, j) => {
          const missing = !Number.isFinite(datumAt(s, j)?.value);

          group.appendChild(
            createSvgElement('circle', {
              class: `prism-radar-point${missing ? ' prism-radar-point--missing' : ''}`,
              'data-axis': j,
              fill: missing ? 'none' : color,
              r: 3,
              stroke: color,
            }),
          );
        });
      }

      if (config.showValues) {
        axes.forEach((_, j) => {
          const datum = datumAt(s, j);
          const { anchor, baseline } = labelPlacement(angles[j]);
          const text = createSvgElement('text', {
            'aria-hidden': 'true',
            class: 'prism-radar-value',
            'dominant-baseline': baseline,
            'text-anchor': anchor,
          });

          text.textContent = datum && Number.isFinite(datum.value) ? formatValue(j, datum.value) : '';
          group.appendChild(text);
        });
      }
    });
  }

  function setActive(index: number): void {
    activeIndex = index;
    for (const el of root.querySelectorAll('[data-axis]')) {
      const active = Number(el.getAttribute('data-axis')) === index;

      el.classList.toggle(el.tagName === 'line' ? 'prism-radar-spoke--active' : 'prism-radar-point--active', active);
    }
  }

  function animateTo(targets: number[][]): void {
    if (activeRaf !== null) {
      cancelAnimationFrame(activeRaf);
      activeRaf = null;
    }

    const from = targets.map((row, i) => row.map((_, j) => drawn[i]?.[j] ?? 0));
    const motion = resolveMotion(config.transition, 400);
    const easing = resolveEasing(motion.easing ?? 'ease-out');
    const unchanged = from.every((row, i) => row.every((v, j) => v === targets[i][j]));

    if (motion.duration === 0 || unchanged) {
      drawn = targets;
      draw(targets);

      return;
    }

    let start: number | null = null;

    const frame = (ts: number): void => {
      if (start === null) start = ts;

      const elapsed = ts - start;
      let done = true;

      drawn = targets.map((row, i) => {
        const raw = Math.max(0, Math.min(1, (elapsed - i * motion.stagger) / motion.duration));

        if (raw < 1) done = false;

        return row.map((to, j) => tweenNumber(from[i][j], to, easing(raw)));
      });
      draw(drawn);
      activeRaf = done ? null : requestAnimationFrame(frame);
    };

    activeRaf = requestAnimationFrame(frame);
  }

  let handle: ChartHandle<RadarSeriesConfig[]> | undefined;

  try {
    handle = createRadialScaffold(
      container,
      { a11y: config.a11y, legend: config.legend, tooltip: config.tooltip },
      (ctx): ChartEventHandlers | undefined => {
        const { legend, svg, tooltip } = ctx;

        if (!svg.contains(root)) svg.appendChild(root);

        tooltip?.hide();
        legend?.update(series.map((s, i) => ({ color: s.color ?? seriesColor(i), name: s.name })));

        if (axes.length < 3) {
          for (const group of [defs, gridGroup, seriesGroup, labelGroup]) group.replaceChildren();
          drawn = [];

          return undefined;
        }

        const { height, width } = ctx.dimensions;
        const radius = fitRadius(
          width,
          height,
          axes.map((axis) => axis.label),
          angles,
          LABEL_FONT_SIZE,
          labelGap,
        );

        layout = { cx: width / 2, cy: height / 2, radius };

        const domains = resolveAxisDomains(axes, series, config.domain);

        renderGrid(domains);
        renderLabels();
        renderSeries();
        animateTo(
          series.map((s) =>
            axes.map((_, j) => {
              const value = datumAt(s, j)?.value;

              return value !== undefined && Number.isFinite(value) ? normalize(value, domains[j]) : 0;
            }),
          ),
        );
        setActive(activeIndex);

        const eventFor = (index: number, originalEvent: Event): RadarEvent => ({
          axis: axes[index],
          index,
          originalEvent,
          values: valuesAt(index),
        });

        const activate = (index: number, originalEvent: Event): void => {
          setActive(index);
          config.onHover?.(eventFor(index, originalEvent));

          const text = describe(index);

          if (!tooltip) {
            ctx.announcer.announce(text);

            return;
          }

          const reach = Math.max(0, ...drawn.map((row) => row[index] ?? 0));
          const svgRect = svg.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const values = valuesAt(index);
          const first = values.find((v) => v.datum)?.datum;
          const rows = values.flatMap(({ datum, series: s }) =>
            datum
              ? [
                  {
                    color: s.color ?? seriesColor(series.indexOf(s)),
                    name: s.name,
                    value: formatValue(index, datum.value),
                  },
                ]
              : [],
          );

          tooltip.show(
            polarX(layout.cx, layout.radius * reach, angles[index]) + (svgRect.left - containerRect.left),
            polarY(layout.cy, layout.radius * reach, angles[index]) + (svgRect.top - containerRect.top),
            { key: axes[index].key, meta: { axis: axes[index], text, values }, value: first?.value ?? 0 },
            { color: series[0]?.color ?? seriesColor(0), data: [], name: axes[index].label },
            comparisonContent(svg.ownerDocument, axes[index].label, rows, text),
          );
        };

        const deactivate = (): void => {
          setActive(-1);
          config.onHover?.(null);
          tooltip?.hide();
          ctx.announcer.clear();
        };

        const hitIndex = (event: MouseEvent): number => {
          const rect = svg.getBoundingClientRect();
          const dx = event.clientX - rect.left - layout.cx;
          const dy = event.clientY - rect.top - layout.cy;

          if (Math.hypot(dx, dy) > layout.radius + labelGap + LABEL_FONT_SIZE * 2) return -1;

          return nearestAxis(dx, dy, axes.length, startAngle);
        };

        return {
          onClick(event) {
            const index = hitIndex(event);

            if (index >= 0) config.onClick?.(eventFor(index, event));
          },
          onKeyDown(event) {
            const step = ARROW_STEPS[event.key];

            if (step !== undefined) {
              event.preventDefault();
              activate(activeIndex < 0 ? 0 : (activeIndex + step + axes.length) % axes.length, event);
            } else if ((event.key === 'Enter' || event.key === ' ') && activeIndex >= 0 && config.onClick) {
              event.preventDefault();
              config.onClick(eventFor(activeIndex, event));
            } else if (event.key === 'Escape') {
              deactivate();
            }
          },
          onMouseLeave: deactivate,
          onMouseMove(event) {
            const index = hitIndex(event);

            if (index < 0) {
              if (activeIndex >= 0) deactivate();
            } else if (index !== activeIndex) {
              activate(index, event);
            }
          },
        };
      },
      (next) => {
        series = next;
        warnOnInvalid(axes, series);
      },
    );

    return {
      get disposalSignal(): AbortSignal {
        return handle!.disposalSignal;
      },

      dispose() {
        if (activeRaf !== null) {
          cancelAnimationFrame(activeRaf);
          activeRaf = null;
        }

        handle!.dispose();
      },

      get disposed(): boolean {
        return handle!.disposed;
      },

      el: handle!.el,

      update(next) {
        handle!.update(next);
      },

      [Symbol.dispose]() {
        this.dispose();
      },
    };
  } catch (error) {
    handle?.dispose();
    throw error;
  }
}
