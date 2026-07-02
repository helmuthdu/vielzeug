export const formSubscriptionsExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    name: '',
    email: '',
  },
})

const unsubscribeForm = form.subscribe((state) => {
  console.log('Form state:', {
    isDirty: state.isDirty,
    isValid: state.isValid,
    errors: state.errors,
  })
}, { sync: true })

const unsubscribeEmail = form.subscribeField('email', (field) => {
  console.log('Email field:', field)
}, { sync: true })

form.set('name', 'Alice')
form.set('email', 'alice@example.com')
form.touch('email')

unsubscribeEmail()
unsubscribeForm()
console.log('Unsubscribed both listeners')`,
  name: 'Form Subscriptions - Reactive Updates',
};
