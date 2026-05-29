export const pluralizationExample = {
  code: `import { createI18n } from '/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: {
      items: {
        zero: 'No items',
        one: '{count} item',
        other: '{count} items',
      },
      position: {
        one: '{count}st',
        two: '{count}nd',
        few: '{count}rd',
        other: '{count}th',
      },
    },
  },
})

// tp() resolves plural branch keys — count is injected automatically
console.log(i18n.tp('items', 0))
console.log(i18n.tp('items', 1))
console.log(i18n.tp('items', 3))

// Ordinal plurals
console.log(i18n.tp('position', 1, { ordinal: true }))
console.log(i18n.tp('position', 2, { ordinal: true }))`,
  name: 'Pluralization Rules',
};
