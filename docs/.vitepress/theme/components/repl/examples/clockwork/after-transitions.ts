export const afterTransitionsExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Delayed (timer-based) transitions using 'after'
const m = createMachine({
  initial: 'idle',
  context: { shown: 0, dismissed: 0 },
  states: {
    idle: {
      on: {
        SHOW: { target: 'visible' },
      },
    },
    visible: {
      entry: ({ context }) => { context.shown += 1 },
      // Auto-dismiss after 2 seconds unless manually dismissed first
      after: [{
        delay: 2000,
        target: 'idle',
        actions: [({ context }) => { context.dismissed += 1 }],
      }],
      on: {
        DISMISS: {
          target: 'idle',
          actions: [({ context }) => { context.dismissed += 1 }],
        },
      },
    },
  },
}).start()

console.log('State:', m.state.value)   // 'idle'
m.send({ type: 'SHOW' })
console.log('State:', m.state.value)   // 'visible'
console.log('Shown:', m.context.value.shown)      // 1

// Manual dismiss before the 2s timer fires
m.send({ type: 'DISMISS' })
console.log('State:', m.state.value)   // 'idle'
console.log('Dismissed:', m.context.value.dismissed) // 1

// Show again — this time let the auto-timer run
m.send({ type: 'SHOW' })
console.log('State:', m.state.value)   // 'visible'

// After 2000ms the machine auto-transitions back to idle
setTimeout(() => {
  console.log('State after timeout:', m.state.value)    // 'idle'
  console.log('Total dismissed:', m.context.value.dismissed) // 2
}, 2500)`,
  name: 'Delayed Transitions (after)',
};
