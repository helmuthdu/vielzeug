// ─── Template helpers ─────────────────────────────────────────────────────────
// Shared by i18n.ts — extracted for navigability. Not part of the public API.

type Locale = string;
type TranslateVars = Record<string, unknown>;

interface Messages {
  [key: string]: string | Messages;
}

// ─── Pipe-plural shorthand (F1) ───────────────────────────────────────────────
// A leaf string containing '|' is parsed as a pipe-delimited plural shorthand.
// Supported part counts and their form mappings (positional, left-to-right):
//   2 parts → one | other
//   3 parts → zero | one | other
//   6 parts → zero | one | two | few | many | other
// Any other part count is treated as a plain string with no expansion.

const PIPE_FORM_MAPS: Readonly<Partial<Record<number, readonly string[]>>> = {
  2: ['one', 'other'],
  3: ['zero', 'one', 'other'],
  6: ['zero', 'one', 'two', 'few', 'many', 'other'],
};

export function parsePipePlural(value: string): Messages | null {
  const pipeIdx = value.indexOf('|');

  if (pipeIdx === -1) return null;

  const parts = value.split('|');
  const forms = PIPE_FORM_MAPS[parts.length];

  if (!forms) return null;

  // An empty part is almost certainly a catalog authoring error.
  // Treat the whole value as a plain string rather than silently producing an empty form.
  if (parts.some((p) => p.trim() === '')) return null;

  const result: Messages = {};

  for (let i = 0; i < parts.length; i++) {
    result[forms[i]] = parts[i];
  }

  return result;
}

// ─── Template compilation ─────────────────────────────────────────────────────
// When `compile: true` is passed in I18nOptions, message strings are parsed once
// into a pre-compiled form: an array of static strings and variable names.
// Rendering a compiled template skips the regex entirely.

type TemplatePart = string | { var: string };
export type CompiledTemplate = TemplatePart[];

export const INTERPOLATION_PATTERN = /\{([\p{ID_Continue}-]+)\}/gu;

export function compileTemplate(template: string): CompiledTemplate {
  const parts: CompiledTemplate = [];
  let lastIndex = 0;

  for (const match of template.matchAll(INTERPOLATION_PATTERN)) {
    const { index } = match;
    const start = index ?? 0;

    if (start > lastIndex) {
      parts.push(template.slice(lastIndex, start));
    }

    parts.push({ var: match[1] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return parts;
}

export function renderTemplate(
  parts: CompiledTemplate,
  vars: TranslateVars | undefined,
  key: string,
  locale: Locale,
  onMissingVar: (varName: string, key: string, locale: Locale) => string,
): string {
  let result = '';

  for (const part of parts) {
    if (typeof part === 'string') {
      result += part;
    } else {
      const value = vars?.[part.var];

      result += value == null ? onMissingVar(part.var, key, locale) : String(value);
    }
  }

  return result;
}
