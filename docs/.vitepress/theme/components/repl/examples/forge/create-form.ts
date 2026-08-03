export const createFormExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({ initialValues: { account: { email: '' }, name: '' } })
const email = form.field('account').field('email')

email.set('ada@example.com')
console.log(form.value)
console.log(form.state.valid)`,
  name: 'Create Immutable Form',
};
