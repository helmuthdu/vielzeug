export const composeCommandsExample = {
  code: `import { compose, createLedger } from '@vielzeug/ledger'

const ledger = createLedger()
const node = { x: 0, y: 0 }

await ledger.do(compose([
  {
    apply: () => { node.x = 100 },
    revert: () => { node.x = 0 },
  },
  {
    apply: () => { node.y = 50 },
    revert: () => { node.y = 0 },
  },
], 'Move node'))

console.log('after apply:', node)
console.log('undo entries:', ledger.state.value.undo.length)

await ledger.undo()
console.log('after revert:', node)
ledger.dispose()`,
  name: 'Compose Reversible Commands',
};
