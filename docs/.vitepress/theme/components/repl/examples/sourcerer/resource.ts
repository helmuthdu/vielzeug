export const resourceExample = {
  code: `import { createResource } from '@vielzeug/sourcerer'

let revision = 0

const profile = createResource({
  load: async ({ signal }) => {
    revision += 1
    return { name: 'Ada Lovelace', revision }
  },
})

profile.subscribe((state) => console.log('Notify:', state.data, 'loading:', state.loading))

await profile.reload()
console.log('Data:', profile.state.data, 'error:', profile.state.error)

profile.dispose()
console.log('✓ Disposed')`,
  name: 'createResource - One reactive value',
};
