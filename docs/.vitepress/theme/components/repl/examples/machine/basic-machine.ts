export const basicMachineExample = {
  code: `import { defineMachine, interpret, assign } from '/machine'

const trafficMachine = defineMachine({
  initial: 'red',
  context: { cycles: 0 },
  states: {
    red:    { on: { NEXT: [{ target: 'green' }] } },
    green:  { on: { NEXT: [{ target: 'yellow' }] } },
    yellow: {
      on: {
        NEXT: [{
          target: 'red',
          actions: [assign(({ context }) => ({ cycles: context.cycles + 1 }))],
        }],
      },
    },
  },
})

const m = interpret(trafficMachine)

console.log('State:', m.state.value)           // 'red'
m.send({ type: 'NEXT' })
console.log('State:', m.state.value)           // 'green'
m.send({ type: 'NEXT' })
console.log('State:', m.state.value)           // 'yellow'
m.send({ type: 'NEXT' })
console.log('State:', m.state.value)           // 'red'
console.log('Cycles completed:', m.context.value.cycles) // 1

// can() checks whether an event would be accepted in the current state
console.log('Can go NEXT?', m.can({ type: 'NEXT' })) // true`,
  name: 'Basic State Machine',
};
