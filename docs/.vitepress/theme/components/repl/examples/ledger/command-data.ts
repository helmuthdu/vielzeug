export const commandDataExample = {
  code: `import { createLedger } from '@vielzeug/ledger'

// Store before/after snapshots with each command
const ledger = createLedger()
const doc = { title: 'Untitled', body: '' }

async function setTitle(next) {
  const prev = doc.title
  await ledger.do({
    data: { field: 'title', before: prev, after: next },
    execute:  () => { doc.title = next },
    rollback: () => { doc.title = prev },
    label: 'Set title',
  })
}

async function setBody(next) {
  const prev = doc.body
  await ledger.do({
    data: { field: 'body', before: prev, after: next },
    execute:  () => { doc.body = next },
    rollback: () => { doc.body = prev },
    label: 'Set body',
  })
}

// Queue multiple operations (pendingCount tracks them)
const p1 = setTitle('Hello World')
const p2 = setBody('Lorem ipsum')
console.log('queued ops:', ledger.pendingCount.value) // 2

await Promise.all([p1, p2])
console.log('after edits — doc:', doc)
console.log('pendingCount:', ledger.pendingCount.value) // 0

// historySnapshot exposes data for each undo step (newest first)
const [latest, earlier] = ledger.historySnapshot.value
console.log('latest data:', latest.data)   // { field: 'body', before: '', after: 'Lorem ipsum' }
console.log('earlier data:', earlier.data) // { field: 'title', before: 'Untitled', after: 'Hello World' }

await ledger.undo()
console.log('after undo body:', doc.body)  // ''

await ledger.undo()
console.log('after undo title:', doc.title) // 'Untitled'

ledger.dispose()`,
  name: 'command data & pendingCount',
};
