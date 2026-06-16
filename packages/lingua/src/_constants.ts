// Shared constants used by both i18n.ts and validate.ts.
// Not part of the public API — internal module only.

export const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const CLDR_FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
