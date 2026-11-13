import type { Segment } from './types';

export type TemplatePart = string | { readonly value: string };
export type Template = readonly TemplatePart[];

const interpolation = /\{([\p{ID_Continue}-]+)\}/gu;

export function compileTemplate(value: string): Template {
  const parts: TemplatePart[] = [];
  let offset = 0;

  for (const match of value.matchAll(interpolation)) {
    const index = match.index ?? 0;

    if (index > offset) parts.push(value.slice(offset, index));

    parts.push({ value: match[1] });
    offset = index + match[0].length;
  }

  if (offset < value.length) parts.push(value.slice(offset));

  return parts;
}

/**
 * The single resolution walk shared by `translate()` and `parts()`: a nullish value (missing
 * or `null`/`undefined`) resolves through `missing` as text; every other value reaches
 * `onValue` untouched. One walk keeps the string and segment paths semantically identical
 * while letting `renderText` accumulate without allocating per-part segment objects.
 */
function eachPart(
  template: Template,
  values: Record<string, unknown>,
  missing: (name: string) => string,
  onText: (text: string) => void,
  onValue: (name: string, value: unknown) => void,
): void {
  for (const part of template) {
    if (typeof part === 'string') {
      onText(part);

      continue;
    }

    const value = Object.hasOwn(values, part.value) ? values[part.value] : undefined;

    if (value == null) onText(missing(part.value));
    else onValue(part.value, value);
  }
}

/** Text segments are never empty (`compileTemplate` only records non-empty runs); value segments may hold `''`. */
export function renderSegments<V>(
  template: Template,
  values: Record<string, unknown>,
  missing: (name: string) => string,
): readonly Segment<V>[] {
  const segments: Segment<V>[] = [];

  eachPart(
    template,
    values,
    missing,
    (text) => segments.push({ type: 'text', value: text }),
    (name, value) => segments.push({ name, type: 'value', value: value as V }),
  );

  return segments;
}

export function renderText(
  template: Template,
  values: Record<string, unknown>,
  missing: (name: string) => string,
): string {
  let out = '';

  eachPart(
    template,
    values,
    missing,
    (text) => {
      out += text;
    },
    (_name, value) => {
      out += String(value);
    },
  );

  return out;
}
