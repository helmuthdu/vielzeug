export const preloadPatternExample = {
  code: `import { createI18n } from '/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello' },
    fr: async () => ({ greeting: 'Bonjour' }),
  },
})

i18n.register('de', async () => ({ greeting: 'Hallo' }))

await Promise.all([i18n.preload('fr'), i18n.preload('de')])
console.log('EN:', i18n.t('greeting'))
await i18n.setLocale('fr')
console.log('FR:', i18n.t('greeting'))
await i18n.setLocale('de')
console.log('DE:', i18n.t('greeting'))`,
  name: 'Preload Pattern',
};
