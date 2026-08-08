export const reactiveSignalsExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

const ledger = createLedger({ maxHistory: 5 })
let value = 0

for (const label of ['Increase', 'Increase again']) {
  const previous = value
  await ledger.do({
    apply: () => { value += 1 },
    label,
    revert: () => { value = previous },
  })
}

console.log('undo labels:', ledger.state.value.undo.map(entry => entry.label))
console.log('queued/running:', ledger.state.value.queued, ledger.state.value.running)

await ledger.clear()
console.log('undo entries after clear:', ledger.state.value.undo.length)
ledger.dispose()`,
  name: 'Reactive State',
};
