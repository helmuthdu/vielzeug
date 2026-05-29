export const debugTracingExample = {
  code: `import { defineMachine, interpret, assign, resolveTransition } from '/machine'

const orderMachine = defineMachine({
  initial: 'pending',
  context: { cancelledAt: null },
  states: {
    pending:   { on: { SUBMIT: [{ target: 'confirmed' }], CANCEL: [{ target: 'cancelled', actions: [assign(() => ({ cancelledAt: Date.now() }))] }] } },
    confirmed: { on: { PAY:    [{ target: 'paid'      }], CANCEL: [{ target: 'cancelled', actions: [assign(() => ({ cancelledAt: Date.now() }))] }] } },
    paid:      { on: { SHIP:    [{ target: 'shipped'   }] } },
    shipped:   { on: { DELIVER: [{ target: 'delivered' }] } },
    delivered: {},
    cancelled: {},
  },
})

const m = interpret(orderMachine, {
  traceLimit: 50,
  debug: {
    onTransitionSkipped: ({ from, reason }) =>
      console.log('Skipped in ' + from + ': ' + reason),
  },
})

m.send({ type: 'SUBMIT'  })
m.send({ type: 'PAY'     })
m.send({ type: 'SHIP'    })
m.send({ type: 'DELIVER' })

console.log('Final state:', m.state.value) // 'delivered'

// Replay the full transition trace
const trace = m.getTrace()
console.log('Trace ('+ trace.length +' steps):')
trace.forEach(({ from, to, event }) => {
  console.log('  ' + from + ' -> ' + to + '  (on ' + event.type + ')')
})

// resolveTransition is a pure function — no side effects, useful for tests
const resolution = resolveTransition(orderMachine, {
  state:   'pending',
  context: { cancelledAt: null },
  event:   { type: 'SUBMIT' },
})
console.log('Would go to:', resolution?.transition.target) // 'confirmed'`,
  name: 'Debug Hooks & Tracing',
};
