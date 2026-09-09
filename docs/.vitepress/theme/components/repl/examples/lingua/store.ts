export const storeExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const catalogs: Record<string, Record<string, string>> = {
  en: { save: 'Save' },
  fr: { save: 'Enregistrer' },
}

const i18n = createI18n({
  catalogs,
  locale: 'en',
})

i18n.subscribe(({ locale, translator }) => {
  console.log(locale, translator.translate('save'))
}, { immediate: true })

await i18n.setLocale('fr')`,
  name: 'Reactive Locale Store',
};
