export const segmentedInterpolationExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// ti() — segmented interpolation: the template becomes a mixed array of
// string segments and typed values. Use it to embed non-string content
// (components, links, chips) inside translated text.

const i18n = createI18n({
  catalogs: {
    en: {
      error: 'Try to {reloadLink} or {supportLink} for help.',
      greeting: 'Hello, {name}!',
    },
  },
})

// Typed values pass through as-is — strings stay strings, anything else
// keeps its identity (here plain objects stand in for components)
const segments = i18n.ti('error', {
  reloadLink: { href: '/reload', text: 'reload' },
  supportLink: { href: '/support', text: 'contact support' },
})

console.log(segments)
// ['Try to ', { href: '/reload', ... }, ' or ', { href: '/support', ... }, ' for help.']

// Render in JSX: <>{segments}</> — here we just show the readable form:
console.log(segments.map((s) => (typeof s === 'string' ? s : s.text)).join(''))

// Missing var keeps its {placeholder} segment — visible, not silently empty:
console.log(i18n.ti('error', {}))

// null counts as a provided value and is embedded (unlike t(), where null is missing):
console.log(i18n.ti('greeting', { name: null }))

// Missing key falls back through onMissingKey (one string segment):
console.log(i18n.ti('does.not.exist', {}))`,
  name: 'Segmented Interpolation — ti() for embedded components',
};
