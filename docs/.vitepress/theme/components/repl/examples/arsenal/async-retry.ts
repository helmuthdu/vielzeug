export const asyncRetryExample = {
  code: `import { retry } from '@vielzeug/arsenal'

let attempts = 0
const unreliableOperation = async () => {
  attempts++
  console.log(\`Attempt #\${attempts}\`)

  if (attempts < 3) {
    throw new Error('Failed!')
  }

  return 'Success!'
}

try {
  const result = await retry(unreliableOperation, {
    times: 5,
    delay: 100
  })
  console.log('Result:', result)
  console.log('Total attempts:', attempts)
} catch (err) {
  console.error('All retries failed:', err.message)
}`,
  name: 'retry - Retry failed operations',
};
