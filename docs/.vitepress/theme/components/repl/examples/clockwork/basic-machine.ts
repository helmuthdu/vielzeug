export const basicMachineExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Compile one machine, then create an independent actor.
const machine = createMachine({
  context: { cycles: 0 },
  initial: 'red',
  states: {
    red: { on: { NEXT: { target: 'green' } } },
    green: { on: { NEXT: { target: 'yellow' } } },
    yellow: {
      on: {
        NEXT: {
          reduce: ({ context }) => ({ cycles: context.cycles + 1 }),
          target: 'red',
        },
      },
    },
  },
})

const actor = machine.createActor()
console.log('Initial:', actor.snapshot.value)
actor.send({ type: 'NEXT' })
actor.send({ type: 'NEXT' })
actor.send({ type: 'NEXT' })
console.log('After cycle:', actor.snapshot.value)
console.log('Can continue?', actor.can({ type: 'NEXT' }))`,
  name: 'Basic State Machine',
};
