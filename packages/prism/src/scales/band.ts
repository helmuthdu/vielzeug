import type { BandScale, BandScaleConfig } from './types';

import { warn } from '../_warn';

export function bandScale(config: BandScaleConfig): BandScale {
  return {
    bandwidth(): number {
      const n = this.domain.length;

      if (n === 0) return 0;

      const [r0, r1] = this.range;
      const padding = config.padding ?? 0.1;
      const totalWidth = r1 - r0;

      return totalWidth / (n + (n - 1) * padding + (config.paddingOuter ?? padding) * 2);
    },

    get domain(): string[] {
      return config.domain;
    },

    gap(): number {
      const padding = config.padding ?? 0.1;

      return this.bandwidth() * padding;
    },

    map(value: string): number {
      const domain = this.domain;
      const idx = domain.indexOf(value);

      if (idx === -1) {
        warn(`bandScale.map: unknown category "${value}"`);

        return 0;
      }

      const [r0] = this.range;
      const bw = this.bandwidth();
      const padding = config.padding ?? 0.1;
      const outer = config.paddingOuter ?? padding;

      return r0 + outer * bw + idx * (bw + bw * padding);
    },

    get range(): [number, number] {
      return config.range;
    },

    ticks(count?: number): string[] {
      const domain = this.domain;

      if (!count || count >= domain.length) return [...domain];

      const step = Math.ceil(domain.length / count);

      return domain.filter((_, i) => i % step === 0);
    },
  };
}
