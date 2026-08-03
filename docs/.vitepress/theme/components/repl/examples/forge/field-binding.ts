export const fieldBindingExample = {
  code: `import { createForm } from '@vielzeug/forge'
import { bindField } from '@vielzeug/forge/dom'

const form = createForm({
  initialValues: { email: '' },
  validate: (value) => ({ fields: { email: value.email.includes('@') ? undefined : 'Invalid email' } }),
})
const email = form.field('email')
const input = document.createElement('input')
const stop = bindField(input, email, {
  read: (element) => element.value,
  write: (element, value) => { element.value = value },
})

input.value = 'ada'
input.dispatchEvent(new Event('input'))
input.dispatchEvent(new Event('blur'))
console.log(email.value, email.touched)
console.log(await form.validate())
stop()`,
  name: 'DOM Field Binding',
};
