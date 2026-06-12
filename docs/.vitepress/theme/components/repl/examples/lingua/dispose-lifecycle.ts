export const disposeLifecycleExample = {
  code: `import { createI18n } from '@vielzeug/lingua'

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello', farewell: 'Goodbye' },
    // 'de' registered as a lazy loader — not yet resolved
    de: async () => ({ greeting: 'Hallo', farewell: 'Auf Wiedersehen' }),
  },
})

// ── isRegistered() ────────────────────────────────────────────────────────────
// Distinguishes "locale never configured" from "loader registered but not loaded".
console.log('isRegistered("en"):', i18n.isRegistered('en'))  // true (static catalog)
console.log('isRegistered("de"):', i18n.isRegistered('de'))  // true (pending loader)
console.log('isRegistered("fr"):', i18n.isRegistered('fr'))  // false (never configured)

console.log('isLoaded("en"):', i18n.isLoaded('en'))  // true
console.log('isLoaded("de"):', i18n.isLoaded('de'))  // false — not yet preloaded

// Safe for invalid locale tags — both predicates never throw
console.log('isRegistered("!!"):', i18n.isRegistered('!!'))  // false
console.log('isLoaded("!!"):', i18n.isLoaded('!!'))           // false

// ── Conditional preload pattern ───────────────────────────────────────────────
if (!i18n.isRegistered('de')) throw new Error('de locale not configured')
if (!i18n.isLoaded('de')) await i18n.preload('de')

console.log('isLoaded("de") after preload:', i18n.isLoaded('de'))  // true

await i18n.setLocale('de')
console.log('greeting (de):', i18n.t('greeting'))  // 'Hallo'

// ── dispose() ─────────────────────────────────────────────────────────────────
// Useful for route-scoped fork instances — releases subscribers + catalog memory.
const routeI18n = i18n.fork({ locale: 'en' })
let notified = 0
routeI18n.subscribe(() => notified++)

console.log('before dispose — isRegistered("en"):', routeI18n.isRegistered('en'))  // true

routeI18n.dispose()

// All state is cleared after disposal
console.log('after dispose — isRegistered("en"):', routeI18n.isRegistered('en'))  // false
console.log('after dispose — isLoaded("en"):', routeI18n.isLoaded('en'))           // false

// Subscribers are cleared — no more notifications
routeI18n.register('en', { greeting: 'Hi' })  // register still runs (no error)
console.log('subscribers notified after dispose:', notified)  // 0

// dispose() is idempotent — calling twice is safe
routeI18n.dispose()
console.log('double dispose — no error')

// The parent instance is unaffected
console.log('parent still works:', i18n.t('greeting'))  // 'Hallo' (de)`,
  name: 'isRegistered(), dispose() — lifecycle management',
};
