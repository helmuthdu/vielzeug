export const richSegmentsExample = {
  code: `import { createTranslator } from '@vielzeug/lingua'

// parts() preserves components, nodes, or other non-string replacements
// as a typed discriminated union: { type: 'text', value } | { type: 'value', value }.
const translator = createTranslator({
  error: 'Try {retry} or {support}.',
})

const retry = { label: 'retry', href: '/retry' }
const support = { label: 'support', href: '/support' }
const result = translator.parts('error', { values: { retry, support } })

console.log(result)
console.log(result.map((part) => part.type === 'text' ? part.value : part.value.label).join(''))`,
  name: 'Rich Parts',
};
