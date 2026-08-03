export const lifecycleExample = {
  code: `import { createPageSource } from '@vielzeug/sourcerer'

const source = createPageSource({
  autoStart: false,
  load: async () => ({ data: ['item'], total: 1 }),
})

console.log(source.disposed)
source.disposalSignal.addEventListener('abort', () => console.log('disposed'))
await source.reload()
console.log(source.snapshot.data)
source.dispose()
console.log(source.disposalSignal.aborted)`,
  name: 'Source Lifecycle',
};
