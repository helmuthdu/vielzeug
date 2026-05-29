export const derivedSignalsExample = {
  code: `import { signal, computed } from '/ripple'

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

// .map() combinator — shorthand for computed(() => fn(x.value))
const count = signal(3)
const doubled = count.map((n) => n * 2)
console.log('doubled:', doubled.value) // 6
count.value = 5
console.log('doubled:', doubled.value) // 10
doubled.dispose()

// .filter() combinator — undefined when predicate is false
const even = count.filter((n) => n % 2 === 0)
console.log('even (5 is odd):', even.value) // undefined
count.value = 8
console.log('even (8):', even.value) // 8
even.dispose()`,
  name: 'Derived Signals & Combinators',
};
