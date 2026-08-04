export const asyncInvokesExample = {
  code: `import { createMachine } from '@vielzeug/clockwork'

// Invokes get an AbortSignal and send regular events when settled.
const machine = createMachine({
  context: { error: '', user: null },
  initial: 'idle',
  states: {
    idle: { on: { FETCH: { target: 'loading' } } },
    loading: {
      invoke: [{
        src: async ({ signal }) => {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 250)
            signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')) })
          })
          return { name: 'Alice' }
        },
        onDone: ({ result }) => ({ type: 'DONE', user: result }),
        onError: ({ error }) => ({ type: 'FAILED', message: String(error) }),
      }],
      on: {
        DONE: { reduce: ({ event }) => ({ error: '', user: event.user }), target: 'ready' },
        FAILED: { reduce: ({ event }) => ({ error: event.message, user: null }), target: 'error' },
      },
    },
    ready: {},
    error: {},
  },
})

const actor = machine.createActor()
actor.send({ type: 'FETCH' })
console.log('Loading:', actor.snapshot.value)
setTimeout(() => console.log('Resolved:', actor.snapshot.value), 400)`,
  name: 'Async Invokes',
};
