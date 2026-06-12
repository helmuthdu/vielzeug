// @ts-expect-error — @vielzeug/familiar resolved at runtime via workspace
import { createWorker } from '@vielzeug/familiar';

export interface ComputePointsInput {
  data: { x: number; y: number }[];
  domainX: [number, number];
  domainY: [number, number];
  rangeX: [number, number];
  rangeY: [number, number];
}

export interface ComputePointsOutput {
  points: { x: number; y: number }[];
}

export const computePointsWorker = (
  createWorker as (
    fn: (input: ComputePointsInput) => ComputePointsOutput,
    opts?: { concurrency: string },
  ) => { dispose: () => void; run: (input: ComputePointsInput) => Promise<ComputePointsOutput> }
)(
  (input: ComputePointsInput): ComputePointsOutput => {
    const [dx0, dx1] = input.domainX;
    const [dy0, dy1] = input.domainY;
    const [rx0, rx1] = input.rangeX;
    const [ry0, ry1] = input.rangeY;

    const points = input.data.map((pt: { x: number; y: number }) => {
      const px = dx1 === dx0 ? rx0 : rx0 + ((pt.x - dx0) / (dx1 - dx0)) * (rx1 - rx0);
      const py = dy1 === dy0 ? ry0 : ry0 + ((pt.y - dy0) / (dy1 - dy0)) * (ry1 - ry0);

      return { x: px, y: py };
    });

    return { points };
  },
  { concurrency: 'auto' },
);
