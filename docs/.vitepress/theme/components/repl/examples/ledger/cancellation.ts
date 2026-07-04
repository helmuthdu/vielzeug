export const cancellationExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

// execute()/rollback() receive an AbortSignal — pass your own via { signal }
// to cancel a specific in-flight command
const ledger = createLedger()
const controller = new AbortController()
const log = []

const save = ledger.do(
  {
    execute: async (signal) => {
      log.push('save started')
      // Check signal.aborted up front — an already-aborted signal never
      // fires a future 'abort' event, so a listener alone can miss it
      if (signal.aborted) throw new Error('save aborted')
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 200)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new Error('save aborted'))
        })
      })
      log.push('save finished') // never reached below
    },
    label: 'Save document',
  },
  { signal: controller.signal },
)

controller.abort()

try {
  await save
} catch (err) {
  console.log('caught:', err.message) // 'save aborted'
}
console.log('log:', log) // ['save started'] — never got to 'save finished'

// The signal is also merged with the ledger's own disposalSignal — no
// external AbortController needed to react to dispose(). Poll signal.aborted
// rather than relying on a future 'abort' event — the signal may already be
// aborted by the time this command actually starts running its queue turn
const pending = ledger.do({
  execute: async (signal) => {
    while (!signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  },
})

ledger.dispose()
await pending
console.log('ledger disposed:', ledger.disposed) // true`,
  name: 'Cancellation (AbortSignal)',
};
