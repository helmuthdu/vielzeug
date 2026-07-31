export const storeExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// Subscribe to immutable translator snapshots as locale changes.
const i18n = createI18n({
  locale: 'en',
  resources: {
    core: {
      en: { save: 'Save' },
      fr: { save: 'Enregistrer' },
    },
  },
})

i18n.subscribe(({ locale, translator }) => {
  console.log(locale, translator.translate('save'))
}, { immediate: true })

await i18n.setLocale('fr')`,
  name: 'Reactive Locale Store',
};
