export const asyncLoadingExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  messages: { en: { greeting: 'Hello' } },
  loaders: {
    de: async () => ({ greeting: 'Hallo' }),
  },
})

console.log('Current:', i18n.t('greeting'))
await i18n.preload('de')
await i18n.setLocale('de')
console.log('German:', i18n.t('greeting'))`,
  name: 'Async Locale Loading',
};
