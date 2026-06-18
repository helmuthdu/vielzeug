export const forkSsrExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

// fork() creates an isolated child instance — resolved catalog entries are shared
// by reference (no template re-compilation), making it cheap for SSR fork-per-request.
const shared = createI18n({
  locale: 'en',
  catalogs: {
    en: { title: 'Home', welcome: 'Welcome, {name}!' },
    de: { title: 'Startseite', welcome: 'Willkommen, {name}!' },
    fr: { title: 'Accueil', welcome: 'Bienvenue, {name}!' },
  },
})

// Simulate two concurrent SSR requests with different locales
const reqDE = shared.fork({ locale: 'de' })
const reqFR = shared.fork({ locale: 'fr' })

console.log('DE:', reqDE.t('title'))              // 'Startseite'
console.log('FR:', reqFR.t('title'))              // 'Accueil'
console.log('Shared (unchanged):', shared.t('title')) // 'Home'

// Mutations on a fork do not affect siblings or the parent
reqDE.register('de', { title: 'DE-Override', welcome: reqDE.t('welcome') })
console.log('DE after register:', reqDE.t('title'))   // 'DE-Override'
console.log('FR unaffected:', reqFR.t('title'))       // 'Accueil'
console.log('Shared unaffected:', shared.t('title'))  // 'Home'

// Each fork has its own subscriber set
let deChanges = 0
reqDE.subscribe(() => { deChanges++ })
await reqDE.setLocale('en')
console.log('DE locale changes:', deChanges) // 1`,
  name: 'fork() — SSR & Test Isolation',
};
