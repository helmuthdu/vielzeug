export const nestedObjectsExample = {
  code: `// Model an API response with a discriminator instead of a loose union.
import { s } from '@vielzeug/spell'

const SearchResponse = s.variant('status', {
  error: s.object({
    message: s.string().min(1),
    status: s.literal('error'),
  }),
  success: s.object({
    results: s.array(s.object({ id: s.string().uuid(), title: s.string().min(1) })).default(() => []),
    status: s.literal('success'),
  }),
})

console.log('Success branch:', SearchResponse.parse({
  status: 'success',
  results: [{ id: '550e8400-e29b-41d4-a716-446655440000', title: 'Spell docs' }],
}))

const invalid = SearchResponse.safeParse({ status: 'success', message: 'no results here' })
console.log('Invalid branch accepted:', invalid.success)`,
  name: 'Variant Responses',
};
