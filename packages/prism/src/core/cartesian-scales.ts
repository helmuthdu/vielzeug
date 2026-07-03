import type { Scale } from '../types';

import { warn } from '../_dev';
import { linearScale } from '../scales/linear';
import { timeScale } from '../scales/time';

export function buildXScale(allX: (Date | number)[], width: number): Scale<Date> | Scale<number> {
  if (allX.length === 0) return linearScale({ domain: [0, 1], range: [0, width] });

  if (allX.some((v) => v == null)) {
    warn(
      'buildXScale: one or more x values are null or undefined — data must use the Datum shape { key, value }. Did you pass { x, y } instead?',
    );

    return linearScale({ domain: [0, 1], range: [0, width] });
  }

  if (allX[0] instanceof Date) {
    const dates = allX as Date[];
    const minMs = Math.min(...dates.map(Number));
    const maxMs = Math.max(...dates.map(Number));
    const min = new Date(minMs);
    const max = new Date(minMs === maxMs ? maxMs + 1 : maxMs);

    return timeScale({ domain: [min, max], range: [0, width] });
  }

  const nums = allX as number[];
  const minN = Math.min(...nums);
  const maxN = Math.max(...nums);

  return linearScale({ domain: [minN, minN === maxN ? maxN + 1 : maxN], nice: false, range: [0, width] });
}

export function buildYScale(allY: number[], height: number, includeZero = true): Scale<number> {
  if (allY.length === 0) return linearScale({ domain: [0, 1], range: [height, 0] });

  if (allY.some((v) => v == null)) {
    warn(
      'buildYScale: one or more y values are null or undefined — data must use the Datum shape { key, value }. Did you pass { x, y } instead?',
    );

    return linearScale({ domain: [0, 1], range: [height, 0] });
  }

  const rawMin = Math.min(...allY);
  const minY = includeZero ? Math.min(0, rawMin) : rawMin;
  const maxY = Math.max(...allY);

  return linearScale({ domain: [minY, minY === maxY ? maxY + 1 : maxY], range: [height, 0] });
}
