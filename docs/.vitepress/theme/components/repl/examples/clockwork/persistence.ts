export const persistenceExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Persist committed snapshots at application boundary.
let saved = null

const machine = createMachine({
  context: { total: 0 },
  initial: 'shopping',
  states: {
    shopping: {
      on: {
        ADD: {
          reduce: ({ context, event }) => ({ total: context.total + event.price }),
          target: 'shopping',
        },
        CHECKOUT: { guard: ({ context }) => context.total > 0, target: 'checkout' },
      },
    },
    checkout: {},
  },
})

const cart = machine.createActor()
cart.subscribe((snapshot) => { saved = snapshot })
cart.send({ type: 'ADD', price: 29 })
console.log('Saved:', saved)

const restored = machine.createActor({ snapshot: saved })
console.log('Restored:', restored.snapshot.value)`,
  name: 'Explicit Persistence',
};
