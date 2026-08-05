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

export function renderSegments<V>(
  parts: Template,
  values: Record<string, V | number>,
  missing: (name: string) => string,
): Array<string | number | V> {
  const result: Array<string | number | V> = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      if (part !== '') result.push(part);

      continue;
    }

    result.push(Object.hasOwn(values, part.value) ? values[part.value]! : missing(part.value));
  }

  return result;
}
