export const standaloneFormatterExample = {
  code: `import { createFormatter } from '@vielzeug/lingua/format'

// Standalone Intl formatter — no createI18n() needed when a full i18n
// runtime (catalogs, keys, plurals) is overkill and you just want Intl formatting.

// Static locale
const usFormatter = createFormatter('en-US')
console.log(usFormatter.number(1_234_567.89))       // '1,234,567.89'
console.log(usFormatter.currency(49.95, 'USD'))     // '$49.95'

// Reactive locale — pass a getter so the formatter follows a mutable value
let currentLocale = 'en-US'
const reactiveFormatter = createFormatter(() => currentLocale)

console.log(reactiveFormatter.date(new Date('2025-06-01'), { dateStyle: 'long' }))
// => 'June 1, 2025'

currentLocale = 'de-DE'
console.log(reactiveFormatter.date(new Date('2025-06-01'), { dateStyle: 'long' }))
// => '1. Juni 2025' — same formatter instance, new locale on next call

console.log(reactiveFormatter.list(['Äpfel', 'Birnen', 'Orangen']))
// => 'Äpfel, Birnen und Orangen'

console.log(reactiveFormatter.duration({ hours: 1, minutes: 30 }))
// => '1h 30min' (labeled fallback where Intl.DurationFormat is unavailable — e.g. this REPL's runtime)

// clear() drops cached Intl formatter instances — rarely needed manually,
// since createI18n()'s setLocale() already calls it automatically for i18n.fmt.
reactiveFormatter.clear()`,
  name: 'createFormatter() — standalone (no createI18n)',
};
