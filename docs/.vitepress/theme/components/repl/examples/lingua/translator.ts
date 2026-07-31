export const translatorExample = {
  code: `import { createTranslator } from '@vielzeug/lingua'

// createTranslator — minimal static translator for per-component strings.
// No subscriptions, no loaders, no disposal: call once at module level.
const { t, ti, tp } = createTranslator({
  cancel: 'Cancel',
  error: 'Try to {reloadLink} or {supportLink} for help.',
  inbox: { one: 'One message', other: '{count} messages' },
  save: 'Save',
})

console.log(t('save'))               // 'Save'
console.log(tp('inbox', 0), tp('inbox', 1), tp('inbox', 5))

// ti() — segmented interpolation: mixed array of strings and typed values
// (components, elements, anything your framework can render)
const segments = ti('error', {
  reloadLink: { href: '/reload', text: 'reload' },
  supportLink: { href: '/support', text: 'contact support' },
})
console.log(segments.map((s) => (typeof s === 'string' ? s : s.text)).join(''))
// 'Try to reload or contact support for help.'

// Missing key falls back to the key string; missing var keeps its placeholder
console.log(t('missing.key'))
console.log(ti('error', {}).map(String).join(''))

// { locale } drives CLDR plural selection
const ar = createTranslator({ items: { few: '{count} قليل', one: 'واحد', other: '{count} أخرى', two: 'اثنان', zero: 'صفر' } }, { locale: 'ar' })
console.log(ar.tp('items', 0), ar.tp('items', 2), ar.tp('items', 3))`,
  name: 'createTranslator — static catalogs + ti() segmented interpolation',
};
