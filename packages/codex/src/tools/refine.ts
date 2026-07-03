import type { CemAttribute, CemDeclaration } from '../types.js';

import { ToolError } from '../errors.js';
import { parseArgs, type ToolSchema } from './schema.js';
import { text, type ToolContext, type ToolDefinition } from './shared.js';

// Every tool in this file is refine-specific — named with a `refine-` prefix so the
// tool list itself signals which tools are generic (packages.ts) vs. bound to one
// package's structured component metadata (this file). Backed by the real Custom
// Elements Manifest generated from refine's build output — never hand-duplicated data,
// so it can't drift the way the old ore-directives/spell-validators/sandbox tools did.

const REFINE_UNAVAILABLE =
  'Refine component metadata is unavailable in this snapshot. If using the monorepo, build /refine first then run prepare:data. Published releases include this data automatically.';

/** Every refine tool needs at least one bundled component; throws UNAVAILABLE otherwise. */
function requireAnyComponent(context: ToolContext): CemDeclaration[] {
  if (context.refineComponents.length === 0) throw new ToolError('UNAVAILABLE', REFINE_UNAVAILABLE);

  return context.refineComponents;
}

/** Resolves one component by tag name, or throws UNAVAILABLE/NOT_FOUND. */
function requireComponent(context: ToolContext, tagName: string): CemDeclaration {
  const components = requireAnyComponent(context);
  const decl = components.find((d) => d.tagName === tagName);

  if (!decl) {
    throw new ToolError(
      'NOT_FOUND',
      `Component "${tagName}" not found. Available tags: ${context.refineComponentTags.join(', ')}`,
    );
  }

  return decl;
}

// ---------------------------------------------------------------------------
// refine-list-components
// ---------------------------------------------------------------------------

const listComponentsSchema = { properties: {}, type: 'object' } satisfies ToolSchema;

export const listComponentsTool: ToolDefinition = {
  description:
    'List all @vielzeug/refine web component tags from bundled Custom Elements Manifest (CEM) metadata. Returns a JSON array with tagName, description, and attrs (name, type, default). Use this to discover available components before calling refine-get-component for full details. Returns isError if refine was not built before data generation.',
  inputSchema: listComponentsSchema,
  name: 'refine-list-components',
  run(_args, context) {
    const components = requireAnyComponent(context);

    const tags = components
      .filter((d) => d.tagName)
      .map((d) => ({
        attrs: (d.attributes ?? []).map((a) => ({
          name: a.name,
          type: a.type?.text ?? 'string',
          ...(a.default !== undefined && { default: a.default }),
        })),
        description: d.description ?? '',
        tagName: d.tagName,
      }));

    return text(JSON.stringify(tags, null, 2));
  },
};

// ---------------------------------------------------------------------------
// refine-get-component
// ---------------------------------------------------------------------------

const getComponentSchema = {
  properties: {
    tagName: {
      description: 'HTML custom element tag, e.g. "ore-button"',
      maxLength: 100,
      minLength: 1,
      type: 'string',
    },
  },
  required: ['tagName'],
  type: 'object',
} satisfies ToolSchema;

export const getComponentTool: ToolDefinition = {
  description:
    'Get the full Custom Elements Manifest (CEM) declaration for a single @vielzeug/refine component by its HTML tag name (e.g. "ore-button"). Returns a JSON object with attributes, events, slots, CSS parts, CSS properties, and member methods. Call refine-list-components first to get valid tag names.',
  inputSchema: getComponentSchema,
  name: 'refine-get-component',
  run(args, context) {
    const { tagName } = parseArgs(getComponentSchema, args);
    const declaration = requireComponent(context, tagName);

    return text(JSON.stringify(declaration, null, 2));
  },
};

// ---------------------------------------------------------------------------
// refine-generate-template helpers
// ---------------------------------------------------------------------------

