export const errorNormalizeExample = {
  code: `import { SandboxError } from '@vielzeug/sandbox'

// Normalize any caught error into a typed SandboxError, preserving the original cause
function toSandboxError(err) {
  if (err instanceof SandboxError) return err
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
  console.log('instanceof SandboxError:', sandboxError instanceof SandboxError)
  console.log('instanceof Error:', sandboxError instanceof Error)
}

// Custom subclasses are still recognised by instanceof
class SandboxTimeoutError extends SandboxError {}
const timeoutError = new SandboxTimeoutError('render() did not resolve in time')
console.log('\\nSubclass name:', timeoutError.name)
console.log('Subclass instanceof SandboxError:', timeoutError instanceof SandboxError)
console.log('Plain Error rejected:', !(new Error('nope') instanceof SandboxError))`,
  name: 'Normalize Errors with SandboxError',
};
