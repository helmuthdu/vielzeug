export const arrayFormattingExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const i18n = createI18n({
  locale: 'fr-CA',
  fallback: ['fr', 'en'],
  catalogs: {
    en: { checkout: 'Checkout' },
    fr: { checkout: 'Paiement' },
  },
})

console.log('Resolved:', i18n.t('checkout'))
console.log('Known locales:', i18n.getSupportedLocales())`,
  name: 'Fallback Resolution',
};
