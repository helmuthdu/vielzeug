export const formSubscriptionsExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  initialValues: { email: '', name: '' },
  onSubscriberError: (error) => console.log('Subscriber error:', error),
})
const stopForm = form.subscribe((state) => console.log('Valid:', state.valid), { immediate: true })
const stopEmail = form.field('email').subscribe((state) => console.log('Email:', state), { immediate: true })

form.field('name').set('Ada')
form.field('email').set('ada@example.com')
stopEmail()
stopForm()`,
  name: 'Form and Field Subscriptions',
};
