export const formValidationExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  initialValues: { password: '', passwordConfirmation: '' },
  validate: (value) => {
    const issues: { path: (string | number)[]; message: string }[] = []

    if (value.password.length < 8) issues.push({ path: ['password'], message: 'Use at least eight characters' })
    if (value.password !== value.passwordConfirmation) {
      issues.push({ path: ['passwordConfirmation'], message: 'Passwords must match' })
    }

    return issues
  },
})

form.field('password').set('short')
console.log(await form.validate())

form.field('password').set('strong-password')
form.field('passwordConfirmation').set('strong-password')
console.log(await form.validate())`,
  name: 'Whole-Value Validation',
};
