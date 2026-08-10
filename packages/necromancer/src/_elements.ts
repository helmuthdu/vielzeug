/** Deduplicates elements while preserving first-seen order. Shared by `animateEach()` and `captureLayout()`. */
export function uniqueElements(elements: Iterable<Element>): Element[] {
  return [...new Set(elements)];
}
