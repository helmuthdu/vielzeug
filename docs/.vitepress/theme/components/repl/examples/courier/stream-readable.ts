export const streamReadableExample = {
  code: `import { createStream } from '@vielzeug/courier'

// Note: readable() requires a server that streams a response body.
// This example demonstrates the API pattern; adapt the URL to your endpoint.
const stream = createStream({ baseUrl: 'https://httpbin.org' })

// --- Text stream ---
console.log('Streaming text chunks:')
try {
  for await (const chunk of stream.readable('/stream-bytes/256')) {
    process.stdout?.write(chunk) ?? console.log('chunk:', chunk.length, 'chars')
  }
  console.log('\\n✓ Text stream complete')
} catch (err) {
  console.log('Text stream demo (needs streaming endpoint):', err.message)
}

// --- NDJSON stream ---
// Perfect for AI token streams, log streams, or event feeds.
// Each newline-delimited JSON line is parsed automatically.
console.log('\\nStreaming NDJSON:')
try {
  let count = 0
  for await (const line of stream.readable('/stream/3', { parse: 'ndjson' })) {
    console.log('Line', ++count + ':', line.url)
    if (count >= 3) break
  }
  console.log('✓ NDJSON stream complete')
} catch (err) {
  console.log('NDJSON stream demo (needs NDJSON endpoint):', err.message)
}

stream.dispose()`,
  name: 'Stream - ReadableStream (text + NDJSON)',
};
