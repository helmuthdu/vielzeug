export const formattingHelpersExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({ locale: 'en-US' })

console.log('Number:', i18n.format({ kind: 'number', value: 1234567.89 }))
console.log('Currency:', i18n.format({ kind: 'currency', value: 1234.56, currency: 'USD' }))
console.log('Date:', i18n.format({ kind: 'date', value: new Date('2024-03-15T10:30:00Z') }))
console.log('Relative:', i18n.format({ kind: 'relative', value: -2, unit: 'day' }))
console.log('List:', i18n.format({ kind: 'list', value: ['A', 'B', 'C'] }))`,
  name: 'Formatting Helpers',
};
