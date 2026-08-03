export const formSubmissionExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  initialValues: { email: '' },
  validate: (value) => ({ fields: { email: value.email.includes('@') ? undefined : 'Invalid email' } }),
})

form.field('email').set('ada@example.com')
const result = await form.submit(async (value) => ({ ...value, saved: true }))
console.log(result)`,
  name: 'Form Submission',
};