function attributeSnippet(attr: CemAttribute): string {
  const typeText = attr.type?.text ?? '';

  if (typeText === 'boolean') return attr.name;

  // Literal union e.g. 'primary' | 'secondary' — use the first literal
  const firstLiteral = /^['"](\S+?)['"]/.exec(typeText);

  if (firstLiteral) return `${attr.name}="${firstLiteral[1]}"`;

  if (attr.default !== undefined && attr.default !== 'undefined' && attr.default !== '')
    return `${attr.name}="${attr.default}"`;

  return `${attr.name}=""`;
}

function buildTemplate(decl: CemDeclaration, scenario: string | undefined): string {
  const tag = decl.tagName ?? '';
  const attrs = decl.attributes ?? [];
  const slots = decl.slots ?? [];
  const events = decl.events ?? [];

  const primary = attrs.filter((a) => a.default === undefined);
  const optional = attrs.filter((a) => a.default !== undefined);

  let attrStr = '';

  for (const a of primary) attrStr += `\n  ${attributeSnippet(a)}`;

  const namedSlots = slots.filter((s) => s.name && s.name !== '');
  const hasDefaultSlot = slots.length === 0 || slots.some((s) => !s.name || s.name === '');

  let inner = '';

  for (const s of namedSlots) inner += `\n  <span slot="${s.name}">${s.description ?? s.name}</span>`;

  if (hasDefaultSlot) inner += '\n  Content goes here';

  let comments = '';

  if (optional.length > 0) {
    comments += '\n  <!-- Optional attributes:';
    for (const a of optional) comments += `\n    ${attributeSnippet(a)}  (default: ${a.default ?? 'unset'})`;
    comments += '\n  -->';
  }

  if (events.length > 0) {
    comments += `\n  <!-- Events: ${events.map((e) => e.name).join(', ')} -->`;
  }

  const header = scenario ? `<!-- ${scenario} -->\n` : '';

  return `${header}<${tag}${attrStr}>${comments}${inner ? inner + '\n' : ''}</${tag}>`;
}

// ---------------------------------------------------------------------------
// refine-generate-template
// ---------------------------------------------------------------------------

const generateTemplateSchema = {
  properties: {
    scenario: {
      default: '',
      description: 'Optional usage context to include as a leading comment, e.g. "primary call-to-action button"',
      maxLength: 200,
      type: 'string',
    },
    tagName: {
      description: 'HTML custom element tag, e.g. "ore-button"',
      maxLength: 100,
      minLength: 1,
      type: 'string',
    },
  },
  required: ['tagName'],
  type: 'object',
} satisfies ToolSchema;

export const generateTemplateTool: ToolDefinition = {
  description:
    'Generate a ready-to-use HTML template for a @vielzeug/refine component. Returns a snippet with required attributes filled with type-appropriate placeholders, optional attributes in a comment block, and all named slots scaffolded. Use this as the starting point for AI-generated declarative UI — avoids hallucinated attribute names. Call refine-list-components first to get valid tag names.',
  inputSchema: generateTemplateSchema,
  name: 'refine-generate-template',
  run(args, context) {
    const { scenario, tagName } = parseArgs(generateTemplateSchema, args);
    const decl = requireComponent(context, tagName);

    return text(buildTemplate(decl, scenario || undefined));
  },
};

// ---------------------------------------------------------------------------
// refine-get-tokens
// ---------------------------------------------------------------------------

const getTokensSchema = {
  properties: {
    filter: {
      default: '',
      description: 'Optional prefix to filter token names, e.g. "--refine-color". Case-insensitive.',
      maxLength: 100,
      type: 'string',
    },
  },
  type: 'object',
} satisfies ToolSchema;

export const getTokensTool: ToolDefinition = {
  description:
    'List all CSS custom properties (design tokens) exposed by @vielzeug/refine components. Returns a JSON array of { name, description, default, component } objects sorted by name. Pass an optional filter prefix (e.g. "--refine-color") to narrow results. Use when generating dynamic themes or inline styles in AI-driven UI.',
  inputSchema: getTokensSchema,
  name: 'refine-get-tokens',
  run(args, context) {
    const { filter } = parseArgs(getTokensSchema, args);
    const components = requireAnyComponent(context);

    const rawFilter = filter.toLowerCase();
    // Components are iterated in stable bundled order (the order refine's CEM manifest declares
    // them in), so first-seen-wins below is deterministic run-to-run, not arbitrary. Shared design
    // tokens (e.g. "--refine-color-primary") are typically declared identically on every component
    // that uses them, so keeping the first occurrence and dropping later duplicates is harmless in
    // the common case. If two components ever document the *same* token name with genuinely
    // different descriptions/defaults, only the first-encountered one is returned here — that's an
    // intentional simplification (one row per token name, not per component), not a bug.
    const seen = new Set<string>();
    const tokens: { component: string; default?: string; description?: string; name: string }[] = [];

    for (const decl of components) {
      const componentId = decl.tagName ?? decl.name ?? 'unknown';

      for (const prop of decl.cssProperties ?? []) {
        if (!prop.name || seen.has(prop.name)) continue;

        if (rawFilter && !prop.name.toLowerCase().startsWith(rawFilter)) continue;

        seen.add(prop.name);
        tokens.push({
          component: componentId,
          ...(prop.default !== undefined && { default: prop.default }),
          ...(prop.description && { description: prop.description }),
          name: prop.name,
        });
      }
    }

    tokens.sort((a, b) => a.name.localeCompare(b.name));

    return text(JSON.stringify(tokens, null, 2));
  },
};

// ---------------------------------------------------------------------------
// refine-validate-usage helpers
//
// Regex-based, deliberately — this validates a single AI-generated custom-element usage
// snippet (one tag + attributes + slots), not arbitrary HTML documents. A real HTML parser
// would be more correct for pathological input (attribute values containing raw `>`) but
// adds a runtime dependency for a narrow, already-adequate check; not worth it here.
// ---------------------------------------------------------------------------

const SAFE_HTML_ATTRS = new Set([
  'class',
  'contenteditable',
  'dir',
  'draggable',
  'exportparts',
  'hidden',
  'id',
  'lang',
  'part',
  'slot',
  'style',
  'tabindex',
  'title',
]);
const SAFE_ATTR_PREFIXES = ['aria-', 'data-', 'on'];

/** Escapes regex metacharacters so a string can be safely interpolated into a `new RegExp(...)` pattern. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseTagAttributes(html: string, tagName: string): Map<string, string> | null {
  // `tagName` is always resolved through `requireComponent` first (a fixed, real-component-tag
  // allowlist — see every caller below), so it can never actually carry regex metacharacters or
  // attacker-controlled content today. Escaping it here is defense-in-depth, not a fix for a
  // currently-reachable exploit: it keeps this function safe to call with untrusted input on its
  // own terms, independent of what its current callers happen to guarantee.
  const pattern = new RegExp(`<${escapeRegExp(tagName)}((?:\\s[^>]*)?)(?:>|/>)`, 'i');
  const match = pattern.exec(html);

  if (!match) return null;

  const attrStr = match[1] ?? '';
  const result = new Map<string, string>();
  const attrRe = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]*)))?/g;
  let m: RegExpExecArray | null;

  while ((m = attrRe.exec(attrStr)) !== null) {
    const [, name, dq, sq, bare] = m;

    if (name) result.set(name.toLowerCase(), dq ?? sq ?? bare ?? '');
  }

  return result;
}

function parseSlotNames(html: string): string[] {
  const slots: string[] = [];
  const re = /\bslot=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    if (m[1]) slots.push(m[1]);
  }

  return slots;
}

// ---------------------------------------------------------------------------
// refine-validate-usage
// ---------------------------------------------------------------------------

const validateUsageSchema = {
  properties: {
    html: {
      description: 'HTML fragment containing the component usage to validate (max 5000 chars)',
      maxLength: 5_000,
      minLength: 1,
      type: 'string',
    },
    tagName: {
      description: 'HTML custom element tag to validate against, e.g. "ore-button"',
      maxLength: 100,
      minLength: 1,
      type: 'string',
    },
  },
  required: ['html', 'tagName'],
  type: 'object',
} satisfies ToolSchema;

export const validateUsageTool: ToolDefinition = {
  description:
    'Validate AI-generated HTML against a @vielzeug/refine component spec. Checks for unknown attributes and unrecognised slot names. Returns a JSON array of { type, message } objects — an empty array means the usage is valid. Use this to close the generate → validate → fix loop before rendering.',
  inputSchema: validateUsageSchema,
  name: 'refine-validate-usage',
  run(args, context) {
    const { html, tagName } = parseArgs(validateUsageSchema, args);
    const decl = requireComponent(context, tagName);

    const issues: { message: string; type: 'error' | 'warning' }[] = [];
    const knownAttrs = new Set((decl.attributes ?? []).map((a) => a.name.toLowerCase()));
    const knownSlots = new Set((decl.slots ?? []).map((s) => s.name).filter(Boolean) as string[]);

    const foundAttrs = parseTagAttributes(html, tagName);

    if (!foundAttrs) {
      issues.push({ message: `Could not find opening <${tagName}> tag in the provided HTML.`, type: 'error' });
    } else {
      for (const attr of foundAttrs.keys()) {
        if (SAFE_HTML_ATTRS.has(attr)) continue;

        if (SAFE_ATTR_PREFIXES.some((p) => attr.startsWith(p))) continue;

        if (!knownAttrs.has(attr)) {
          issues.push({
            message: `Unknown attribute "${attr}" on <${tagName}>. Known: ${[...knownAttrs].join(', ') || 'none'}.`,
            type: 'error',
          });
        }
      }
    }

    if (knownSlots.size > 0) {
      for (const slot of parseSlotNames(html)) {
        if (!knownSlots.has(slot)) {
          issues.push({
            message: `Unknown slot "${slot}" on <${tagName}>. Known slots: ${[...knownSlots].join(', ')}.`,
            type: 'error',
          });
        }
      }
    }

    return text(JSON.stringify(issues, null, 2));
  },
};

export const refineTools: ToolDefinition[] = [
  listComponentsTool,
  getComponentTool,
  generateTemplateTool,
  getTokensTool,
  validateUsageTool,
];
