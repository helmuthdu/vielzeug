export const rollbackErrorExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

// onRollbackError surfaces undo failures without silently swallowing them
const errors = []

const ledger = createLedger({
  onRollbackError: (err, meta) => {
    errors.push({ label: meta.label, message: err.message })
  },
})

await ledger.do({
  execute:  async () => { console.log('executed') },
  rollback: async () => { throw new Error('server unreachable') },
  label: 'Save to server',
})

await ledger.undo()
// rollback threw — stack position is unchanged, onRollbackError was called

console.log('rollback errors:', errors)
// [{ label: 'Save to server', message: 'server unreachable' }]

// The entry stays on the undo stack so the operation can be retried
console.log('canUndo (still true):', ledger.canUndo.value)

ledger.dispose()`,
  name: 'onRollbackError Hook',
};
