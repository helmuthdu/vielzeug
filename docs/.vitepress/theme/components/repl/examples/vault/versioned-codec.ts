export const versionedCodecExample = {
  code: `import { createMemory, createVersionedCodec, table } from '@vielzeug/vault'

// v1 stored records as { val: T }
const v1Codec = {
  encode: (value) => ({ val: value }),
  decode: (raw) => {
    if (typeof raw !== 'object' || raw === null || !('val' in raw)) return undefined
    return { value: raw.val }
  },
}

// v2 stores records as { d: T } — more compact key
const v2Codec = {
  encode: (value) => ({ d: value }),
  decode: (raw) => {
    if (typeof raw !== 'object' || raw === null || !('d' in raw)) return undefined
    return { value: raw.d }
  },
}

// createVersionedCodec wraps each codec in { __v, __d } envelope.
// New writes use version 2; old records tagged __v:1 are decoded by v1Codec.
const codec = createVersionedCodec(
  [{ version: 1, codec: v1Codec }, { version: 2, codec: v2Codec }],
  2,
)

const schema = { items: table('id') }
const db = createMemory({ schema, codec })

// Write a record — encoded with v2Codec
await db.put('items', { id: 1, label: 'Hello' })
const item = await db.get('items', 1)
console.log('read back:', item) // { id: 1, label: 'Hello' }

// Simulate a record stored by the old v1 app (inject raw storage entry)
// In practice this would already be in storage from a previous app version.
const raw = codec.encode({ id: 2, label: 'Legacy' })
// Override version to 1 to demonstrate backward-compatible decoding
const rawV1 = { ...(raw as object), __v: 1 }
const decoded = codec.decode(rawV1)
console.log('v1 decoded:', decoded?.value) // { id: 2, label: 'Legacy' }

// Unknown version → undefined (treated as missing/corrupt)
const unknown = codec.decode({ __v: 99, __d: 'something' })
console.log('unknown version:', unknown) // undefined

db.dispose()`,
  name: 'Codec — createVersionedCodec for safe upgrades',
};
