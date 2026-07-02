export const fieldBindingExample = {
  code: `import { createForm, ValidationModes } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    firstName: '',
    lastName: '',
    email: '',
  },
  connect: ValidationModes.onTouched,
  validators: {
    email: (value) => (!String(value).includes('@') ? 'Invalid email' : undefined),
  },
})

const firstNameConn = form.connect('firstName')
const emailConn = form.connect('email')

console.log('Initial connection state:', {
  firstName: firstNameConn.value,
  emailError: emailConn.error,
  disposed: emailConn.disposed,
})

firstNameConn.onChange('John')
emailConn.onChange('john')
console.log('After typing:', form.values())

emailConn.onBlur()
await form.validate('email')
console.log('After blur validation:', form.field('email'))

emailConn.onChange('john@example.com')
await form.validate('email')
console.log('After fixing email:', form.field('email'))

// Simulate unmount — cancel any pending debounce timer
emailConn.dispose()
console.log('Binding disposed:', emailConn.disposed)`,
  name: 'Field Connection (connect)',
};
