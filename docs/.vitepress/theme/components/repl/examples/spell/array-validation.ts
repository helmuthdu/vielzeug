export const arrayValidationExample = {
  code: `// Validate a product tag list before it hits search filters.
import { s } from '@vielzeug/spell'

const ProductTags = s.array(s.string().trim().min(2)).min(1).max(4).unique()

console.log('Valid tags:', ProductTags.safeParse(['ui', 'forms', 'docs']).success)

const invalid = ProductTags.safeParse(['ui', 'ui', 'x', 'search', 'extra'])
console.log('Invalid tags:', invalid.success)

if (!invalid.success) {
  console.log('Issues:', invalid.error.issues.map((issue) => issue.message))
}`,
  name: 'Array Validation',
};
