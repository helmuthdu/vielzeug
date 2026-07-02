export const formValidationExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    email: '',
    password: '',
    confirmPassword: '',
  },
  validators: {
    email: (value) => {
      if (!value) return 'Email is required'
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(value))) return 'Invalid email format'
    },
    password: (value) => {
      if (!value) return 'Password is required'
      if (String(value).length < 8) return 'Min 8 characters'
    },
  },
  validator: (values) => {
    if (values.password !== values.confirmPassword) {
      return { confirmPassword: 'Passwords must match' }
    }
  },
})

form.set('email', 'invalid-email')
form.set('password', 'short')
form.set('confirmPassword', 'different')

const firstRun = await form.validate()
console.log('Valid:', firstRun.valid)
console.log('Errors:', firstRun.errors)

form.set('email', 'user@example.com')
form.set('password', 'password123')
form.set('confirmPassword', 'password123')

const secondRun = await form.validate()
console.log('After fixing:', secondRun.valid ? '✓ Valid' : 'Still errors')`,
  name: 'Field & Form Validation',
};
