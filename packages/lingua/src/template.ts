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

/**
 * Segmented interpolation (`ti()`): render a compiled template to a mixed array of
 * string segments and typed replacement values, for embedding non-string content
 * (components, elements) inside translated text. Same missing-var contract as
 * `renderTemplate` — a missing var yields the `onMissingVar` string segment.
 * Empty string segments are omitted.
 *
 * Deliberate divergence from `renderTemplate`: `t()` treats `null` vars as missing,
 * while `ti()` embeds `null` as a provided value — `null` is a meaningful renderable
 * in component frameworks (React renders it as nothing), so it is not an absence.
 */
export function renderTemplateSegments<V>(
  parts: CompiledTemplate,
  vars: Record<string, V> | undefined,
  key: string,
  locale: Locale,
  onMissingVar: (varName: string, key: string, locale: Locale) => string,
): Array<string | V> {
  const segments: Array<string | V> = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      if (part !== '') segments.push(part);
    } else {
      const value = vars?.[part.var];

      segments.push(value === undefined ? onMissingVar(part.var, key, locale) : value);
    }
  }

  return segments;
}
