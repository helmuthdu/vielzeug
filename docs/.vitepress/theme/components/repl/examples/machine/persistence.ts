export const persistenceExample = {
  code: `import { defineMachine, interpret, assign } from '/machine'

// In-memory persistence adapter (swap load/save/clear for localStorage in production)
let storedSnapshot = null
const adapter = {
  load:  () => storedSnapshot ?? undefined,
  save:  (snap) => { storedSnapshot = snap },
  clear: () => { storedSnapshot = null },
}

const cartMachine = defineMachine({
  initial: 'shopping',
  context: { items: [], total: 0 },
  states: {
    shopping: {
      on: {
        ADD_ITEM: [{
          target: 'shopping',
          actions: [assign(({ context, event }) => {
            const items = [...context.items, { id: event.id, price: event.price }]
            return { items, total: items.reduce((s, i) => s + i.price, 0) }
          })],
        }],
        REMOVE_ITEM: [{
          target: 'shopping',
          actions: [assign(({ context, event }) => {
            const items = context.items.filter(i => i.id !== event.id)
            return { items, total: items.reduce((s, i) => s + i.price, 0) }
          })],
        }],
        CHECKOUT: [{ guard: ({ context }) => context.items.length > 0, target: 'checkout' }],
      },
    },
    checkout: {
      on: { CANCEL: [{ target: 'shopping' }] },
    },
  },
})

const cart = interpret(cartMachine, { persistence: adapter })

cart.send({ type: 'ADD_ITEM', id: 'shirt', price: 29 })
cart.send({ type: 'ADD_ITEM', id: 'hat',   price: 15 })

console.log('Items:', cart.context.value.items.length) // 2
console.log('Total:', cart.context.value.total)         // 44

// Snapshot was auto-saved by the persistence adapter on each transition
console.log('Saved snapshot state:', storedSnapshot?.state)           // 'shopping'
console.log('Saved snapshot total:', storedSnapshot?.context.total)   // 44

// Restore: create a new instance that loads the snapshot
const restored = interpret(cartMachine, { persistence: adapter })
console.log('Restored state:', restored.state.value)                   // 'shopping'
console.log('Restored total:', restored.context.value.total)           // 44`,
  name: 'Persistence & Snapshots',
};
