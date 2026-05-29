export const basicSetupExample = {
  code: `import { createI18n } from '/lingua'

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  catalogs: {
    en: { hello: 'Hello', welcome: 'Welcome, {name}!' },
    es: { hello: 'Hola', welcome: 'Bienvenido, {name}!' },
  },
})

console.log('EN:', i18n.t('hello'))
console.log(i18n.t('welcome', { vars: { name: 'Alice' } }))
await i18n.setLocale('es')
console.log('ES:', i18n.t('hello'))
console.log(i18n.t('welcome', { vars: { name: 'Alice' } }))`,
  name: 'Basic Setup - Initialize i18n',
};
