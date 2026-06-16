export const schemaWalkExample = {
  code: `// Traverse a schema tree with walk() to extract field metadata.
import { s } from '@vielzeug/spell'

const Order = s.object({
  id:       s.string().uuid(),
  amount:   s.number().positive(),
  customer: s.object({
    email: s.string().email(),
    name:  s.string().min(1),
  }),
  tags: s.array(s.string()).optional(),
})

// Collect every field name and whether it is optional.
const fields: { name: string; required: boolean }[] = []

Order.walk({
  object(node) {
    for (const [key, child] of Object.entries(node.shape)) {
      fields.push({ name: key, required: !child.isOptional })
      child.walk(this)
    }
  },
  // unknown() catches any kind without a handler; omitting it returns null instead of throwing
  unknown() {},
})

console.log('Fields:')
fields.forEach(f => console.log(' ', f.name, f.required ? '(required)' : '(optional)'))
console.log('Total:', fields.length)`,
  name: 'Schema Traversal',
};
