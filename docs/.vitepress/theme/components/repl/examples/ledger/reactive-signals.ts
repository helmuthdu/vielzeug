export const reactiveSignalsExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

// historySnapshot exposes command labels — useful for undo history UI panels
const ledger = createLedger({ maxHistory: 5 })

const ops = [
  { label: 'Rename node', execute: () => {}, rollback: () => {} },
  { label: 'Move node',   execute: () => {}, rollback: () => {} },
  { label: 'Resize node', execute: () => {}, rollback: () => {} },
]

for (const op of ops) {
  await ledger.do(op)
}

// historySnapshot is newest-first
console.log('labels:', ledger.historySnapshot.value.map(e => e.label))
// ['Resize node', 'Move node', 'Rename node']

console.log('historySize:', ledger.historySize.value)   // 3
console.log('canUndo:', ledger.canUndo.value)            // true
console.log('canRedo:', ledger.canRedo.value)            // false

await ledger.undo()
console.log('canRedo after undo:', ledger.canRedo.value) // true
console.log('labels after undo:', ledger.historySnapshot.value.map(e => e.label))
// ['Move node', 'Rename node']

ledger.clear()
console.log('historySize after clear:', ledger.historySize.value) // 0

ledger.dispose()`,
  name: 'Reactive Signals & historySnapshot',
};
