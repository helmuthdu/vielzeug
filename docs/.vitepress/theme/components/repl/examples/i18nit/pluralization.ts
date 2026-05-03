export const pluralizationExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      items: {
        zero: 'No items',
        one: '{count} item',
        other: '{count} items',
      },
    },
  },
})

console.log(i18n.tp('items', 0))
console.log(i18n.tp('items', 1))
console.log(i18n.tp('items', 3))`,
  name: 'Pluralization Rules',
};
