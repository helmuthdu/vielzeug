// ─── Template compilation ─────────────────────────────────────────────────────
// Message strings are parsed once at registration time into a pre-compiled form:
// an array of static strings and variable names. Rendering a compiled template
// skips the regex entirely. Not part of the public API.

import type { Locale } from './_catalog';

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
  vars: Record<string, unknown> | undefined,
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
