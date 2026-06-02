export const fmtFormatterExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const i18n = createI18n({
  locale: 'en-US',
  catalogs: {
    'en-US': { price: 'Price: {formatted}', balance: 'Balance: {formatted}' },
    'de-DE': { price: 'Preis: {formatted}', balance: 'Guthaben: {formatted}' },
  },
})

// i18n.fmt is pre-wired to the instance locale and auto-updates on setLocale()
console.log(i18n.fmt.number(1_234_567.89))
// => '1,234,567.89'

console.log(i18n.fmt.currency(49.95, 'USD'))
// => '$49.95'

console.log(i18n.fmt.date(new Date('2025-06-01'), { dateStyle: 'long' }))
// => 'June 1, 2025'

console.log(i18n.fmt.relative(-3, 'day'))
// => '3 days ago'

console.log(i18n.fmt.list(['apples', 'bananas', 'oranges']))
// => 'apples, bananas, and oranges'

await i18n.setLocale('de-DE')

// After locale switch — fmt produces German-locale output automatically
console.log(i18n.fmt.number(1_234_567.89))
// => '1.234.567,89'

console.log(i18n.fmt.currency(49.95, 'EUR'))
// => '49,95 €'`,
  name: 'Formatter (fmt)',
};
