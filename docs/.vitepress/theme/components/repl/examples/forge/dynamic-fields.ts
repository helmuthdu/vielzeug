export const dynamicFieldsExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({ initialValues: { contacts: [] as { email: string }[] } })
const contacts = form.field('contacts')

contacts.set((previous) => [...previous, { email: 'ada@example.com' }])
contacts.set((previous) => previous.slice(1))
console.log(form.value)`,
  name: 'Dynamic Values',
};
