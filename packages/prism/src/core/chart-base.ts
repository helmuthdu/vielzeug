import type { Signal } from '@vielzeug/ripple';

import { signal } from '@vielzeug/ripple';

import type { ChartDimensions, ChartMargin } from '../types';

import { createSvgElement, setAttributes } from '../svg/element';
import { resolveMargin } from './layout';
import { observeResize } from './responsive';

export interface ChartBase {
  chartArea: SVGGElement;
  dimensions: Signal<ChartDimensions>;
  svg: SVGSVGElement;
  dispose(): void;
}

export function createChartBase(
  container: HTMLElement,
  options: { ariaLabel?: string; margin?: Partial<ChartMargin> },
): ChartBase {
  const margin = resolveMargin(options.margin);
  const svg = createSvgElement('svg', {
    'aria-label': options.ariaLabel,
    class: 'prism-chart',
    role: 'img',
    style: 'display:block;width:100%;height:100%',
  });

  const chartAreaGroup = createSvgElement('g', {
    class: 'prism-chart-area',
    transform: `translate(${margin.left},${margin.top})`,
  });

  svg.appendChild(chartAreaGroup);

  const rect = container.getBoundingClientRect();
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
