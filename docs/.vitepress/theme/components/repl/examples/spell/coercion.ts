export const coercionExample = {
  code: `// Coerce query params into typed search options with safe defaults.
import { s } from '@vielzeug/spell'

const SearchQuery = s.object({
  draft: s.coerce.boolean().default(false),
  limit: s.coerce.number().int().positive().default(20),
  page: s.coerce.number().int().positive().default(1),
  q: s.coerce.string().trim().min(1).optional(),
})

const parsed = SearchQuery.parse({
  draft: 'true',
  limit: '50',
  page: '2',
  q: '  vielzeug  ',
})

console.log(parsed)
console.log('limit type:', typeof parsed.limit)`,
  name: 'Type Coercion',
};
