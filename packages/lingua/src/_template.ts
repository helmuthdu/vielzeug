import type { Part } from './types';

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

export function renderText(
  parts: Template,
  values: Record<string, unknown>,
  missing: (name: string) => string,
): string {
  return parts
    .map((part) => {
      if (typeof part === 'string') return part;

      const value = Object.hasOwn(values, part.value) ? values[part.value] : undefined;

      return value == null ? missing(part.value) : String(value);
    })
    .join('');
}

export function renderParts<V>(
  parts: Template,
  values: Record<string, V | number>,
  missing: (name: string) => string,
): Array<Part<V | number>> {
  const result: Array<Part<V | number>> = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      if (part !== '') result.push({ type: 'text', value: part });

      continue;
    }

    if (Object.hasOwn(values, part.value)) {
      result.push({ type: 'value', value: values[part.value]! as V | number });
    } else {
      result.push({ type: 'text', value: missing(part.value) });
    }
  }

  return result;
}
