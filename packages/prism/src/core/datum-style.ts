import type { Datum } from '../types';

export type DatumMark = Pick<Datum, 'dash' | 'opacity'>;

/** True when any datum carries a presentation field, forcing the styled-runs path. */
export function hasStyledRuns(marks: readonly DatumMark[] | undefined): boolean {
  return marks?.some((mark) => mark && (mark.dash !== undefined || mark.opacity !== undefined)) ?? false;
}

export interface StyleRun {
  dash?: string;
  end: number;
  opacity?: number;
  /** Index of the run's first point. */
  start: number;
}

/**
 * Groups consecutive segments that share one datum style into runs. Datum `i`
 * styles the segment from point `i` to point `i+1` (Chart.js-style segment
 * semantics), so the last datum's style has no segment to paint and is ignored.
 */
export function computeStyleRuns(marks: readonly DatumMark[], pointCount: number): StyleRun[] {
  const segmentCount = Math.max(0, pointCount - 1);

  if (segmentCount === 0) return [];

  const runs: StyleRun[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const mark = marks[i] ?? {};
    const prev = runs[runs.length - 1];

    if (prev && prev.dash === mark.dash && prev.opacity === mark.opacity) {
      prev.end = i + 1;

      continue;
    }

    runs.push({ dash: mark.dash, end: i + 1, opacity: mark.opacity, start: i });
  }

  return runs;
}
