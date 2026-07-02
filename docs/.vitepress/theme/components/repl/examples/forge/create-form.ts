export const createFormExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    name: '',
    email: '',
    age: 0,
  },
})

console.log('Form created!')
console.log('Initial values:', form.values())
console.log('Name:', form.get('name'))
console.log('isDirty:', form.state.isDirty)
console.log('isValid:', form.state.isValid)
console.log('submitCount:', form.state.submitCount)`,
  name: 'Create Form - Basic Setup',
};
