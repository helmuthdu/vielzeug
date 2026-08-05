export const richSegmentsExample = {
  code: `import { createCatalogTranslator } from '@vielzeug/lingua'

// segments() preserves components, nodes, or other non-string replacements.
const translator = createCatalogTranslator({
  error: 'Try {retry} or {support}.',
})

const retry = { label: 'retry', href: '/retry' }
const support = { label: 'support', href: '/support' }
const result = translator.segments('error', { values: { retry, support } })

console.log(result)
console.log(result.map((part) => typeof part === 'string' ? part : part.label).join(''))`,
  name: 'Rich Segments',
};
