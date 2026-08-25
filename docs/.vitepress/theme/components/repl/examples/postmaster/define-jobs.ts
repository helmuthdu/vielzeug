export const defineJobsExample = {
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

const store = createMemoryPostmasterStore()
const postmaster = createPostmaster({ jobs, store })

await postmaster.enqueue('send', 'hello')
const result = await postmaster.flush()
console.log('flush result:', result)
await postmaster.dispose()`,
  name: 'defineJobs - Basic Outbox',
};
