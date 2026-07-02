export const validateStreamExample = {
  code: `// validateStream yields each field result as it resolves — read-only, does not write to form state
import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: { email: '', password: '', username: '' },
  validator: (vals) => {
    const errors = {}
    if (!vals.email.includes('@')) errors.email = 'Invalid email'
    if (vals.password.length < 8) errors._form = 'Password too short'
    return Object.keys(errors).length ? errors : undefined
  },
  validators: {
    username: (v) => (String(v).length < 3 ? 'Min 3 characters' : undefined),
  },
})

form.set('email', 'notanemail')
form.set('password', 'short')
form.set('username', 'ab')

console.log('Streaming validation results:')

for await (const { field, error } of form.validateStream()) {
  console.log(\` \${field}: \${error ?? '✓ ok'}\`)
}
// Form validator yields both 'email' and '_form' entries at the end

// validateStream is read-only — form.state.errors is still empty
console.log('Form errors after stream:', Object.keys(form.state.errors).length, '(unchanged)')`,
  name: 'Streaming Validation (validateStream)',
};
