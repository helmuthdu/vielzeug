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
  syncChrome(): void;
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

  const initialWidth = rect.width || 600;
  const initialHeight = rect.height || 300;

  const dimensions: ChartDimensions = {
    height: initialHeight,
    margin,
    width: initialWidth,
  };

  // The dimensions the svg currently carries. A resize pass only re-renders when the
  // effective drawing size moves away from these.
  let appliedWidth = initialWidth;
  let appliedHeight = initialHeight;
  let containerHeight = initialHeight;

  // Legend updates reserve their space synchronously, before a renderer builds scales.
  const syncChrome = (): void => {
    const height = Math.max(0, containerHeight - (options.chrome?.()?.offsetHeight ?? 0));

    appliedHeight = height;
    dimensions.height = height;
    setAttributes(svg, { height, viewBox: `0 0 ${dimensions.width} ${height}` });
  };

  const stopObserving = observeResize(container, (width, height) => {
    containerHeight = height;
    const chromeHeight = options.chrome?.()?.offsetHeight ?? 0;
    const svgHeight = Math.max(0, height - chromeHeight);

    // A ResizeObserver fires once for the initial observation, at the size the chart was
    // already built at. Re-rendering there is a no-op for layout but cancels a mount
    // entrance still in flight (the renderers treat the redraw as an already-drawn
    // update and snap to final), so a chart would never animate on first paint. Skip the
    // pass unless the effective size — legend chrome included — has genuinely changed.
    if (width === appliedWidth && svgHeight === appliedHeight) return;

    appliedWidth = width;
    appliedHeight = svgHeight;
    dimensions.height = svgHeight;
    dimensions.width = width;
    setAttributes(svg, { height: svgHeight, viewBox: `0 0 ${width} ${svgHeight}`, width });
    onResize?.();
  });

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
    syncChrome,
  };
}
