export const storeExample = {
  code: `import { createTranslationStore } from '@vielzeug/lingua'

const i18n = createTranslationStore({
  catalogs: {
    en: { save: 'Save' },
    fr: { save: 'Enregistrer' },
  },
  locale: 'en',
})

i18n.subscribe(({ locale, translator }) => {
  console.log(locale, translator.translate('save'))
}, { immediate: true })

await i18n.setLocale('fr')`,
  name: 'Reactive Locale Store',
};
