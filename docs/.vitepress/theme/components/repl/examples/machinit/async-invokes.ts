export const asyncInvokesExample = {
  code: `import { defineMachine, interpret, assign } from '@vielzeug/machinit'

const fetchMachine = defineMachine({
  initial: 'idle',
  context: {
    userId: 0,
    user: null,
    error: '',
    attempts: 0,
  },
  states: {
    idle: {
      on: {
        FETCH: [{
          target: 'loading',
          actions: [assign(({ event }) => ({ userId: event.id, attempts: 1 }))],
        }],
      },
    },
    loading: {
      invoke: [{
        src: async ({ context, signal }) => {
          // Simulate a 300ms API call — abortable via AbortSignal
          await new Promise((res, rej) => {
            const t = setTimeout(res, 300)
            signal.addEventListener('abort', () => { clearTimeout(t); rej(new Error('aborted')) })
          })
          if (context.userId === 42) throw new Error('User not found')
          return { name: 'Alice', email: 'alice@example.com' }
        },
        onDone:  (result) => ({ type: 'DONE',   user: result }),
        onError: (error)  => ({ type: 'FAILED', error: String(error) }),
      }],
      on: {
        DONE:   [{ target: 'success', actions: [assign(({ event }) => ({ user: event.user,   error: '' }))] }],
        FAILED: [{ target: 'error',   actions: [assign(({ event }) => ({ user: null, error: event.error }))] }],
      },
    },
    success: {
      on: {
        FETCH: [{ target: 'loading', actions: [assign(({ event }) => ({ userId: event.id }))] }],
      },
    },
    error: {
      on: {
        RETRY: [{ target: 'loading', actions: [assign(({ context }) => ({ attempts: context.attempts + 1 }))] }],
      },
    },
  },
})

const m = interpret(fetchMachine)

console.log('Initial:', m.state.value)   // 'idle'
m.send({ type: 'FETCH', id: 1 })
console.log('After FETCH:', m.state.value) // 'loading'

// Invoke resolves after ~300ms
setTimeout(() => {
  console.log('Resolved:', m.state.value)  // 'success'
  console.log('User:', JSON.stringify(m.context.value.user))
}, 500)`,
  name: 'Async Invokes',
};
