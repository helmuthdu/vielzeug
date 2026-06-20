export const derivedSignalsExample = {
  code: `import { signal, computed } from '@vielzeug/ripple'

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

// computed() — project a reactive source into a new computed
const count = signal(3)
const doubled = computed(() => count.value * 2)
console.log('doubled:', doubled.value) // 6
count.value = 5
console.log('doubled:', doubled.value) // 10
doubled.dispose()

// chaining computed signals
const items = signal([1, 2, 3, 4, 5])
const sum = computed(() => items.value.reduce((a, b) => a + b, 0))
const label = computed(() => 'Total: ' + sum.value)
console.log(label.value) // 'Total: 15'
items.value = [10, 20]
console.log(label.value) // 'Total: 30'
label.dispose()
sum.dispose()`,
  name: 'Derived Signals',
};
