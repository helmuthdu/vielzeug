export const arrayFieldsExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    tags: ['javascript', 'typescript'],
  },
})

console.log('Initial tags:', form.get('tags'))

// Append a new tag
form.array('tags').append('react')
console.log('After append:', form.get('tags'))

// Remove second item (index 1)
form.array('tags').remove(1)
console.log('After remove index 1:', form.get('tags'))

// Move first item to last position
form.array('tags').move(0, 1)
console.log('After move:', form.get('tags'))`,
  name: 'Array Fields - Dynamic Lists',
};
