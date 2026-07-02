export const errorHandlingExample = {
  code: `import { createWorker, task, WorkerError } from '@vielzeug/familiar'

const maybeThrow = task((input) => {
  if (input.shouldThrow) {
    throw new Error('Task failed: ' + input.reason)
  }
  return 'success: ' + input.value
})

const worker = createWorker(maybeThrow, {
  timeout: 200,  // fail tasks that take over 200ms
  maxQueue: 2,   // reject when more than 2 tasks are waiting
})

const slowTask = task(() => {
  const end = Date.now() + 1000
  while (Date.now() < end) { /* busy wait */ }
  return 'done'
})

const workerSlow = createWorker(slowTask, {
  timeout: 100,
})

async function run() {
  // Normal success
  const ok = await worker.run({ shouldThrow: false, value: 42 })
  console.log('Success:', ok)

  // Task throws -> WorkerError(code='task')
  try {
    await worker.run({ shouldThrow: true, reason: 'bad input' })
  } catch (err) {
    if (err instanceof WorkerError && err.code === 'task') {
      console.log('task error:', err.message)
    }
  }

  // Timeout -> WorkerError(code='timeout')
  try {
    await workerSlow.run({})
  } catch (err) {
    if (err instanceof WorkerError && err.code === 'timeout') {
      console.log('timeout error:', err.message)
    }
  }

  // queue_full -> WorkerError(code='queue_full')
  // Fill the slot + max queue to trigger back-pressure
  const slow1 = worker.run({ shouldThrow: false, value: 'a' })
  worker.run({ shouldThrow: false, value: 'b' })
  worker.run({ shouldThrow: false, value: 'c' })
  try {
    await worker.run({ shouldThrow: false, value: 'd' }) // 4th — over maxQueue=2
  } catch (err) {
    if (err instanceof WorkerError && err.code === 'queue_full') {
      console.log('queue_full error:', err.message)
    }
  }
  await slow1  // drain

  // Dispose then run -> WorkerError(code='terminated')
  worker.dispose()
  try {
    await worker.run({ shouldThrow: false, value: 0 })
  } catch (err) {
    if (err instanceof WorkerError && err.code === 'terminated') {
      console.log('terminated error:', err.message)
    }
  }

  workerSlow.dispose()
}

run()`,
  name: 'createWorker - Error Handling',
};
