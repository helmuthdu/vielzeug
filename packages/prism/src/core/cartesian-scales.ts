import type { Scale } from '../types';

import { linearScale } from '../scales/linear';
import { timeScale } from '../scales/time';

export function buildXScale(allX: (Date | number)[], width: number): Scale<Date> | Scale<number> {
  if (allX[0] instanceof Date) {
    const dates = allX as Date[];
    const min = new Date(Math.min(...dates.map(Number)));
    const max = new Date(Math.max(...dates.map(Number)));

    return timeScale({ domain: [min, max], range: [0, width] });
  }

  const nums = allX as number[];

  return linearScale({ domain: [Math.min(...nums), Math.max(...nums)], range: [0, width] });
}

export function buildYScale(allY: number[], height: number): Scale<number> {
  return linearScale({ domain: [Math.min(0, ...allY), Math.max(...allY)], range: [height, 0] });
}
