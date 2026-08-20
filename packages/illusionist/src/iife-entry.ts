// IIFE-only entry point for the REPL sandbox. Re-exports the root API plus locale
// objects so `window.Illusionist` includes `en` and `de` alongside `createIllusion`.
// The tree-shakeable ESM/CJS builds use src/index.ts, which deliberately does NOT
// import locale data — this entry exists solely so the REPL's single IIFE global
// has everything examples need without a separate subpath load.

export * from './index';
export { de } from './locales/de';
export { en } from './locales/en';
