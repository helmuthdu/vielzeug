export const contractSchemasExample = {
  code: `import { s } from '@vielzeug/spell'
import { defineArchiveCollection } from '@vielzeug/archive'

const notes = defineArchiveCollection({
  contentVersion: 1,
  index: (p) => ({ filter: null, tags: [], title: p.text }),
  name: 'notes',
  payloadSchema: s.object({ text: s.string().min(1).max(200) }),
})

// contract exposes the exact schemas client and Worker share.
const publish = notes.contract.publishInput.safeParse({
  clientKey: '5f0d4d1a-2f1e-4b6c-9a3d-7e8c1b2a3f4d',
  payload: { text: 'hello archive' },
})
console.log('publish input valid:', publish.success)

// The publish envelope is strict: a malformed retry key is rejected.
const bad = notes.contract.publishInput.safeParse({ clientKey: 'nope', payload: { text: 'hi' } })
console.log('bad clientKey rejected:', !bad.success)

// The emitted-entry schema pins the wire and content versions.
const entry = notes.contract.entry.safeParse({
  author: { id: 'a1', name: 'Ada' },
  contentHash: '0'.repeat(64),
  contentVersion: 1,
  id: '5f0d4d1a-2f1e-4b6c-9a3d-7e8c1b2a3f4d',
  likeCount: 0,
  payload: { text: 'hello archive' },
  publishedAt: '2026-01-01T00:00:00.000Z',
  revision: 1,
  schemaVersion: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
})
console.log('entry schema accepts a well-formed entry:', entry.success)`,
  name: 'Shared Contract Schemas',
};
