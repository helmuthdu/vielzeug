export const fieldOperationsExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({ initialValues: { profile: { name: 'Ada' } } })
const name = form.field('profile').field('name')

name.set('Grace')
name.touch()
console.log(name.value, name.dirty, name.touched)
name.reset()
console.log(form.value)`,
  name: 'Focused Field Operations',
};
