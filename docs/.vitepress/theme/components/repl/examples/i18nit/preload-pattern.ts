export const preloadPatternExample = {
  code: `import { createI18n } from '@vielzeug/i18nit'

const i18n = createI18n({
  locale: 'en',
  loaders: {
    en: async () => ({ greeting: 'Hello' }),
    fr: async () => ({ greeting: 'Bonjour' }),
  },
})

await Promise.all([i18n.preload('en'), i18n.preload('fr')])
console.log('EN:', i18n.t('greeting'))
await i18n.setLocale('fr')
console.log('FR:', i18n.t('greeting'))`,
  name: 'Preload Pattern',
};
