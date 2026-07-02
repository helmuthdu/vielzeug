export const asyncAttemptExample = {
  code: `import { attempt, isFail, isOk, retry } from '@vielzeug/arsenal'

// attempt() wraps any async function — never throws, always returns { ok, value|error }
const ok = await attempt(async () => {
  await new Promise(r => setTimeout(r, 10))
  return { id: 1, title: 'Buy groceries' }
})

if (isOk(ok)) {
  console.log('Success:', ok.value)
}

// Failure path — errors are captured, not thrown
const fail = await attempt(async () => {
  throw new Error('network timeout')
})

if (isFail(fail)) {
  console.log('Caught:', fail.error.message) // 'network timeout'
}

// Combine with retry() for resilient operations
let calls = 0
const result = await attempt(() =>
  retry(async () => {
    calls++
    if (calls < 3) throw new Error('not ready')
    return 'ready'
  }, { times: 5, delay: 10 })
)

console.log('ok?', result.ok)          // true
console.log('value:', result.value)    // 'ready'
console.log('calls:', calls)           // 3`,
  name: 'attempt - Safe async execution with isFail/isOk helpers',
};
