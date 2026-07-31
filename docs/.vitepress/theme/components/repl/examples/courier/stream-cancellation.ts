export const streamCancellationExample = {
  code: `import { createCourier } from '@vielzeug/courier'

// Breaking a stream loop aborts its active request immediately.
  const fetch: typeof globalThis.fetch = async () =>
    new Response('{"id":1,"message":"First record"}\\n{"id":2,"message":"Second record"}\\n')
  const courier = createCourier({ baseUrl: 'https://api.example.com', fetch })
const iterator = courier.read('/chat', { body: { prompt: 'Show one stream record.' }, parse: 'ndjson' })
const records = []

for await (const record of iterator) {
  records.push(record)
  console.log('First record:', record)
  break
}

console.log('Stopped stream after', records.length, 'record')
console.log('Records:', records)`,
  name: 'streamCancellation - Abortable Iteration',
};
