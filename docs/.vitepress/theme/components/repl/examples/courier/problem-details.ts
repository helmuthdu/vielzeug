export const problemDetailsExample = {
  code: `import { CourierHttpError, createCourier } from '@vielzeug/courier'

const fetch: typeof globalThis.fetch = async () =>
  new Response(
    JSON.stringify({
      type: 'https://api.example.com/problems/insufficient-credit',
      status: 402,
      title: 'Insufficient credit',
      detail: 'Account 1 owes 12.50 EUR.',
      errors: { amount: 'above the remaining balance' },
    }),
    { status: 402, headers: { 'content-type': 'application/problem+json; charset=utf-8' } },
  )

const courier = createCourier({ baseUrl: 'https://api.example.com', fetch })

try {
  await courier.post('/invoices', { body: { amount: 12.5 } })
} catch (error) {
  if (CourierHttpError.is(error)) {
    console.log('Status:', error.status)
    console.log('Message:', error.message)
    console.log('Title:', error.problem?.title)
    console.log('Extension:', error.problem?.errors)
  }
}

courier.dispose()
console.log('✓ Problem details parsed from the error body')`,
  name: 'problem+json - RFC 9457 error bodies',
};
