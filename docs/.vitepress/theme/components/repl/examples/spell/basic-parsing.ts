export const basicParsingExample = {
  code: `// Schema definition, type inference, and safe parsing
import { s } from '@vielzeug/spell'

const Product = s.object({
  id:    s.string().uuid(),
  name:  s.string().min(1).max(120),
  price: s.number().positive().multipleOf(0.01),
  tags:  s.array(s.string().min(1)).default(() => []),
})

// Infer the TypeScript type directly from the schema
// type Product = { id: string; name: string; price: number; tags: string[] }

// parse() throws on failure — use when invalid input is a programmer error
const product = Product.parse({
  id:    '550e8400-e29b-41d4-a716-446655440000',
  name:  'Mechanical Keyboard',
  price: 129.99,
})
console.log('Parsed:', product.name, '— tags:', product.tags)

// safeParse() returns a tagged result union — use at untrusted boundaries
const bad = Product.safeParse({ id: 'not-a-uuid', name: '', price: -5 })
if (!bad.success) {
  const paths = bad.error.issues.map(i => i.path.join('.') || 'root')
  console.log('Validation failed at:', paths.join(', '))
}`,
  name: 'Basic Parsing',
};
