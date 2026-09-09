import { warn } from '../_dev';
import { PrismRenderError } from '../errors';
import { createSvgElement, setAttributes } from '../svg/element';
import type { ChartA11y, ChartDimensions, ChartMargin } from '../types';
import { resolveMargin } from './layout';
import { observeResize } from './responsive';

export interface ChartBase {
  chartArea: SVGGElement;
  dimensions: ChartDimensions;
  dispose(): void;
  svg: SVGSVGElement;
}

export function createChartBase(
  container: HTMLElement,
  options: { a11y?: ChartA11y; margin?: Partial<ChartMargin> },
  onResize?: () => void,
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
  const a11y = options.a11y;
  const svg = createSvgElement('svg', {
    ...(!a11y || a11y.decorative
      ? { 'aria-hidden': 'true' }
      : { 'aria-label': a11y.ariaLabel, role: 'img', tabindex: '0' }),
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

  const dimensions: ChartDimensions = {
    height: rect.height || 300,
    margin,
    width: rect.width || 600,
  };

  const stopObserving = observeResize(container, (width, height) => {
    dimensions.height = height;
    dimensions.width = width;
    setAttributes(svg, { height, viewBox: `0 0 ${width} ${height}`, width });
    onResize?.();
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
      svg.remove();
    },
    svg,
  };
}
