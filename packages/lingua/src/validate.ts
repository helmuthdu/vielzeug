/**
 * /lingua/validate
 *
 * Build-time and CI catalog validation utilities.
 * Import from `@vielzeug/lingua/validate`.
 *
 * Not intended for production use — keep this entry out of your production bundle.
 *
 * @example
 * ```ts
 * import { validateCatalog } from '@vielzeug/lingua/validate';
 *
 * const warnings = validateCatalog({ inbox: { one: '...', other: '...' } }, 'ar');
 * // → warnings for 'zero', 'two', 'few', 'many' in Arabic
 * if (warnings.length > 0) throw new Error(`Missing plural forms:\n${JSON.stringify(warnings, null, 2)}`);
 * ```
 */

import type { Locale, Messages } from './i18n';

import { CLDR_FORMS, UNSAFE_KEYS } from './_constants';
import { parsePipePlural } from './template';

export type ValidationWarning = {
  form: string;
  key: string;
  locale: Locale;
};

/**
 * Returns the canonical CLDR plural forms expected for the given locale.
 * Uses `Intl.PluralRules#resolvedOptions().pluralCategories` — the authoritative source,
 * unlike heuristic sampling.
 */
function getExpectedPluralForms(locale: Locale): Set<string> {
  try {
    const { pluralCategories } = new Intl.PluralRules(locale).resolvedOptions() as {
      pluralCategories: string[];
    };

    return new Set(pluralCategories);
  } catch {
    return new Set(['one', 'other']);
  }
}

function findPluralBranches(messages: Messages, prefix = ''): Array<{ key: string; obj: Messages }> {
  const result: Array<{ key: string; obj: Messages }> = [];

  for (const [k, v] of Object.entries(messages)) {
    if (UNSAFE_KEYS.has(k)) continue;

    const fullKey = prefix ? `${prefix}.${k}` : k;

    if (typeof v === 'string') {
      // Expand pipe-plural shorthand so it can be validated like a nested plural branch.
      const expanded = parsePipePlural(v);

      if (expanded) result.push({ key: fullKey, obj: expanded });

      continue;
    }

    const obj = v as Messages;
    const childKeys = Object.keys(obj);

    if (childKeys.some((ck) => CLDR_FORMS.has(ck))) {
      result.push({ key: fullKey, obj });
    } else {
      result.push(...findPluralBranches(obj, fullKey));
    }
  }

  return result;
}

// Plural form values that typically reference the count (i.e. non-singleton forms).
// 'zero' and 'one' often intentionally omit {count} (e.g. 'No messages', 'One message').
const FORMS_EXPECTING_COUNT = new Set(['other', 'two', 'few', 'many']);

/**
 * Validates a catalog against the expected CLDR plural forms for the given locale.
 * Returns an array of warnings for:
 * 1. Plural branches missing one or more expected CLDR forms.
 * 2. Plural form templates for `other`, `two`, `few`, or `many` that do not interpolate
 *    `{count}` — since `count` is injected automatically by `tp()`, omitting it is almost
 *    always a catalog authoring error. Warnings for these use `form: '<form>:missing-count'`.
 *
 * Uses `Intl.PluralRules#resolvedOptions().pluralCategories` — the authoritative CLDR
 * category list, not heuristic sampling.
 *
 * @example
 * const warnings = validateCatalog({ inbox: { one: '...', other: '...' } }, 'ar');
 * // → warnings for missing 'zero', 'two', 'few', 'many' in Arabic
 */
export function validateCatalog(messages: Messages, locale: Locale): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const expectedForms = getExpectedPluralForms(locale);

  for (const { key, obj } of findPluralBranches(messages)) {
    for (const form of expectedForms) {
      if (!(form in obj)) {
        warnings.push({ form, key, locale });
      } else if (FORMS_EXPECTING_COUNT.has(form)) {
        const template = obj[form];

        if (typeof template === 'string' && !template.includes('{count}')) {
          warnings.push({ form: `${form}:missing-count`, key, locale });
        }
      }
    }
  }

  return warnings;
}
