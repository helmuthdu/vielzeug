export const rollbackErrorExample = {
  code: `import { LedgerRollbackError, createLedger } from '@vielzeug/ledger'

const ledger = createLedger()

await ledger.do({
  apply: () => console.log('applied'),
  label: 'Save to server',
  revert: () => { throw new Error('server unreachable') },
})

try {
  await ledger.undo()
} catch (error) {
  if (error instanceof LedgerRollbackError) {
    console.log('revert failed:', error.message)
  }
}

console.log('undo entries:', ledger.state.value.undo.length)
ledger.dispose()`,
  name: 'Rollback Error',
};
