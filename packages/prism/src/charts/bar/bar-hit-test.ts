import type { DataPoint } from '../../types';
import type { BarScaleContext } from './bar-scale-context';

export function findCatIdx(pos: number, categories: string[], sc: BarScaleContext): number {
  for (let i = 0; i < categories.length; i++) {
    const center = sc.bandCenter(categories[i]);
    const start = center - sc.bandwidth / 2;

    if (pos >= start && pos < start + sc.bandwidth) return i;
  }

  return -1;
}

export function findSeriesIdx(
  pos: { x: number; y: number },
  catIdx: number,
  categories: string[],
  sc: BarScaleContext,
  seriesCount: number,
): number {
  if (sc.stacked) {
    if (sc.horizontal) {
      for (let si = 0; si < seriesCount; si++) {
        const rightX = sc.valueScale.map(sc.stackedTops[si]?.[catIdx] ?? 0);

        if (rightX >= pos.x) return si;
      }

      return seriesCount - 1;
    } else {
      for (let si = 0; si < seriesCount; si++) {
        const topY = sc.valueScale.map(sc.stackedTops[si]?.[catIdx] ?? 0);

        if (topY <= pos.y) return si;
      }

      return seriesCount - 1;
    }
  } else {
    const subSize = sc.bandwidth / seriesCount;
    const bandStart = sc.bandCenter(categories[catIdx]) - sc.bandwidth / 2;
    const offset = sc.horizontal ? pos.y - bandStart : pos.x - bandStart;
    const subIdx = Math.floor(offset / subSize);

    return Math.max(0, Math.min(seriesCount - 1, subIdx));
  }
}

export function isOutsideBars(
  pos: { x: number; y: number },
  catIdx: number,
  allData: DataPoint[][],
  sc: BarScaleContext,
  seriesCount: number,
): boolean {
  const lastSi = seriesCount - 1;
  const maxVal = sc.stacked
    ? (sc.stackedTops[lastSi]?.[catIdx] ?? 0)
    : Math.max(...Array.from({ length: seriesCount }, (_, si) => allData[si]?.[catIdx]?.y ?? 0));
  const maxPx = sc.valueScale.map(maxVal);

  return sc.horizontal ? pos.x > maxPx : pos.y < maxPx;
}
