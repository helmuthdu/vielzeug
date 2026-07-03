export const dynamicFieldsExample = {
  code: `// fields.register/remove/setValidator/list manage fields not present in defaultValues
import { createForm } from '@vielzeug/forge'

const form = createForm({
  defaultValues: {
    name: 'Alice',
  },
})

console.log('Registered dynamic fields:', form.fields.list())

// Register a field that only appears once the user opts in (e.g. "add phone number")
const unregisterPhone = form.fields.register('phone', {
  defaultValue: '',
  validator: (value) => (!value ? 'Phone number is required' : undefined),
})

console.log('After registering phone:', form.fields.list())
console.log('Phone field state:', form.field('phone'))

form.set('phone', '555-0100')
console.log('Validation:', await form.validate('phone'))

// Attach a validator to a field that already exists in defaultValues
form.fields.setValidator('name', (value) => (!value ? 'Name is required' : undefined));

// User removes the optional phone field again
unregisterPhone()
console.log('After unregister:', form.fields.list())
console.log('Value cleared too:', form.get('phone'))`,
  name: 'Dynamic Fields (fields.register/list)',
};
