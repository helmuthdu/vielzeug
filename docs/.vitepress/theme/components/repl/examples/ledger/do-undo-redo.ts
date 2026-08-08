export const doUndoRedoExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

const ledger = createLedger()
let counter = 0

async function increment() {
  const previous = counter
  const next = previous + 1

  await ledger.do({
    apply: () => { counter = next },
    label: 'Increment',
    revert: () => { counter = previous },
  })
}

await increment()
await increment()
await increment()
console.log('after increments:', counter)
console.log('undo entries:', ledger.state.value.undo.length)

await ledger.undo()
console.log('after undo:', counter)

await ledger.redo()
console.log('after redo:', counter)
ledger.dispose()`,
  name: 'do / undo / redo',
};
