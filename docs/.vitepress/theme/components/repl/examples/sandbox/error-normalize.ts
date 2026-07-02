export const errorNormalizeExample = {
  code: `import { SandboxError } from '@vielzeug/sandbox'

// Normalize any caught error into a typed SandboxError, preserving the original cause
function toSandboxError(err) {
  if (SandboxError.is(err)) return err
  const message = err instanceof Error ? err.message : String(err)
  return new SandboxError(\`sandbox operation failed: \${message}\`, { cause: err })
}

try {
  JSON.parse('{ not valid json')
} catch (parseError) {
  const sandboxError = toSandboxError(parseError)
  console.log('Wrapped error name:', sandboxError.name)
  console.log('Wrapped error message:', sandboxError.message)
  console.log('Original cause preserved:', sandboxError.cause === parseError)
  console.log('SandboxError.is(sandboxError):', SandboxError.is(sandboxError))
  console.log('instanceof Error:', sandboxError instanceof Error)
}

// Custom subclasses are still recognised by SandboxError.is()
class SandboxTimeoutError extends SandboxError {}
const timeoutError = new SandboxTimeoutError('render() did not resolve in time')
console.log('\\nSubclass name:', timeoutError.name)
console.log('Subclass recognised by SandboxError.is():', SandboxError.is(timeoutError))
console.log('Plain Error rejected by SandboxError.is():', SandboxError.is(new Error('nope')))`,
  name: 'Normalize Errors with SandboxError',
};
