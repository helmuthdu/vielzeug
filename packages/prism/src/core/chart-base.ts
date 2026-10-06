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
  options: {
    a11y?: ChartA11y;
    /**
     * The chart's own in-flow chrome inside the container (the legend). Its height is
     * subtracted from every resize-driven svg height: the container's content box contains
     * the svg plus this chrome, so assigning the full content height back to the svg would
     * grow the container by the chrome's height on every pass — unbounded growth in any
     * auto-height container. Subtracting it makes the layout converge on the fixed point
     * `container = svg + chrome` instead.
     */
    chrome?: () => HTMLElement | null;
    margin?: Partial<ChartMargin>;
  },
  onResize?: () => void,
): ChartBase {
  // Duck-typed rather than `instanceof Element`: an `instanceof` check would reject a
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
    // The svg's width/height attributes are its single source of sizing truth (set below and
    // on every resize pass, chrome excluded). CSS percentage sizing here would override the
    // attributes: `height: 100%` fills the whole container, so the in-flow legend rides past
    // the container's edge instead of inside the height the resize pass reserved for it.
    style: 'display:block;max-width:100%',
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
    const chromeHeight = options.chrome?.()?.offsetHeight ?? 0;
    const svgHeight = Math.max(0, height - chromeHeight);

    dimensions.height = svgHeight;
    dimensions.width = width;
    setAttributes(svg, { height: svgHeight, viewBox: `0 0 ${width} ${svgHeight}`, width });
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
