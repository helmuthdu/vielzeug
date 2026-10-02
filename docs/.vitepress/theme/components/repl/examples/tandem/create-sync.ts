export const createSyncExample = {
  code: `import { createSync } from '@vielzeug/tandem'

// Two in-memory doubles stand in for the device store and the server.
let docs = [{ id: 'a', rev: 0, title: 'First doc' }]
let tombstones = []
let storedState = null
const server = []

const gateway = {
  records: () => docs.map((record) => ({ entity: 'docs', record })),
  pendingDeletions: async () => [...tombstones],
  async applyRecords(pulled) {
    // The engine already filtered these to records the server is ahead on.
    for (const { record } of pulled) {
      docs = [...docs.filter((d) => d.id !== record.id), record]
    }
    return []
  },
  async applyDeletions(deletions) {
    for (const { id } of deletions) docs = docs.filter((d) => d.id !== id)
  },
  async clearDeletions(deletions) {
    tombstones = tombstones.filter((t) => !deletions.some((d) => d.id === t.id))
  },
  loadState: async () => storedState,
  saveState: async (state) => { storedState = structuredClone(state) },
}

const port = {
  pull: async () => ({ cursor: null, deletions: [], records: [] }),
  push: async (records, deletions) => {
    server.push({ records: [...records], deletions: [...deletions] })
  },
}

const sync = createSync({ gateway, idleDelayMs: 20, port })
sync.tap((event) => console.log('event:', event.type))

await new Promise((r) => setTimeout(r, 50)) // boot: load baseline, pull, push the seed
console.log('after boot:', server.length) // 1

// A burst of edits becomes ONE push: bump the rev, then announce the change.
for (let i = 1; i <= 3; i++) {
  docs = docs.map((d) => (d.id === 'a' ? { ...d, rev: d.rev + 1, title: \`v\${i}\` } : d))
  sync.changed()
}

await new Promise((r) => setTimeout(r, 120))
console.log('pushes:', server.length) // 2 — one flush for three edits
console.log('pushed rev:', server.at(-1).records[0].record.rev) // 3 — one upload carries all of them
sync.dispose()`,
  name: 'createSync - Batched Pushes',
};
