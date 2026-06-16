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
  if (min === max) return [min - 1, max + 1];

  const range = niceNumber(max - min, false);
  const step = niceNumber(range / (tickCount - 1), true);

  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

export function linearScale(config: LinearScaleConfig): Scale<number> {
  let _niceCached: [number, number] | null = null;
  let _niceKey = '';

  function getNiceDomain(raw: [number, number]): [number, number] {
    if (config.nice === false) return raw;

    const key = `${raw[0]},${raw[1]}`;

    if (key !== _niceKey) {
      _niceKey = key;
      _niceCached = niceRange(raw[0], raw[1], 10);
    }

    return _niceCached!;
  }

  return {
    get domain(): [number, number] {
      return getNiceDomain(config.domain);
    },

    invert(pixel: number): number {
      const [d0, d1] = this.domain;
      const [r0, r1] = this.range;

      if (r1 === r0) return d0;

      const t = (pixel - r0) / (r1 - r0);

      return d0 + t * (d1 - d0);
    },

    map(value: number): number {
      const [d0, d1] = this.domain;
      const [r0, r1] = this.range;

      if (d1 === d0) return r0;

      let t = (value - d0) / (d1 - d0);

      if (config.clamp) {
        t = Math.max(0, Math.min(1, t));
      }

      return r0 + t * (r1 - r0);
    },

    get range(): [number, number] {
      return config.range;
    },

    ticks(count = 10): number[] {
      const [d0, d1] = this.domain;

      if (d0 === d1) return [d0];

      const range = niceNumber(d1 - d0, false);
      const step = niceNumber(range / (count - 1), true);
      const start = Math.ceil(d0 / step) * step;
      const end = Math.floor(d1 / step) * step;
      const ticks: number[] = [];

      for (let v = start; v <= end + step * 0.5; v += step) {
        ticks.push(Math.round(v * 1e12) / 1e12);
      }

      return ticks;
    },
  };
}
