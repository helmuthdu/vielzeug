export const composeCommandsExample = {
  code: `import { compose, createLedger } from '@vielzeug/ledger'

// compose() groups commands into one atomic undo step
const ledger = createLedger()
const node = { label: 'old', x: 0, y: 0 }
const original = { label: node.label, x: node.x, y: node.y }

await ledger.do(compose([
  {
    execute:  () => { node.x = 100 },
    rollback: () => { node.x = original.x },
  },
  {
    execute:  () => { node.y = 50 },
    rollback: () => { node.y = original.y },
  },
  {
    execute:  () => { node.label = 'moved' },
    rollback: () => { node.label = original.label },
  },
], 'Move and rename'))

console.log('after compose:', node) // { label: 'moved', x: 100, y: 50 }
console.log('historySize:', ledger.historySize.value) // 1 — one step for all three

await ledger.undo()
console.log('after undo:', node) // { label: 'old', x: 0, y: 0 }

// If a sub-command throws, already-executed ones roll back automatically
try {
  await ledger.do(compose([
    { execute: () => { node.x = 999 }, rollback: () => { node.x = 0 } },
    { execute: () => { throw new Error('server error') } },
  ]))
} catch (err) {
  console.log('compose threw:', err.message)   // 'server error'
  console.log('node.x rolled back:', node.x)  // 0 — first sub-command rolled back
}

ledger.dispose()`,
  name: 'compose() — Atomic Multi-step',
};
