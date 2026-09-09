export const lifecycleExample = {
  code: `import { createPageSource } from '@vielzeug/sourcerer'

const source = createPageSource({
  load: async () => ({ items: ['item'], totalItems: 1 }),
})

console.log(source.disposed)
source.disposalSignal.addEventListener('abort', () => console.log('disposed'))
await source.reload()
console.log(source.state.items)
source.dispose()
console.log(source.disposalSignal.aborted)`,
  name: 'Source Lifecycle',
};
