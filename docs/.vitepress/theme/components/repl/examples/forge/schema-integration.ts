export const schemaIntegrationExample = {
  code: `// Pass any safeParse-compatible schema directly to validator — no wrapper needed
import { createForm } from '@vielzeug/forge'

const error = (path, message) => ({
  message,
  path: [path],
})

// Simulates @vielzeug/spell, Zod, Valibot, or any safeParse-compatible schema
const mockSchema = {
  safeParse(data) {
    const value = data ?? {}
    const issues = []

    if (!value.username || value.username.length < 3) {
      issues.push(error('username', 'Min 3 characters'))
    }

    if (!value.email || !value.email.includes('@')) {
      issues.push(error('email', 'Invalid email'))
    }

    return issues.length > 0
      ? { success: false, error: { issues } }
      : { success: true }
  },
}

const form = createForm({
  defaultValues: { username: '', email: '' },
  validator: mockSchema, // auto-detected as a safeParse schema
})

form.set('username', 'ab')
form.set('email', 'notanemail')

const invalid = await form.validate()
console.log('Valid:', invalid.valid)
console.log('Errors:', invalid.errors)

form.set('username', 'alice')
form.set('email', 'alice@example.com')

const valid = await form.validate()
console.log('After fix — Valid:', valid.valid)`,
  name: 'Schema Integration - safeParse Auto-detection',
};
