import type { Scale } from '../types';
import type { TimeScaleConfig } from './types';

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
  const target = Math.abs(range) / Math.max(1, count);

  for (const interval of TIME_INTERVALS) {
    if (interval >= target) return interval;
  }

  return YEAR;
}

function niceDomain(domain: [Date, Date], count: number): [Date, Date] {
  let [d0, d1] = domain;

  if (d0.getTime() > d1.getTime()) [d0, d1] = [d1, d0];

  const range = d1.getTime() - d0.getTime();
  const interval = chooseInterval(range, count);

  return [
    new Date(Math.floor(d0.getTime() / interval) * interval),
    new Date(Math.ceil(d1.getTime() / interval) * interval),
  ];
}

export function timeScale(config: TimeScaleConfig): Scale<Date> {
  // Every method below closes over `config`/these helpers directly instead of reading
  // `this` — the returned object stays fully functional when destructured, e.g.
  // `const { map } = timeScale(cfg)`.
  const getDomain = (): [Date, Date] => (config.nice === false ? config.domain : niceDomain(config.domain, 10));
  const getRange = (): [number, number] => config.range;

  return {
    get domain(): [Date, Date] {
      return getDomain();
    },

    invert(pixel: number): Date {
      const [d0, d1] = getDomain();
      const [r0, r1] = getRange();

      if (r1 === r0) return d0;

      const t = (pixel - r0) / (r1 - r0);

      return new Date(d0.getTime() + t * (d1.getTime() - d0.getTime()));
    },

    map(value: Date): number {
      const [d0, d1] = getDomain();
      const [r0, r1] = getRange();
      const dRange = d1.getTime() - d0.getTime();

      if (dRange === 0) return r0;

      const t = (value.getTime() - d0.getTime()) / dRange;

      return r0 + t * (r1 - r0);
    },

    get range(): [number, number] {
      return getRange();
    },

    ticks(count = 10): Date[] {
      const [d0, d1] = getDomain();
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
