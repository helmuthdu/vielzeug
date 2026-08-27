export const delayedEnqueueExample = {
  code: `import { createPostmaster, defineJobs } from '@vielzeug/postmaster'
import { createMemoryPostmasterStore } from '@vielzeug/postmaster/testing'

const jobs = defineJobs({
  send: {
    version: 1,
    validate: (v) => String(v),
    key: (p) => \`send:\${p}\`,
    execute: async (payload, { key, attempt }) => {
      console.log(\`delivering "\${payload}" (attempt \${attempt}, key \${key})\`)
    },
  },
})

let now = 0
const store = createMemoryPostmasterStore()
const postmaster = createPostmaster({ clock: () => now, jobs, store })

// Persist now, but the job is not claimable until availableAt.
const entry = await postmaster.enqueue('send', 'hello', { availableAt: 60_000 })
console.log('enqueued with availableAt:', entry.availableAt)

// Nothing eligible yet.
let result = await postmaster.flush()
console.log('flush before eligible:', result)

// Advance the clock past availableAt.
now = 60_000
result = await postmaster.flush()
console.log('flush after eligible:', result)
await postmaster.dispose()`,
  name: 'delayedEnqueue - Delayed Eligibility',
};
