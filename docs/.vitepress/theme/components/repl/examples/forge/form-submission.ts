export const formSubmissionExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    username: '',
    email: '',
  },
  validators: {
    username: (value) => (!value ? 'Username is required' : undefined),
    email: (value) => {
      if (!value) return 'Email is required'
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(value))) return 'Invalid email'
    },
  },
})

form.set('username', 'johndoe')
form.set('email', 'john@example.com')

const result = await form.submit(async (values) => {
  console.log('Submitting...', values)
  await new Promise((resolve) => setTimeout(resolve, 200))
  return { id: 123, success: true }
})

if (result.ok) {
  console.log('✓ Form submitted!', result.value)
} else {
  console.error('✗ Validation errors:', result.errors)
}`,
  name: 'Form Submission with Validation',
};
