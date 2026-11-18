/**
 * Binary min-heap ordered by a numeric key. Ties between equal keys resolve by heap
 * structure, which is fully determined by the push sequence, so extraction is
 * deterministic for identical input.
 */
export class MinHeap {
  private readonly items: { key: number; value: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(key: number, value: number): void {
    const items = this.items;
    items.push({ key, value });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const parentItem = items[parent]!;
      const item = items[i]!;
      if (parentItem.key <= item.key) break;
      items[parent] = item;
      items[i] = parentItem;
      i = parent;
    }
  }

  pop(): number {
    const items = this.items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && items[left]!.key < items[smallest]!.key) smallest = left;
        if (right < items.length && items[right]!.key < items[smallest]!.key) smallest = right;
        if (smallest === i) break;
        const item = items[i]!;
        const swap = items[smallest]!;
        items[i] = swap;
        items[smallest] = item;
        i = smallest;
      }
    }
    return top.value;
  }
}
