export const scopedSubFormsExample = {
  code: `// scope() carves out a sub-form for a nested address block — same state, relative field paths
import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    customerName: '',
    shipping: { street: '', city: '', zip: '' },
  },
  validators: {
    customerName: (value) => (!value ? 'Name is required' : undefined),
    'shipping.street': (value) => (!value ? 'Street is required' : undefined),
    'shipping.zip': (value) => (!/^\\d{5}$/.test(String(value)) ? 'Invalid ZIP' : undefined),
  },
})

// scope() is memoized — call once per prefix and reuse the returned object
const shipping = form.scope('shipping')

shipping.set('street', '123 Main St')
shipping.set('city', 'Portland')
console.log('Read via full form:', form.get('shipping.street'))
console.log('Read via scope:', shipping.get('street'))

const firstCheck = await shipping.validate()
console.log('Shipping valid?', firstCheck.valid, firstCheck.errors)

shipping.set('zip', '97201')
const secondCheck = await shipping.validate()
console.log('After fixing ZIP:', secondCheck.valid ? '✓ valid' : secondCheck.errors)

// Scoped errors use relative keys ('zip'), never the full 'shipping.zip' path
console.log('Scope state errors:', shipping.state.errors)`,
  name: 'Scoped Sub-Forms (scope)',
};
