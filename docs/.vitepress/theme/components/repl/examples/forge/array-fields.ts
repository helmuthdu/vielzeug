export const arrayFieldsExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({ initialValues: { tags: ['typescript'] } })
const tags = form.field('tags')

tags.set((previous) => [...previous, 'forms'])
tags.set((previous) => previous.filter((tag) => tag !== 'typescript'))
console.log(form.value.tags)`,
  name: 'Immutable Array Updates',
};
