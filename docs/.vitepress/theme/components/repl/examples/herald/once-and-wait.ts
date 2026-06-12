export const onceAndWaitExample = {
  code: `import { createBus } from '@vielzeug/herald'

// once() fires exactly once then auto-removes; wait() resolves on the next emit
const bus = createBus()

bus.once('data:ready', (payload) => {
  console.log('data (once):', payload.items.join(', '))
})

bus.emit('data:ready', { items: ['alpha', 'beta', 'gamma'] }) // fires
bus.emit('data:ready', { items: ['ignored'] })                // once already consumed

async function waitForTask() {
  console.log('waiting for task...')
  const result = await bus.wait('task:done')
  console.log('task done! result:', result.result)
}

void waitForTask()

setTimeout(() => {
  bus.emit('task:done', { result: 99 })
}, 50)`,
  name: 'once() and wait()',
};
