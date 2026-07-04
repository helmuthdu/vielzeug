import type { BandScale, BandScaleConfig } from './types';

import { warn } from '../_dev';

export function bandScale(config: BandScaleConfig): BandScale {
  // Every method below closes over `config`/these helpers directly instead of reading
  // `this` — the returned object stays fully functional when destructured, e.g.
  // `const { map } = bandScale(cfg)`.
  const getDomain = (): string[] => config.domain;
  const getRange = (): [number, number] => config.range;

  const getBandwidth = (): number => {
    const n = getDomain().length;

    if (n === 0) return 0;

    const [r0, r1] = getRange();
    const padding = config.padding ?? 0.1;
    const totalWidth = r1 - r0;

    return totalWidth / (n + (n - 1) * padding + (config.paddingOuter ?? padding) * 2);
  };

  return {
    bandwidth: getBandwidth,

    get domain(): string[] {
      return getDomain();
    },

    gap(): number {
      const padding = config.padding ?? 0.1;

      return getBandwidth() * padding;
    },

    map(value: string): number {
      const domain = getDomain();
      const idx = domain.indexOf(value);

      if (idx === -1) {
        warn(`bandScale.map: unknown category "${value}"`);

        return 0;
      }

      const [r0] = getRange();
      const bw = getBandwidth();
      const padding = config.padding ?? 0.1;
      const outer = config.paddingOuter ?? padding;

      return r0 + outer * bw + idx * (bw + bw * padding);
    },

    get range(): [number, number] {
      return getRange();
    },

    ticks(count?: number): string[] {
      const domain = getDomain();

      if (count === undefined || count >= domain.length) return [...domain];

      if (count <= 0) return [];

      const step = Math.ceil(domain.length / count);

      return domain.filter((_, i) => i % step === 0);
    },
  };
}
