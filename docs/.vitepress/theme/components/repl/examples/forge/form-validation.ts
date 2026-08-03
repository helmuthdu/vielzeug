export const formValidationExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  initialValues: { password: '', passwordConfirmation: '' },
  validate: (value) => ({
    fields: {
      password: value.password.length >= 8 ? undefined : 'Use at least eight characters',
      passwordConfirmation: value.password === value.passwordConfirmation ? undefined : 'Passwords must match',
    },
  }),
})

form.field('password').set('short')
console.log(await form.validate())

form.field('password').set('strong-password')
form.field('passwordConfirmation').set('strong-password')
console.log(await form.validate())`,
  name: 'Whole-Value Validation',
};
