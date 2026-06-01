export const watchAndSubscribeExample = {
  code: `import { signal, store, watch } from '@vielzeug/ripple'

const counter = signal(0)

// watch: fires when the signal changes (not immediately)
const sub = watch(counter, (next, prev) => {
  console.log('Count:', prev, '→', next)
})

counter.value = 1
counter.value = 2
counter.value = 3

sub.dispose()
counter.value = 4 // No log — disposed

// Store: watch a lens for a single field
const cart = store({ items: 0, total: 0 })
const itemsLens = cart.lens('items')

const itemsSub = watch(itemsLens, (n) => console.log('Items changed:', n))

cart.patch({ items: 2, total: 29.98 }) // fires (items changed)
cart.patch({ total: 59.99 })           // does NOT fire (items unchanged)
cart.patch({ items: 3 })               // fires

itemsSub.dispose()

// .map() combinator: watch a derived slice with less boilerplate
const totalLabel = cart.map((s) => \`Total: $\${s.total.toFixed(2)}\`)
const labelSub = watch(totalLabel, (label) => console.log(label))

cart.patch({ total: 89.99 }) // → 'Total: $89.99'

labelSub.dispose()
totalLabel.dispose()`,
  name: 'Watch, Lens & Map',
};
