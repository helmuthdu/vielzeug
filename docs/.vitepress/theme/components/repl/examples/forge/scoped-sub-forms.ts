export const scopedSubFormsExample = {
  code: `import { createForm } from '@vielzeug/forge'

const form = createForm({ initialValues: { shipping: { city: '', street: '' } } })
const shipping = form.field('shipping')

shipping.field('street').set('123 Main Street')
shipping.field('city').set('Portland')
console.log(shipping.value)
console.log(form.value.shipping)`,
  name: 'Nested Field Handles',
};
