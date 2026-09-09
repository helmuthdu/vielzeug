export const formSubmissionExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  initialValues: { email: '' },
  validate: (value) => (value.email.includes('@') ? undefined : [{ path: ['email'], message: 'Invalid email' }]),
})

form.field('email').set('ada@example.com')
const result = await form.submit(async (value) => ({ ...value, saved: true }))
console.log(result)`,
  name: 'Form Submission',
};
