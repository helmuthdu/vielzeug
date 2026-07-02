export const functionMemoExample = {
  code: `import { memo } from '@vielzeug/arsenal'

// LRU cache capped at 3 entries — oldest evicted when full
let callCount = 0
const compute = memo(
  (n) => { callCount++; return n * n },
  { maxSize: 3 }
)

console.log(compute(2))  // 4  — computed
console.log(compute(3))  // 9  — computed
console.log(compute(4))  // 16 — computed
console.log(compute(2))  // 4  — cache hit
console.log('calls so far:', callCount)  // 3
console.log('cached entries:', compute.size)  // 3

// Adding a 4th entry evicts the oldest (key 2)
console.log(compute(5))  // 25 — computed, evicts 2
console.log('after 4th entry, size:', compute.size)  // 3

// Invalidate a specific entry
compute.invalidate(3)
console.log('after invalidate(3), size:', compute.size)  // 2
console.log(compute(3))  // 9 — recomputed
console.log('total calls:', callCount)  // 5`,
  name: 'memo - LRU cache with size tracking and invalidation',
};
