export const commandDataExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

const ledger = createLedger()
const documentState = { title: 'Untitled' }
const previous = documentState.title

await ledger.do({
  apply: () => { documentState.title = 'Hello World' },
  label: 'Set title',
  meta: { after: 'Hello World', before: previous, field: 'title' },
  revert: () => { documentState.title = previous },
})

console.log('state:', documentState)
console.log('history meta:', ledger.state.value.undo.at(-1)?.meta)
console.log('queued:', ledger.state.value.queued)
console.log('running:', ledger.state.value.running)

await ledger.undo()
console.log('after undo:', documentState)
ledger.dispose()`,
  name: 'History Metadata & State',
};
