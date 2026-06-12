import type { ChartMargin } from '../types';

const DEFAULT_MARGIN: ChartMargin = { bottom: 40, left: 50, right: 20, top: 20 };

export function resolveMargin(margin?: Partial<ChartMargin>): ChartMargin {
  return { ...DEFAULT_MARGIN, ...margin };
}

export function chartArea(width: number, height: number, margin: ChartMargin): { height: number; width: number } {
  return {
    height: Math.max(0, height - margin.top - margin.bottom),
    width: Math.max(0, width - margin.left - margin.right),
  };
}
