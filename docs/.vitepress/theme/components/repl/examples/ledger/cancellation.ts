export const cancellationExample = {
  code: `import { LedgerCancelledError, createLedger } from '@vielzeug/ledger'

const ledger = createLedger()
const controller = new AbortController()

const save = ledger.do(
  {
    apply: async ({ signal }) => {
      if (signal.aborted) throw new Error('save aborted')
      await new Promise((resolve) => setTimeout(resolve, 50))
    },
    revert: () => {},
  },
  { signal: controller.signal },
)

controller.abort()

try {
  await save
} catch (error) {
  console.log('cancelled:', error instanceof LedgerCancelledError)
}

console.log('undo entries:', ledger.state.value.undo.length)
ledger.dispose()`,
  name: 'Cancellation',
};
