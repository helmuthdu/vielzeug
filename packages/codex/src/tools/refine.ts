import type { CemAttribute, CemDeclaration } from '../types.js';
import { parseArgs, type ToolSchema } from './schema.js';
import type { ToolDefinition } from './shared.js';

const tag = {
  properties: { tagName: { description: 'Custom element tag', maxLength: 100, minLength: 1, type: 'string' } },
  required: ['tagName'],
  type: 'object',
} satisfies ToolSchema;
const template = {
  properties: {
    scenario: { default: '', description: 'Optional scenario label', maxLength: 200, type: 'string' },
    tagName: tag.properties.tagName,
  },
  required: ['tagName'],
  type: 'object',
} satisfies ToolSchema;
const tokenFilter = {
  properties: { filter: { default: '', description: 'Optional token prefix', maxLength: 100, type: 'string' } },
  type: 'object',
} satisfies ToolSchema;
const usage = {
  properties: {
    html: { description: 'Component HTML fragment', maxLength: 5000, minLength: 1, type: 'string' },
    tagName: tag.properties.tagName,
  },
  required: ['html', 'tagName'],
  type: 'object',
} satisfies ToolSchema;

function attribute(attr: CemAttribute): string {
  if (attr.type?.text === 'boolean') return attr.name;

  if (attr.default !== undefined) return `${attr.name}="${attr.default}"`;

  return `${attr.name}=""`;
}

function htmlTemplate(component: CemDeclaration, scenario: string): string {
  const name = component.tagName ?? '';
  const attributes = (component.attributes ?? []).filter((item) => item.default === undefined).map(attribute);
  const slots = (component.slots ?? [])
    .filter((slot) => slot.name)
    .map((slot) => `  <span slot="${slot.name}">${slot.description ?? slot.name}</span>`);
  const body = slots.length > 0 ? `\n${slots.join('\n')}\n` : '\n  Content\n';

  return `${scenario ? `<!-- ${scenario} -->\n` : ''}<${name}${attributes.length ? `\n  ${attributes.join('\n  ')}` : ''}>${body}</${name}>`;
}

function usageIssues(component: CemDeclaration, html: string): Array<{ message: string; type: 'error' }> {
  const name = component.tagName ?? '';
  const opening = new RegExp(`<${name}\\s*([^>]*)>`, 'i').exec(html);

  if (!opening) return [{ message: `Could not find opening <${name}> tag.`, type: 'error' }];

  const known = new Set((component.attributes ?? []).map((attribute) => attribute.name.toLowerCase()));
  const safe = new Set(['class', 'id', 'slot', 'style', 'title', 'hidden', 'part']);
  const issues: Array<{ message: string; type: 'error' }> = [];

  for (const match of opening[1].matchAll(/([\w-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s/>]+))?/g)) {
    const attribute = match[1].toLowerCase();

    if (
      !safe.has(attribute) &&
      !attribute.startsWith('aria-') &&
      !attribute.startsWith('data-') &&
      !known.has(attribute)
    ) {
      issues.push({ message: `Unknown attribute "${attribute}" on <${name}>.`, type: 'error' });
    }
  }

  return issues;
}

export const refineTools: ToolDefinition[] = [
  {
    description: 'List bundled Refine web components.',
    execute: (_args, catalog) =>
      catalog
        .listComponents()
        .filter((component) => component.tagName)
        .map((component) => ({
          attributes: component.attributes ?? [],
          description: component.description ?? '',
          tagName: component.tagName,
        })),
    inputSchema: { properties: {}, type: 'object' },
    name: 'refine-list-components',
  },
  {
    description: 'Read one Refine component declaration.',
    execute: (args, catalog) => catalog.getComponent(parseArgs(tag, args).tagName),
    inputSchema: tag,
    name: 'refine-get-component',
  },
  {
    description: 'Generate a minimal Refine component HTML template.',
    execute: (args, catalog) => {
      const input = parseArgs(template, args);

      return htmlTemplate(catalog.getComponent(input.tagName), input.scenario);
    },
    inputSchema: template,
    name: 'refine-generate-template',
  },
  {
    description: 'List bundled Refine CSS custom properties.',
    execute: (args, catalog) => {
      const filter = parseArgs(tokenFilter, args).filter.toLowerCase();
      const tokens = new Map<string, { component: string; default?: string; description?: string; name: string }>();

      for (const component of catalog.listComponents())
        for (const property of component.cssProperties ?? []) {
          if (
            property.name &&
            !tokens.has(property.name) &&
            (!filter || property.name.toLowerCase().startsWith(filter))
          )
            tokens.set(property.name, {
              component: component.tagName ?? component.name ?? 'unknown',
              ...(property.default !== undefined && { default: property.default }),
              ...(property.description && { description: property.description }),
              name: property.name,
            });
        }

      return [...tokens.values()].sort((left, right) => left.name.localeCompare(right.name));
    },
    inputSchema: tokenFilter,
    name: 'refine-get-tokens',
  },
  {
    description: 'Validate unknown attributes in one Refine component HTML fragment.',
    execute: (args, catalog) => {
      const input = parseArgs(usage, args);

      return usageIssues(catalog.getComponent(input.tagName), input.html);
    },
    inputSchema: usage,
    name: 'refine-validate-usage',
  },
];
