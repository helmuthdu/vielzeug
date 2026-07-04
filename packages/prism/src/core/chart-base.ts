import type { Readable } from '@vielzeug/ripple';

import { signal } from '@vielzeug/ripple';

import type { ChartDimensions, ChartMargin } from '../types';

import { warn } from '../_dev';
import { PrismRenderError } from '../errors';
import { createSvgElement, setAttributes } from '../svg/element';
import { resolveMargin } from './layout';
import { observeResize } from './responsive';

export interface ChartBase {
  chartArea: SVGGElement;
  dimensions: Readable<ChartDimensions>;
  svg: SVGSVGElement;
  dispose(): void;
}

export function createChartBase(
  container: HTMLElement,
  options: { ariaHidden?: boolean; ariaLabel?: string; margin?: Partial<ChartMargin> },
): ChartBase {
  // Duck-typed rather than `instanceof Element` — an `instanceof` check would reject a
  // structurally valid Element from a different realm (e.g. an Element created via
  // `iframe.contentDocument.createElement(...)`, whose prototype chain terminates in that
  // iframe's own `Element` constructor), which is a legitimate usage pattern this package
  // doesn't otherwise restrict.
  const isElementLike =
    typeof container === 'object' &&
    container !== null &&
    container.nodeType === 1 &&
    typeof container.appendChild === 'function' &&
    typeof container.getBoundingClientRect === 'function';

  if (!isElementLike) {
    const received: unknown = container;
    const kind =
      received === null
        ? 'null'
        : typeof received === 'object'
          ? (received.constructor?.name ?? 'object')
          : typeof received;

    throw new PrismRenderError(`Invalid chart configuration: \`container\` must be a DOM Element, received ${kind}.`);
  }

  const margin = resolveMargin(options.margin);
  const svg = createSvgElement('svg', {
    ...(options.ariaHidden
      ? { 'aria-hidden': 'true' }
      : { ...(options.ariaLabel ? { 'aria-label': options.ariaLabel } : {}), role: 'img' }),
    class: 'prism-chart',
    style: 'display:block;width:100%;height:100%',
  });

  const chartAreaGroup = createSvgElement('g', {
    class: 'prism-chart-area',
    transform: `translate(${margin.left},${margin.top})`,
  });

  svg.appendChild(chartAreaGroup);

  const rect = container.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    warn(
      'Chart container has zero dimensions. Ensure the container has a defined width and height before mounting a chart.',
    );
  }

  const computedStyle = typeof getComputedStyle !== 'undefined' ? getComputedStyle(container) : null;

  if (computedStyle && computedStyle.position === 'static') {
    warn(
      'Chart container has position:static. Set position:relative (or absolute/fixed) on the container so tooltip and overlay elements are positioned correctly.',
    );
  }

  const dimensions = signal<ChartDimensions>({
    height: rect.height || 300,
    margin,
    width: rect.width || 600,
  });

  const stopObserving = observeResize(container, (width, height) => {
    dimensions.value = { height, margin, width };
    setAttributes(svg, { height, viewBox: `0 0 ${width} ${height}`, width });
  });

  const initialWidth = rect.width || 600;
  const initialHeight = rect.height || 300;

  setAttributes(svg, {
    height: initialHeight,
    viewBox: `0 0 ${initialWidth} ${initialHeight}`,
    width: initialWidth,
  });

  container.appendChild(svg);

  return {
    chartArea: chartAreaGroup,
    dimensions,
    dispose() {
      stopObserving();
      dimensions.dispose();
      svg.remove();
    },
    svg,
  };
}
