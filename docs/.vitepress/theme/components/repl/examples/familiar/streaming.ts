export const streamingExample = {
  code: `import { createWorker, task } from '@vielzeug/familiar'

// Task that returns an async iterable — each yielded value becomes a stream chunk.
const tokenize = task((text) => {
  // Self-contained: no outer-scope references
  const words = text.split(' ')
  return (async function* () {
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 30)) // simulate per-token latency
      yield word
    }
  })()
})

const worker = createWorker(tokenize, { concurrency: 2 })

async function run() {
  const sentence = 'the quick brown fox jumps over the lazy dog'

  console.log('Streaming tokens:')
  const tokens = []

  for await (const token of worker.runStream(sentence)) {
    tokens.push(token)
    console.log('token:', token)
  }

  console.log('Done —', tokens.length, 'tokens')

  // Break early — slot is released cleanly
  console.log('Breaking after 3 tokens:')
  const partial = []
  for await (const token of worker.runStream(sentence)) {
    partial.push(token)
    if (partial.length === 3) break  // slot released, no leak
  }
  console.log('Collected:', partial)

  console.log('Remaining free slots:', worker.concurrency - worker.active)
  worker.dispose()
}

run()`,
  name: 'runStream - Streaming',
};
