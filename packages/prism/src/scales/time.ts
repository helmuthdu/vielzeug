import type { Scale, TimeScaleConfig } from '../types';

import { resolve } from '../core/resolve';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const TIME_INTERVALS = [
  SECOND,
  5 * SECOND,
  15 * SECOND,
  30 * SECOND,
  MINUTE,
  5 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  7 * DAY,
  MONTH,
  3 * MONTH,
  6 * MONTH,
  YEAR,
];

function chooseInterval(range: number, count: number): number {
  const target = range / count;

  for (const interval of TIME_INTERVALS) {
    if (interval >= target) return interval;
  }

  return YEAR;
}

export function timeScale(config: TimeScaleConfig): Scale<Date> {
  return {
    get domain(): [Date, Date] {
      return resolve(config.domain);
    },

    invert(pixel: number): Date {
      const [d0, d1] = this.domain;
      const [r0, r1] = this.range;

      if (r1 === r0) return d0;

      const t = (pixel - r0) / (r1 - r0);

      return new Date(d0.getTime() + t * (d1.getTime() - d0.getTime()));
    },

    map(value: Date): number {
      const [d0, d1] = this.domain;
      const [r0, r1] = this.range;
      const dRange = d1.getTime() - d0.getTime();

      if (dRange === 0) return r0;

      const t = (value.getTime() - d0.getTime()) / dRange;

      return r0 + t * (r1 - r0);
    },

    get range(): [number, number] {
      return resolve(config.range);
    },

    ticks(count = 10): Date[] {
      const [d0, d1] = this.domain;
      const range = d1.getTime() - d0.getTime();
      const interval = chooseInterval(range, count);
      const start = Math.ceil(d0.getTime() / interval) * interval;
      const ticks: Date[] = [];

      for (let t = start; t <= d1.getTime(); t += interval) {
        ticks.push(new Date(t));
      }

      return ticks;
    },
  };
}
