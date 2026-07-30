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

// ── isLoaded() ────────────────────────────────────────────────────────────────
// Distinguishes "resolved catalog" from "loader registered but not yet loaded".
console.log('isLoaded("en"):', i18n.isLoaded('en'))  // true
console.log('isLoaded("de"):', i18n.isLoaded('de'))  // false — not yet preloaded
console.log('isLoaded("fr"):', i18n.isLoaded('fr'))  // false — never configured

// Invalid BCP 47 tags throw — a typo'd locale is a bug, not a false
try {
  i18n.isLoaded('!!')
} catch (err) {
  console.log('isLoaded("!!"):', (err as Error).name)  // 'LinguaInvalidLocaleError'
}

// ── Conditional preload pattern ───────────────────────────────────────────────
if (!i18n.isLoaded('de')) await i18n.preload('de')

console.log('isLoaded("de") after preload:', i18n.isLoaded('de'))  // true

await i18n.setLocale('de')
console.log('greeting (de):', i18n.t('greeting'))  // 'Hallo'

// ── dispose() ─────────────────────────────────────────────────────────────────
// Useful for route-scoped fork instances — releases subscribers + catalog memory.
const routeI18n = i18n.fork({ locale: 'en' })
let notified = 0
routeI18n.subscribe(() => notified++)

// disposalSignal — AbortSignal aborted on disposal; tie external lifetimes here.
console.log('disposed before:', routeI18n.disposed)                  // false
console.log('signal aborted before:', routeI18n.disposalSignal.aborted)  // false

routeI18n.dispose()

console.log('disposed after:', routeI18n.disposed)                   // true
console.log('signal aborted after:', routeI18n.disposalSignal.aborted)   // true

// All state is cleared after disposal
console.log('after dispose — isLoaded("en"):', routeI18n.isLoaded('en'))  // false

// Post-dispose: register() throws LinguaDisposedError — consistent with all other mutation methods
try {
  routeI18n.register('en', { greeting: 'Hi' })
} catch (err) {
  console.log('register after dispose:', (err as Error).name)  // 'LinguaDisposedError'
}
console.log('subscribers notified after dispose:', notified)  // 0

// Post-dispose: setLocale() rejects with LinguaDisposedError
try {
  await routeI18n.setLocale('en')
} catch (err) {
  console.log('setLocale after dispose:', (err as Error).name)  // 'LinguaDisposedError'
}

// Post-dispose: t() falls back to onMissingKey for every key
console.log('t() after dispose:', routeI18n.t('greeting'))  // 'greeting' (key returned)

// dispose() is idempotent — calling twice is safe
routeI18n.dispose()
console.log('double dispose — no error')

// The parent instance is unaffected
console.log('parent still works:', i18n.t('greeting'))  // 'Hallo' (de)`,
  name: 'isLoaded(), dispose() — lifecycle management',
};
