import type { Scale } from '../../types';

export interface BarScaleContext {
  bandCenter: (cat: string) => number;
  bandwidth: number;
  baselinePx: number;
  horizontal: boolean;
  stacked: boolean;
  stackedTops: number[][];
  valueScale: Scale<number>;
}
