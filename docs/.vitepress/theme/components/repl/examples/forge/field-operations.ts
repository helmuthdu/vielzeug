export const fieldOperationsExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    name: 'Alice',
    age: 25,
  },
})

console.log('Initial:', form.values())

form.set('name', 'Bob')
console.log('After set name:', form.get('name'))

form.batch(() => {
  form.set('name', 'Charlie')
  form.set('age', 30)
})
console.log('After batch:', form.values())
console.log('Field state:', form.field('name'))
console.log('Form state:', form.state)

form.reset()
console.log('After reset:', form.values())`,
  name: 'Field Operations - Get, Set, Batch, Reset',
};
