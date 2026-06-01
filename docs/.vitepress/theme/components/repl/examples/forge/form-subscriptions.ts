export const formSubscriptionsExample = {
  code: "import { createForm } from '@vielzeug/forge'\n\nconst form = createForm({\n  defaultValues: {\n    name: '',\n    email: '',\n  },\n})\n\nconst unsubscribeForm = form.subscribe((state) => {\n  console.log('Form state:', {\n    isDirty: state.isDirty,\n    isValid: state.isValid,\n    errors: state.errors,\n  })\n}, { sync: true })\n\nconst unsubscribeEmail = form.subscribeField('email', (field) => {\n  console.log('Email field:', field)\n}, { sync: true })\n\nform.set('name', 'Alice')\nform.set('email', 'alice@example.com')\nform.touch('email')\n\nunsubscribeEmail()\nunsubscribeForm()\nconsole.log('Unsubscribed both listeners')",
  name: 'Form Subscriptions - Reactive Updates',
};
