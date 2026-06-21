export const doUndoRedoExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

// An undo/redo stack for any async or sync mutations
const ledger = createLedger()
let counter = 0

async function increment() {
  const prev = counter
  const next = prev + 1
  await ledger.do({
    execute:  () => { counter = next },
    rollback: () => { counter = prev },
    label: 'Increment',
  })
}

await increment()
await increment()
await increment()
console.log('after 3 increments:', counter)           // 3
console.log('historySize:', ledger.historySize.value)  // 3
console.log('canUndo:', ledger.canUndo.value)          // true

await ledger.undo()
console.log('after undo:', counter)                    // 2

await ledger.undo()
console.log('after undo:', counter)                    // 1

await ledger.redo()
console.log('after redo:', counter)                    // 2

// A new do() discards the redo stack
await increment()
console.log('historySize after new do:', ledger.historySize.value) // 3 (not 4)

ledger.dispose()`,
  name: 'do / undo / redo',
};
