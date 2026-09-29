export const reactiveSignalsExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

const ledger = createLedger({ maxHistory: 5 })
const snapshots = []
const stop = ledger.state.subscribe(() => {
  snapshots.push(ledger.state.getSnapshot())
})
let value = 0

for (const label of ['Increase', 'Increase again']) {
  const previous = value
  await ledger.do({
    apply: () => { value += 1 },
    label,
    revert: () => { value = previous },
  })
}

console.log('undo labels:', ledger.state.getSnapshot().undo.map(entry => entry.label))
console.log('queued/running:', ledger.state.getSnapshot().queued, ledger.state.getSnapshot().running)

await ledger.clear()
console.log('undo entries after clear:', ledger.state.getSnapshot().undo.length)
console.log('state replacements:', snapshots.length)
stop()
ledger.dispose()`,
  name: 'Structural State Subscription',
};
