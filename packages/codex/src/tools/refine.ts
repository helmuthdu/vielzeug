import type { Catalog } from '../catalog.js';
import { EMPTY_SCHEMA, parseArgs, type ToolSchema } from './schema.js';
import type { ToolDefinition } from './shared.js';

const tag = {
  additionalProperties: false,
  properties: { tagName: { description: 'Custom element tag', maxLength: 100, minLength: 1, type: 'string' } },
  required: ['tagName'],
  type: 'object',
} satisfies ToolSchema;
const tokenFilter = {
  additionalProperties: false,
  properties: { filter: { default: '', description: 'Optional token prefix', maxLength: 100, type: 'string' } },
  type: 'object',
} satisfies ToolSchema;
const usage = {
  additionalProperties: false,
  properties: { html: { description: 'Component HTML fragment', maxLength: 5000, minLength: 1, type: 'string' } },
  required: ['html'],
  type: 'object',
} satisfies ToolSchema;

/** Attributes every element accepts from the platform or ARIA, never flagged as unknown. */
const SAFE_ATTRIBUTES = new Set([
  'accesskey',
  'autocapitalize',
  'autofocus',
  'class',
  'contenteditable',
  'dir',
  'draggable',
  'enterkeyhint',
  'exportparts',
  'hidden',
  'id',
  'inert',
  'inputmode',
  'is',
  'itemid',
  'itemprop',
  'itemref',
  'itemscope',
  'itemtype',
  'lang',
  'nonce',
  'part',
  'popover',
  'role',
  'slot',
  'spellcheck',
  'style',
  'tabindex',
  'title',
  'translate',
]);

/** Parse the opening tags of `ore-*` custom elements: tag name plus [name, value|null] pairs. */
function parseOpeningTags(html: string): Array<{ attributes: [string, string | null][]; tag: string }> {
  const tags: Array<{ attributes: [string, string | null][]; tag: string }> = [];

  for (const match of html.matchAll(/<(ore-[\w-]+)((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const attributes: [string, string | null][] = [];

    for (const attr of match[2].matchAll(/([\w:@][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+)))?/g)) {
      attributes.push([attr[1].toLowerCase(), attr[2] ?? attr[3] ?? attr[4] ?? null]);
    }
    tags.push({ attributes, tag: match[1].toLowerCase() });
  }

  return tags;
}

/** The literal members of a CEM union type (`'a' | 'b'`), or null when it is not a closed set. */
function enumValues(type: string | undefined): string[] | null {
  if (!type) return null;
  const literals = [...type.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2]);

  return literals.length > 0 && /^[\s|]*$/.test(type.replaceAll(/'[^']*'|"[^"]*"/g, '')) ? literals : null;
}

function validateFragment(catalog: Catalog, html: string) {
  const issues: Array<{ message: string; tag: string; type: 'error' }> = [];

  for (const opening of parseOpeningTags(html)) {
    const component = catalog.components.find((item) => item.tag === opening.tag);

    if (!component) {
      issues.push({
        message: `Unknown component <${opening.tag}>. Run refine-list-components for the tag list.`,
        tag: opening.tag,
        type: 'error',
      });
      continue;
    }

    const known = new Map((component.attributes ?? []).map((attr) => [attr.name.toLowerCase(), attr]));

    for (const [name, value] of opening.attributes) {
      if (SAFE_ATTRIBUTES.has(name) || name.startsWith('aria-') || name.startsWith('data-')) continue;

      const attr = known.get(name);

      if (!attr) {
        issues.push({ message: `Unknown attribute "${name}" on <${opening.tag}>.`, tag: opening.tag, type: 'error' });
        continue;
      }
      if (value === null || attr.type === undefined) continue;
      // Boolean attributes accept presence, an empty value, or the name itself.
      if (/\bboolean\b/i.test(attr.type)) continue;

      const allowed = enumValues(attr.type);

      // An enum attribute with a CEM default accepts an empty value as "use the default".
      if (allowed && !allowed.includes(value) && !(value === '' && attr.default !== undefined))
        issues.push({
          message: `Value "${value}" is not valid for "${name}" on <${opening.tag}>. Allowed: ${allowed.join(', ')}.`,
          tag: opening.tag,
          type: 'error',
        });
    }
  }

  return issues;
}

export const refineTools: readonly ToolDefinition[] = [
  {
    description: 'List bundled Refine component tags and descriptions.',
    execute: (_args, catalog) =>
      catalog.components.map((component) => ({ description: component.summary ?? '', tagName: component.tag })),
    inputSchema: EMPTY_SCHEMA,
    name: 'refine-list-components',
  },
  {
    description: 'Read one Refine component declaration.',
    execute: (args, catalog) => catalog.getComponent(parseArgs(tag, args).tagName),
    inputSchema: tag,
    name: 'refine-get-component',
  },
  {
    description: 'List Refine theme tokens (custom properties from theme.css) with values and notes.',
    execute: (args, catalog) => {
      const filter = parseArgs(tokenFilter, args).filter.toLowerCase();

      return catalog.tokens.filter((token) => !filter || token.name.toLowerCase().startsWith(filter));
    },
    inputSchema: tokenFilter,
    name: 'refine-get-tokens',
  },
  {
    description:
      "Validate a Refine HTML fragment: unknown ore-* tags, unknown attributes, and values outside each attribute's allowed set, across every opening tag.",
    execute: (args, catalog) => validateFragment(catalog, parseArgs(usage, args).html),
    inputSchema: usage,
    name: 'refine-validate-usage',
  },
];
