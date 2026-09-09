/** Deduplicates elements while preserving first-seen order. Shared by `animateEach()` and `captureLayout()`. */
export function uniqueElements<ElementType extends Element>(elements: Iterable<ElementType>): ElementType[] {
  return [...new Set(elements)];
}
