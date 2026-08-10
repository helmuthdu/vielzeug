export type ScrollAlignment = 'auto' | 'center' | 'end' | 'start';

export function alignOffset(
  itemStart: number,
  itemEnd: number,
  itemSize: number,
  currentOffset: number,
  viewportSize: number,
  align: ScrollAlignment,
): number | null {
  if (align === 'start') return itemStart;

  if (align === 'end') return itemEnd - viewportSize;

  if (align === 'center') return itemStart - (viewportSize - itemSize) / 2;

  if (itemStart >= currentOffset && itemEnd <= currentOffset + viewportSize) return null;

  return itemStart < currentOffset ? itemStart : itemEnd - viewportSize;
}
