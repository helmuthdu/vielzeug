import type { Datum, Series } from '../types';

import { warn } from '../_dev';

export type CartesianKey = string;

export interface CartesianSeries<S extends Series = Series> {
  readonly byKey: ReadonlyMap<CartesianKey, Datum>;
  readonly config: S;
}

export interface CartesianModel<S extends Series = Series> {
  readonly domain: CartesianKey[];
  readonly labels: ReadonlyMap<CartesianKey, Datum['key']>;
  readonly series: readonly CartesianSeries<S>[];
}

export function keyId(key: Datum['key']): CartesianKey {
  if (key instanceof Date) return `date:${key.getTime()}`;

  return `${typeof key}:${String(key)}`;
}

export function normalizeCartesianSeries<S extends Series>(
  series: readonly S[],
  data: readonly (readonly Datum[])[],
): CartesianModel<S> {
  const domain: CartesianKey[] = [];
  const labels = new Map<CartesianKey, Datum['key']>();
  const normalized = series.map((config, seriesIndex) => {
    const byKey = new Map<CartesianKey, Datum>();

    for (const datum of data[seriesIndex] ?? []) {
      const id = keyId(datum.key);

      if (byKey.has(id)) {
        warn(`Duplicate datum key "${String(datum.key)}" in series "${config.name}"; keeping the first value.`);
        continue;
      }

      byKey.set(id, datum);

      if (!labels.has(id)) {
        labels.set(id, datum.key);
        domain.push(id);
      }
    }

    return { byKey, config } satisfies CartesianSeries<S>;
  });

  return { domain, labels, series: normalized };
}
