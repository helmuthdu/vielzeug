export const asyncLoadingExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello' },
    de: async () => ({ greeting: 'Hallo' }),
  },
})

console.log('Current:', i18n.t('greeting'))
await i18n.preload('de')
await i18n.setLocale('de')
console.log('German:', i18n.t('greeting'))

i18n.register('de', { greeting: 'Guten Tag' })
console.log('Replaced:', i18n.t('greeting'))`,
  name: 'Async Locale Loading',
};
