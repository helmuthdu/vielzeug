export const basicMachineExample = {
  code: `import { machine } from '@vielzeug/clockwork'

const m = machine({
  initial: 'red',
  context: { cycles: 0 },
  states: {
    red:    { on: { NEXT: { target: 'green' } } },
    green:  { on: { NEXT: { target: 'yellow' } } },
    yellow: {
      on: {
        NEXT: {
          target: 'red',
          actions: [({ context }) => { context.cycles += 1 }],
        },
      },
    },
  },
})

console.log('State:', m.state.value)                        // 'red'
console.log(m.send({ type: 'NEXT' }).status)                // 'transitioned'
console.log('State:', m.state.value)                        // 'green'
m.send({ type: 'NEXT' })
console.log('State:', m.state.value)           // 'yellow'
m.send({ type: 'NEXT' })
console.log('State:', m.state.value)           // 'red'
console.log('Cycles completed:', m.context.value.cycles) // 1

// can() checks whether an event would be accepted in the current state
console.log('Can go NEXT?', m.can({ type: 'NEXT' })) // true`,
  name: 'Basic State Machine',
};
