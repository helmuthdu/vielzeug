import type { Scale } from '../types';
import type { LinearScaleConfig } from './types';

function niceNumber(value: number, round: boolean): number {
  const exp = Math.floor(Math.log10(value));
  const frac = value / Math.pow(10, exp);
  let nice: number;

  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }

  return nice * Math.pow(10, exp);
}

function niceRange(min: number, max: number, tickCount: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];

  if (min > max) [min, max] = [max, min];

  if (min === max) return [min - 1, max + 1];

  const range = niceNumber(max - min, false);
  const step = niceNumber(range / Math.max(1, tickCount - 1), true);

  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

export function linearScale(config: LinearScaleConfig): Scale<number> {
  // Every method below closes over `config`/these helpers directly instead of reading
  // `this` — the returned object stays fully functional when destructured, e.g.
  // `const { map } = linearScale(cfg)`.
  const getDomain = (): [number, number] =>
    config.nice === false ? config.domain : niceRange(config.domain[0], config.domain[1], 10);
  const getRange = (): [number, number] => config.range;

  return {
    get domain(): [number, number] {
      return getDomain();
    },

    invert(pixel: number): number {
      const [d0, d1] = getDomain();
      const [r0, r1] = getRange();

      if (r1 === r0) return d0;

      const t = (pixel - r0) / (r1 - r0);

      return d0 + t * (d1 - d0);
    },

    map(value: number): number {
      const [d0, d1] = getDomain();
      const [r0, r1] = getRange();

      if (d1 === d0) return r0;

      let t = (value - d0) / (d1 - d0);

      if (config.clamp) {
        t = Math.max(0, Math.min(1, t));
      }

      return r0 + t * (r1 - r0);
    },

    get range(): [number, number] {
      return getRange();
    },

    ticks(count = 10): number[] {
      if (count <= 0) return [];

      const [d0, d1] = getDomain();

      if (d0 === d1 || count === 1) return [d0];

      // Normalize ordering so a reversed domain (e.g. an explicitly inverted axis with
      // `nice: false`) doesn't feed a negative range into niceNumber()'s Math.log10.
      const lo = Math.min(d0, d1);
      const hi = Math.max(d0, d1);
      const range = niceNumber(hi - lo, false);
      const step = niceNumber(range / (count - 1), true);
      const start = Math.ceil(lo / step) * step;
      const end = Math.floor(hi / step) * step;
      const ticks: number[] = [];

      for (let v = start; v <= end + step * 0.5; v += step) {
        ticks.push(Math.round(v * 1e12) / 1e12);
      }

      return ticks;
    },
  };
}
