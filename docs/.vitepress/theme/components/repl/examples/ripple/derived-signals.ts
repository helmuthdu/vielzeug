export const derivedSignalsExample = {
  code: `import { signal, computed, selector } from '@vielzeug/ripple'

const price = signal(100)
const quantity = signal(2)
const taxRate = signal(0.1)

// computed() derives from multiple signals
const subtotal = computed(() => price.value * quantity.value)
const tax = computed(() => subtotal.value * taxRate.value)
const total = computed(() => subtotal.value + tax.value)

console.log('Subtotal:', subtotal.value)
console.log('Tax:', tax.value)
console.log('Total:', total.value)

// Update a source — all downstream computeds re-compute lazily
price.value = 150
console.log('After price change:')
console.log('Subtotal:', subtotal.value)
console.log('Total:', total.value)

subtotal.dispose()
tax.dispose()
total.dispose()

// selector() — project a reactive source (replaces .map())
const count = signal(3)
const doubled = selector(count, (n) => n * 2)
console.log('doubled:', doubled.value) // 6
count.value = 5
console.log('doubled:', doubled.value) // 10
doubled.dispose()

// selector() with predicate — undefined when predicate is false (replaces .filter())
const evens = selector(count, undefined, (n) => n % 2 === 0)
console.log('evens (5 is odd):', evens.value) // undefined
count.value = 8
console.log('evens (8):', evens.value) // 8
evens.dispose()`,
  name: 'Derived Signals & Combinators',
};
