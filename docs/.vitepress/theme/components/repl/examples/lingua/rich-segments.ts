export const richSegmentsExample = {
  code: `import { createTranslator } from '@vielzeug/lingua'

// segments() preserves components, nodes, or other non-string replacements.
const translator = createTranslator({
  en: { error: 'Try {retry} or {support}.' },
}, { locale: 'en' })

const retry = { label: 'retry', href: '/retry' }
const support = { label: 'support', href: '/support' }
const result = translator.segments('error', { values: { retry, support } })

console.log(result)
console.log(result.map((part) => typeof part === 'string' ? part : part.label).join(''))`,
  name: 'Rich Segments',
};
