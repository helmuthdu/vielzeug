import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';

import { log } from './_log.js';
import { packageMeta } from './data.js';
import { ToolArgError } from './errors.js';
import { normalisePackage, scorePackage } from './search.js';
import { type BundledData, type BundledPackage, type CemAttribute, type CemDeclaration, DOC_PAGES } from './types.js';

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

function text(value: string): CallToolResult {
  return { content: [{ text: value, type: 'text' }] };
}

function error(message: string): CallToolResult {
  return { content: [{ text: message, type: 'text' }], isError: true };
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const MAX_ARG_LENGTH = 500;

/** Validates and returns an optional enum arg, falling back to the provided default. Throws ToolArgError on invalid value. */
function optionalEnum<T extends string>(
  args: Record<string, unknown>,
  key: string,
  values: readonly T[],
  fallback: T,
): T {
  const raw = args[key];

  if (raw === undefined || raw === '') return fallback;

  if (typeof raw !== 'string' || !(values as readonly string[]).includes(raw))
    throw new ToolArgError(`${key}: must be one of ${values.join(', ')}.`);

  return raw as T;
}

/** Validates a string arg: trims, checks presence and max length. Throws ToolArgError on failure. */
function requireStr(args: Record<string, unknown>, key: string): string {
  const value = args[key];

  if (typeof value !== 'string' || value.trim().length === 0)
    throw new ToolArgError(`${key}: required non-empty string.`);

  const trimmed = value.trim();

  if (trimmed.length > MAX_ARG_LENGTH)
    throw new ToolArgError(`${key}: exceeds ${MAX_ARG_LENGTH} character limit. Shorten the value.`);

  return trimmed;
}

// ---------------------------------------------------------------------------
// Context — pre-computed once from BundledData, shared across all server instances
// ---------------------------------------------------------------------------

export interface ToolContext {
  bySlug: Map<string, BundledPackage>;
  /** Null when /refine was not built before data generation. */
  components: CemDeclaration[] | null;
  /** Pre-filtered tag names from components, or null when components unavailable. */
  componentTags: string[] | null;
  normalisedPackages: ReturnType<typeof normalisePackage>[];
}

export function buildToolContext(data: BundledData): ToolContext {
  const refinePkg = data.packages.find((p) => p.slug === 'refine');
  const components = refinePkg && refinePkg.components.length > 0 ? refinePkg.components : null;

  return {
    bySlug: new Map(data.packages.map((pkg) => [pkg.slug, pkg])),
    components,
    componentTags: components?.filter((d) => d.tagName).map((d) => d.tagName as string) ?? null,
    normalisedPackages: data.packages.map(normalisePackage),
  };
}

function knownSlugs(context: ToolContext): string {
  return [...context.bySlug.keys()].join(', ');
}

// ---------------------------------------------------------------------------
// Tool definition shape
// ---------------------------------------------------------------------------

interface ToolDefinition {
  description: string;
  inputSchema: Tool['inputSchema'];
  name: string;
  run: (args: Record<string, unknown>, context: ToolContext) => CallToolResult;
}

// ---------------------------------------------------------------------------
// Tools — schema and handler collocated
// ---------------------------------------------------------------------------

// --- list-packages ---

const listPackagesTool: ToolDefinition = {
  description:
    'List all vielzeug packages with metadata (version, description, category, keywords, exports, availableDocPages, hasSource). Returns a JSON array of PackageMeta objects sorted by slug. Use this tool first to discover available packages, then call get-package for a single package, get-docs for docs, or get-source for source.',
  inputSchema: { properties: {}, type: 'object' },
  name: 'list-packages',
  run(_args, context) {
    return text(JSON.stringify([...context.bySlug.values()].map(packageMeta), null, 2));
  },
};

// --- get-package ---

const getPackageTool: ToolDefinition = {
  description:
    'Get metadata for a single vielzeug package by slug. Returns a PackageMeta object with version, description, category, keywords, exports, availableDocPages, and hasSource. Use list-packages first to discover available slugs.',
  inputSchema: {
    properties: {
      packageSlug: { description: 'Package folder name, e.g. "ripple"', minLength: 1, type: 'string' },
    },
    required: ['packageSlug'],
    type: 'object',
  },
  name: 'get-package',
  run(args, context) {
    const slug = requireStr(args, 'packageSlug');
    const pkg = context.bySlug.get(slug);

    if (!pkg) return error(`Package "${slug}" not found. Available slugs: ${knownSlugs(context)}`);

    return text(JSON.stringify(packageMeta(pkg), null, 2));
  },
};

// --- get-docs ---

const getDocsTool: ToolDefinition = {
  description:
    'Read a documentation page for a vielzeug package. Returns Markdown text. page defaults to "index" (overview + quick start). Use "api" for full API reference, "usage" for how-to guide, "examples" for recipe index. Check availableDocPages from list-packages before requesting a specific page.',
  inputSchema: {
    properties: {
      packageSlug: { description: 'Package folder name, e.g. "ripple"', minLength: 1, type: 'string' },
      page: { description: 'Doc page to read (defaults to "index")', enum: [...DOC_PAGES], type: 'string' },
    },
    required: ['packageSlug'],
    type: 'object',
  },
  name: 'get-docs',
  run(args, context) {
    const slug = requireStr(args, 'packageSlug');
    const pkg = context.bySlug.get(slug);

    if (!pkg) return error(`Package "${slug}" not found. Available slugs: ${knownSlugs(context)}`);

    const page = optionalEnum(args, 'page', DOC_PAGES, 'index');
    const content = pkg.docs[page];

    if (!content) {
      return error(`No "${page}" page for "${slug}". Available: ${pkg.availableDocPages.join(', ') || 'none'}.`);
    }

    return text(content);
  },
};

// --- get-source ---

const getSourceTool: ToolDefinition = {
  description:
    'Read the full src/index.ts source of a vielzeug package. Returns TypeScript text with all exported function signatures, types, and JSDoc. Use this when you need exact type signatures or implementation details not covered by docs. Check hasSource from list-packages first — returns isError if no source is bundled.',
  inputSchema: {
    properties: {
      packageSlug: { description: 'Package folder name, e.g. "ripple"', minLength: 1, type: 'string' },
    },
    required: ['packageSlug'],
    type: 'object',
  },
  name: 'get-source',
  run(args, context) {
    const slug = requireStr(args, 'packageSlug');
    const pkg = context.bySlug.get(slug);

    if (!pkg) return error(`Package "${slug}" not found. Available slugs: ${knownSlugs(context)}`);

    if (!pkg.apiSource) return error(`Package "${slug}" has no src/index.ts source in bundled data.`);

    return text(pkg.apiSource);
  },
};

// --- search-packages ---

const searchPackagesTool: ToolDefinition = {
  description:
    'Search vielzeug packages by keyword across name, description, category, keywords, exports, related, docs, and source. Supports multi-word queries (all words must match). Returns a JSON array of SearchHit objects sorted by score descending. score: name(3.9) > category(3.5) > description(3.1) > keywords(2.5) > exports(2.2) > related(2.0) > docs(1.0) > source(0.9). Returns empty array (not an error) when nothing matches. Prefer this over list-packages when you know what you are looking for.',
  inputSchema: {
    properties: { query: { description: 'Non-empty search term', minLength: 1, type: 'string' } },
    required: ['query'],
    type: 'object',
  },
  name: 'search-packages',
  run(args, context) {
    const query = requireStr(args, 'query');
    const results = context.normalisedPackages
      .map((pkg) => scorePackage(pkg, query))
      .filter((hit) => hit !== null)
      .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

    return text(JSON.stringify(results, null, 2));
  },
};

// --- list-components ---

const REFINE_UNAVAILABLE =
  'Refine component metadata is unavailable in this snapshot. If using the monorepo, build /refine first then run prepare:data. Published releases include this data automatically.';

const listComponentsTool: ToolDefinition = {
  description:
    'List all @vielzeug/refine web component tags from bundled Custom Elements Manifest (CEM) metadata. Returns a JSON array with tagName, description, and attrs (name, type, default). Use this to discover available components before calling get-component for full details. Returns isError if refine was not built before data generation.',
  inputSchema: { properties: {}, type: 'object' },
  name: 'list-components',
  run(_args, context) {
    if (!context.components || !context.componentTags) return error(REFINE_UNAVAILABLE);

    const tags = context.components
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

// --- get-component ---

const getComponentTool: ToolDefinition = {
  description:
    'Get the full Custom Elements Manifest (CEM) declaration for a single @vielzeug/refine component by its HTML tag name (e.g. "ore-button"). Returns a JSON object with attributes, events, slots, CSS parts, CSS properties, and member methods. Call list-components first to get valid tag names.',
  inputSchema: {
    properties: {
      tagName: { description: 'HTML custom element tag, e.g. "ore-button"', minLength: 1, type: 'string' },
    },
    required: ['tagName'],
    type: 'object',
  },
  name: 'get-component',
  run(args, context) {
    const tagName = requireStr(args, 'tagName');

    if (!context.components || !context.componentTags) return error(REFINE_UNAVAILABLE);

    const declaration = context.components.find((d) => d.tagName === tagName);

    if (!declaration) {
      return error(`Component "${tagName}" not found. Available tags: ${context.componentTags.join(', ')}`);
    }

    return text(JSON.stringify(declaration, null, 2));
  },
};

// ---------------------------------------------------------------------------
// generate-template helpers
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
// validate-component-usage helpers
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

function parseTagAttributes(html: string, tagName: string): Map<string, string> | null {
  const pattern = new RegExp(`<${tagName}((?:\\s[^>]*)?)(?:>|/>)`, 'i');
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
// Tools — generative UI tier
// ---------------------------------------------------------------------------

// --- generate-template ---

const generateTemplateTool: ToolDefinition = {
  description:
    'Generate a ready-to-use HTML template for a @vielzeug/refine component. Returns a snippet with required attributes filled with type-appropriate placeholders, optional attributes in a comment block, and all named slots scaffolded. Use this as the starting point for AI-generated declarative UI — avoids hallucinated attribute names. Call list-components first to get valid tag names.',
  inputSchema: {
    properties: {
      scenario: {
        description: 'Optional usage context to include as a leading comment, e.g. "primary call-to-action button"',
        type: 'string',
      },
      tagName: { description: 'HTML custom element tag, e.g. "ore-button"', minLength: 1, type: 'string' },
    },
    required: ['tagName'],
    type: 'object',
  },
  name: 'generate-template',
  run(args, context) {
    const tagName = requireStr(args, 'tagName');
    const scenario = typeof args['scenario'] === 'string' ? args['scenario'].trim() : undefined;

    if (!context.components || !context.componentTags) return error(REFINE_UNAVAILABLE);

    const decl = context.components.find((d) => d.tagName === tagName);

    if (!decl) return error(`Component "${tagName}" not found. Available tags: ${context.componentTags.join(', ')}`);

    return text(buildTemplate(decl, scenario));
  },
};

// --- get-tokens ---

const getTokensTool: ToolDefinition = {
  description:
    'List all CSS custom properties (design tokens) exposed by @vielzeug/refine components. Returns a JSON array of { name, description, default, component } objects sorted by name. Pass an optional filter prefix (e.g. "--refine-color") to narrow results. Use when generating dynamic themes or inline styles in AI-driven UI.',
  inputSchema: {
    properties: {
      filter: {
        description: 'Optional prefix to filter token names, e.g. "--refine-color". Case-insensitive.',
        type: 'string',
      },
    },
    type: 'object',
  },
  name: 'get-tokens',
  run(args, context) {
    if (!context.components) return error(REFINE_UNAVAILABLE);

    const rawFilter = typeof args['filter'] === 'string' ? args['filter'].trim().toLowerCase() : undefined;

    const seen = new Set<string>();
    const tokens: { component: string; default?: string; description?: string; name: string }[] = [];

    for (const decl of context.components) {
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

// --- validate-component-usage ---

const validateComponentUsageTool: ToolDefinition = {
  description:
    'Validate AI-generated HTML against a @vielzeug/refine component spec. Checks for unknown attributes and unrecognised slot names. Returns a JSON array of { type, message } objects — an empty array means the usage is valid. Use this to close the generate → validate → fix loop before rendering.',
  inputSchema: {
    properties: {
      html: {
        description: 'HTML fragment containing the component usage to validate (max 5000 chars)',
        minLength: 1,
        type: 'string',
      },
      tagName: {
        description: 'HTML custom element tag to validate against, e.g. "ore-button"',
        minLength: 1,
        type: 'string',
      },
    },
    required: ['html', 'tagName'],
    type: 'object',
  },
  name: 'validate-component-usage',
  run(args, context) {
    const tagName = requireStr(args, 'tagName');

    const rawHtml = args['html'];

    if (typeof rawHtml !== 'string' || rawHtml.trim().length === 0) return error('html: required non-empty string.');

    if (rawHtml.length > 5_000) return error('html: exceeds 5000 character limit.');

    const html = rawHtml.trim();

    if (!context.components || !context.componentTags) return error(REFINE_UNAVAILABLE);

    const decl = context.components.find((d) => d.tagName === tagName);

    if (!decl) return error(`Component "${tagName}" not found. Available tags: ${context.componentTags.join(', ')}`);

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

// ---------------------------------------------------------------------------
// Tools — sandbox contract tier
// ---------------------------------------------------------------------------

const SANDBOX_IFRAME_ATTRS: Record<string, string> = {
  referrerpolicy: 'no-referrer',
  sandbox: 'allow-scripts',
};

const SANDBOX_CSP: Record<string, string> = {
  'connect-src': "'none'",
  'default-src': "'none'",
  'form-action': "'none'",
  'img-src': 'data:',
  'script-src': "'unsafe-inline'",
  'style-src': "'unsafe-inline'",
};

function buildSandboxCspString(): string {
  return [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    'img-src data:',
    "connect-src 'none'",
    "form-action 'none'",
  ].join('; ');
}

function buildSrcdoc(html: string, styles?: string): string {
  // Defense-in-depth: styles is documented as CSS-only, so a literal "</style>" must not be able to
  // close the tag early and inject markup outside of it (html itself is intentionally embedded raw —
  // this document's whole purpose is to run AI-generated content inside the CSP-sandboxed iframe).
  const styleTag = styles ? `<style>${styles.replaceAll('</style', '<\\/style')}</style>` : '';
  const csp = buildSandboxCspString();

  return `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta charset="utf-8">
${styleTag}
</head>
<body>
${html}
<script>
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (msg && msg.type === 'dispose') { document.body.innerHTML = ''; }
  if (msg && msg.type === 'state-update') {
    document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: msg }));
  }
});
window.onerror = function(message, _src, _line, _col, err) {
  parent.postMessage({ type: 'error', message: String(message), stack: err ? err.stack : undefined }, '*');
  return true;
};
parent.postMessage({ type: 'ready' }, '*');
</script>
</body>
</html>`;
}

// --- get-sandbox-context ---

const getSandboxContextTool: ToolDefinition = {
  description:
    'Return the execution constraints of the @vielzeug/sandbox iframe runtime as a JSON object. Use this before generating code for the sandbox — it tells you which browser APIs are available, which are blocked by CSP, and what the iframe sandbox attribute restricts. Call this once per session to orient the AI agent.',
  inputSchema: { properties: {}, type: 'object' },
  name: 'get-sandbox-context',
  run(_args, _context) {
    return text(
      JSON.stringify(
        {
          cspPolicy: SANDBOX_CSP,
          iframeAttributes: SANDBOX_IFRAME_ATTRS,
          notAvailable: [
            'fetch (blocked by connect-src)',
            'XMLHttpRequest (blocked by connect-src)',
            'WebSocket (blocked by connect-src)',
            'localStorage (blocked by sandbox)',
            'sessionStorage (blocked by sandbox)',
            'indexedDB (blocked by sandbox)',
            'allow-same-origin is NOT set — no cross-iframe DOM access',
          ],
          restrictions: [
            "No network requests — connect-src is 'none'",
            "No form submissions — form-action is 'none'",
            'No top-level navigation — sandbox prevents it',
            "No plugins or objects — default-src is 'none'",
            'No same-origin access — sandbox attribute isolates the iframe',
          ],
          stateBridge: {
            direction: 'host → sandbox via postMessage; sandbox → host via parent.postMessage',
            note: 'Call get-state-bridge-spec for the full typed protocol',
          },
          windowGlobals: [
            'window',
            'document',
            'customElements',
            'setTimeout',
            'clearTimeout',
            'setInterval',
            'clearInterval',
            'console',
            'Math',
            'JSON',
            'Object',
            'Array',
            'Promise',
            'MutationObserver',
            'ResizeObserver',
            'IntersectionObserver',
          ],
        },
        null,
        2,
      ),
    );
  },
};

// --- get-state-bridge-spec ---

const STATE_BRIDGE_SPEC = `
/**
 * @vielzeug/sandbox — postMessage state bridge protocol
 *
 * All messages are plain JSON-serialisable objects.
 * The host sends HostMessage into the iframe; the iframe sends SandboxMessage back.
 */

// Host → sandbox (send via sandboxHandle.send(msg) or iframe.contentWindow.postMessage(msg, '*'))
type HostMessage =
  | { type: 'render';       html: string }               // replace body with new HTML
  | { type: 'state-update'; key: string; value: unknown } // push a named value into the sandbox
  | { type: 'dispose' }                                   // clear body and tear down

// Sandbox → host (listen via sandboxHandle.onMessage(handler))
type SandboxMessage =
  | { type: 'ready' }                                             // fired once after srcdoc loads
  | { type: 'event';  name: string; detail: unknown }             // custom event bubbled to host
  | { type: 'error';  message: string; stack?: string }           // uncaught window.onerror
  | { type: 'resize'; width: number; height: number }             // content size changed

/**
 * Sandbox-side: listen for state-update messages from host
 *
 *   document.addEventListener('sandbox:state-update', (e) => {
 *     const { key, value } = e.detail;
 *     // update your UI with the new state
 *   });
 *
 * Sandbox-side: dispatch an event to the host
 *
 *   parent.postMessage({ type: 'event', name: 'ore-click', detail: { id: '42' } }, '*');
 */
`.trim();

const getStateBridgeSpecTool: ToolDefinition = {
  description:
    'Return the full typed postMessage state bridge protocol for @vielzeug/sandbox as TypeScript source with inline usage comments. Use this to understand how to communicate between the host application and sandboxed AI-generated content — including dispatching events back to the host and receiving state updates.',
  inputSchema: { properties: {}, type: 'object' },
  name: 'get-state-bridge-spec',
  run(_args, _context) {
    return text(STATE_BRIDGE_SPEC);
  },
};

// --- generate-sandbox-document ---

const MAX_SRCDOC_HTML = 20_000;

const generateSandboxDocumentTool: ToolDefinition = {
  description:
    'Wrap an HTML fragment in a complete srcdoc-ready document for use with @vielzeug/sandbox. Injects the correct Content-Security-Policy meta tag, optional styles, and the postMessage bridge bootstrap script. Pass the result directly to sandboxHandle.render() or set it as iframe.srcdoc. Max html length: 20 000 chars.',
  inputSchema: {
    properties: {
      html: {
        description: 'HTML body content to embed inside the sandbox document (max 20 000 chars)',
        minLength: 1,
        type: 'string',
      },
      styles: {
        description: 'Optional CSS to inject as a <style> block in the document <head>',
        type: 'string',
      },
    },
    required: ['html'],
    type: 'object',
  },
  name: 'generate-sandbox-document',
  run(args, _context) {
    const rawHtml = args['html'];

    if (typeof rawHtml !== 'string' || rawHtml.trim().length === 0) return error('html: required non-empty string.');

    if (rawHtml.length > MAX_SRCDOC_HTML) return error(`html: exceeds ${MAX_SRCDOC_HTML} character limit.`);

    const styles =
      typeof args['styles'] === 'string' && args['styles'].trim().length > 0 ? args['styles'].trim() : undefined;

    return text(buildSrcdoc(rawHtml.trim(), styles));
  },
};

// ---------------------------------------------------------------------------
// Tools — ecosystem breadth tier
// ---------------------------------------------------------------------------

const ORE_DIRECTIVES: ReadonlyArray<{
  description: string;
  import: string;
  name: string;
  signature: string;
}> = [
  {
    description:
      'Reactive class string from an object map. Keys are CSS class names; values are booleans or Readable<boolean>.',
    import: '@vielzeug/ore/directives',
    name: 'classMap',
    signature: 'classMap(record: Record<string, boolean | Readable<boolean>>): DirectiveResult',
  },
  {
    description:
      'Keyed reactive list with DOM diffing. The render function receives Readable<T> (item) and Readable<number> (index). A plain T[] is treated as a one-time static snapshot; wrap in signal() for reactivity. Duplicate keys warn in dev.',
    import: '@vielzeug/ore/directives',
    name: 'each',
    signature:
      'each<T>(source: Readable<T[]> | T[], key: (item: T) => string, render: (item: Readable<T>, index: Readable<number>) => HTMLResult, fallback?: () => HTMLResult): DirectiveResult',
  },
  {
    description:
      'One-way binding that skips stale DOM writes during active user input. Use alongside a manual @input handler for controlled inputs to prevent cursor jumps.',
    import: '@vielzeug/ore/directives',
    name: 'live',
    signature: 'live(signal: LiveSignal): DirectiveResult',
  },
  {
    description:
      'Two-way value binding for input, select, and textarea elements. select emits on change; input/textarea emit on input. <select multiple> expects Signal<string[]>.',
    import: '@vielzeug/ore/directives',
    name: 'model',
    signature: 'model(signal: Signal<string> | Signal<string[]>): DirectiveResult',
  },
  {
    description:
      'Render a trusted HTML string without escaping. Call setRawSanitizer() before use to avoid XSS. Never pass user-controlled content without sanitization.',
    import: '@vielzeug/ore/directives',
    name: 'raw',
    signature: 'raw(value: string): DirectiveResult',
  },
  {
    description:
      'Reactive inline style string from an object map. Keys are CSS property names; values are strings or Readable<string>.',
    import: '@vielzeug/ore/directives',
    name: 'styleMap',
    signature: 'styleMap(record: Record<string, string | Readable<string>>): DirectiveResult',
  },
  {
    description:
      'Conditional rendering. Truthy and falsy branches are lazy factory functions. The condition tracks reactively when passed as a Readable or getter function.',
    import: '@vielzeug/ore/directives',
    name: 'when',
    signature:
      'when(condition: boolean | Readable<boolean> | (() => boolean), truthy: () => HTMLResult, falsy?: () => HTMLResult): DirectiveResult',
  },
];

const SPELL_VALIDATORS: ReadonlyArray<{
  category: string;
  description: string;
  name: string;
  signature: string;
}> = [
  {
    category: 'length',
    description: 'value.length <= max.',
    name: 'hasMaxLength',
    signature: 'hasMaxLength(value: string | unknown[], max: number): boolean',
  },
  {
    category: 'length',
    description: 'value.length >= min.',
    name: 'hasMinLength',
    signature: 'hasMinLength(value: string | unknown[], min: number): boolean',
  },
  {
    category: 'format',
    description: 'Base64-encoded string (with padding).',
    name: 'isBase64',
    signature: 'isBase64(v: string): boolean',
  },
  {
    category: 'format',
    description: 'Base64url-encoded string (RFC 4648 §5, padded or unpadded).',
    name: 'isBase64url',
    signature: 'isBase64url(v: string): boolean',
  },
  {
    category: 'type',
    description: 'Array.isArray guard.',
    name: 'isArray',
    signature: 'isArray(value: unknown): value is unknown[]',
  },
  {
    category: 'type',
    description: 'Boolean type guard.',
    name: 'isBoolean',
    signature: 'isBoolean(value: unknown): value is boolean',
  },
  {
    category: 'type',
    description: 'Date instance guard (rejects NaN dates).',
    name: 'isDate',
    signature: 'isDate(value: unknown): value is Date',
  },
  { category: 'format', description: 'cuid v1 string.', name: 'isCuid', signature: 'isCuid(v: string): boolean' },
  { category: 'format', description: 'cuid v2 string.', name: 'isCuid2', signature: 'isCuid2(v: string): boolean' },
  {
    category: 'format',
    description: 'ISO 8601 duration (e.g. P1Y2M3DT4H5M6S).',
    name: 'isDuration',
    signature: 'isDuration(v: string): boolean',
  },
  {
    category: 'format',
    description: 'Basic email address.',
    name: 'isEmail',
    signature: 'isEmail(v: string): boolean',
  },
  {
    category: 'format',
    description: 'Single extended-pictographic emoji.',
    name: 'isEmoji',
    signature: 'isEmoji(v: string): boolean',
  },
  {
    category: 'format',
    description: 'Lowercase hexadecimal string (no 0x prefix).',
    name: 'isHex',
    signature: 'isHex(v: string): boolean',
  },
  {
    category: 'format',
    description: '#RGB, #RRGGBB, or #RRGGBBAA hex color.',
    name: 'isHexColor',
    signature: 'isHexColor(v: string): boolean',
  },
  {
    category: 'number',
    description: 'value >= min && value <= max.',
    name: 'isInRange',
    signature: 'isInRange(value: number, min: number, max: number): boolean',
  },
  {
    category: 'number',
    description: 'Number.isInteger check.',
    name: 'isInteger',
    signature: 'isInteger(value: number): boolean',
  },
  { category: 'format', description: 'IPv4 or IPv6 address.', name: 'isIp', signature: 'isIp(v: string): boolean' },
  {
    category: 'format',
    description: 'YYYY-MM-DD date string (validates calendar correctness).',
    name: 'isIsoDate',
    signature: 'isIsoDate(v: string): boolean',
  },
  {
    category: 'format',
    description: 'ISO 8601 datetime with optional time and timezone.',
    name: 'isIsoDateTime',
    signature: 'isIsoDateTime(v: string): boolean',
  },
  {
    category: 'format',
    description: 'Three-segment header.payload.signature JWT.',
    name: 'isJwt',
    signature: 'isJwt(v: string): boolean',
  },
  {
    category: 'number',
    description: 'value % step === 0.',
    name: 'isMultipleOf',
    signature: 'isMultipleOf(value: number, step: number): boolean',
  },
  {
    category: 'format',
    description: 'NanoID string; default length 21.',
    name: 'isNanoid',
    signature: 'isNanoid(v: string, length?: number): boolean',
  },
  {
    category: 'number',
    description: 'value < 0.',
    name: 'isNegative',
    signature: 'isNegative(value: number): boolean',
  },
  {
    category: 'number',
    description: 'value >= 0.',
    name: 'isNonNegative',
    signature: 'isNonNegative(value: number): boolean',
  },
  {
    category: 'type',
    description: 'Null or undefined guard (value == null).',
    name: 'isNullOrUndefined',
    signature: 'isNullOrUndefined(value: unknown): value is null | undefined',
  },
  {
    category: 'type',
    description: 'Number type guard (rejects NaN).',
    name: 'isNumber',
    signature: 'isNumber(value: unknown): value is number',
  },
  {
    category: 'format',
    description: 'Numeric string (integer or decimal, optional exponent).',
    name: 'isNumeric',
    signature: 'isNumeric(v: string): boolean',
  },
  {
    category: 'number',
    description: 'value > 0.',
    name: 'isPositive',
    signature: 'isPositive(value: number): boolean',
  },
  {
    category: 'format',
    description: 'Semver version string.',
    name: 'isSemver',
    signature: 'isSemver(v: string): boolean',
  },
  {
    category: 'format',
    description: 'Lowercase hyphen-separated slug (a-z0-9, no leading/trailing hyphens).',
    name: 'isSlug',
    signature: 'isSlug(v: string): boolean',
  },
  {
    category: 'type',
    description: 'String type guard.',
    name: 'isString',
    signature: 'isString(value: unknown): value is string',
  },
  {
    category: 'format',
    description: 'HH:MM or HH:MM:SS time string.',
    name: 'isTime',
    signature: 'isTime(v: string): boolean',
  },
  { category: 'format', description: 'ULID string.', name: 'isUlid', signature: 'isUlid(v: string): boolean' },
  {
    category: 'format',
    description: 'URL string; optional protocols restriction (default: http, https).',
    name: 'isUrl',
    signature: 'isUrl(v: string, protocols?: readonly string[]): boolean',
  },
  {
    category: 'format',
    description: 'UUID v1–v5 (lowercase 8-4-4-4-12 format).',
    name: 'isUuid',
    signature: 'isUuid(v: string): boolean',
  },
];

function extractTypeSignature(source: string, symbol: string): string[] {
  const lines = source.split('\n');
  const results: string[] = [];
  const symbolRe = new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

  let capturing = false;
  let depth = 0;
  let buf: string[] = [];

  for (const line of lines) {
    if (!capturing) {
      if (/\bexport\b/.test(line) && symbolRe.test(line)) {
        capturing = true;
        buf = [line];
        depth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;

        if (depth <= 0) {
          results.push(buf.join('\n').trim());
          buf = [];
          capturing = false;
        }
      }
    } else {
      buf.push(line);
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;

      if (depth <= 0) {
        results.push(buf.join('\n').trim());
        buf = [];
        capturing = false;
      }
    }
  }

  return results;
}

// --- list-directives ---

const listDirectivesTool: ToolDefinition = {
  description:
    'List all reactive directives exported by @vielzeug/ore/directives with their TypeScript signatures and descriptions. Returns a JSON array sorted by name. Use when building templates with ore — directives are the primary way to express reactivity, conditionals, and list rendering in HTML templates.',
  inputSchema: { properties: {}, type: 'object' },
  name: 'list-directives',
  run(_args, _context) {
    return text(JSON.stringify(ORE_DIRECTIVES, null, 2));
  },
};

// --- list-validators ---

const listValidatorsTool: ToolDefinition = {
  description:
    'List all standalone validator functions exported by a @vielzeug package. Returns a JSON array of { name, signature, description, category } sorted by name. Currently supports slug "spell". Validators are pure functions — they return boolean (or a type predicate) and can be used directly inside s.string().validate() or any custom assertion.',
  inputSchema: {
    properties: {
      slug: {
        default: 'spell',
        description: 'Package slug. Currently only "spell" is supported.',
        enum: ['spell'],
        type: 'string',
      },
    },
    type: 'object',
  },
  name: 'list-validators',
  run(args, context) {
    const slug = typeof args['slug'] === 'string' ? args['slug'].trim() : 'spell';

    if (slug !== 'spell') return error(`"${slug}" does not expose a validator catalogue. Supported: spell.`);

    if (!context.bySlug.has('spell')) return error('Package "spell" not found in bundled data.');

    return text(JSON.stringify(SPELL_VALIDATORS, null, 2));
  },
};

// --- get-type-signature ---

const getTypeSignatureTool: ToolDefinition = {
  description:
    "Extract the TypeScript export declaration(s) for a named symbol from a @vielzeug package's bundled src/index.ts. Returns the raw declaration lines — useful for verifying the exact signature of a function, type alias, interface, or constant without loading the full source. Returns isError when the package has no bundled source or the symbol is not found.",
  inputSchema: {
    properties: {
      slug: { description: 'Package slug, e.g. "arsenal"', minLength: 1, type: 'string' },
      symbol: {
        description: 'Exported name to look up, e.g. "debounce" or "SearchOptions"',
        minLength: 1,
        type: 'string',
      },
    },
    required: ['slug', 'symbol'],
    type: 'object',
  },
  name: 'get-type-signature',
  run(args, context) {
    const slug = requireStr(args, 'slug');
    const symbol = requireStr(args, 'symbol');

    const pkg = context.bySlug.get(slug);

    if (!pkg) return error(`Package "${slug}" not found. Known slugs: ${knownSlugs(context)}.`);

    if (!pkg.apiSource) return error(`Package "${slug}" has no bundled source.`);

    const matches = extractTypeSignature(pkg.apiSource, symbol);

    if (matches.length === 0) return error(`"${symbol}" not found in ${slug}/src/index.ts.`);

    return text(matches.join('\n\n'));
  },
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const TOOLS: ToolDefinition[] = [
  listPackagesTool,
  getPackageTool,
  getDocsTool,
  getSourceTool,
  searchPackagesTool,
  listComponentsTool,
  getComponentTool,
  generateTemplateTool,
  getTokensTool,
  validateComponentUsageTool,
  getSandboxContextTool,
  getStateBridgeSpecTool,
  generateSandboxDocumentTool,
  listDirectivesTool,
  listValidatorsTool,
  getTypeSignatureTool,
];

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

const DEBUG = process.env['CODEX_DEBUG'] === '1';

function debugArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args)
    .map(
      ([k, v]) =>
        `${k}=${typeof v === 'string' ? JSON.stringify(v.length > 40 ? `${v.slice(0, 40)}…` : v) : String(v)}`,
    )
    .join(', ');

  return entries ? `(${entries})` : '()';
}

export function registerTools(server: Server, context: ToolContext): void {
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: TOOLS.map((tool) => ({ description: tool.description, inputSchema: tool.inputSchema, name: tool.name })),
  }));

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = TOOL_MAP.get(request.params.name);

    if (!tool) {
      if (DEBUG) log(`[codex] tool not found: ${request.params.name}`);

      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }

    const args = request.params.arguments ?? {};

    if (DEBUG) log(`[codex] → ${tool.name}${debugArgs(args)}`);

    const t0 = DEBUG ? Date.now() : 0;

    try {
      const result = tool.run(args, context);

      if (DEBUG) log(`[codex] ✓ ${tool.name} (${Date.now() - t0}ms)`);

      return result;
    } catch (err) {
      if (err instanceof ToolArgError) {
        if (DEBUG) log(`[codex] ✗ ${tool.name} arg error: ${err.message}`);

        return error(err.message);
      }

      if (DEBUG) log(`[codex] ✗ ${tool.name} threw: ${err instanceof Error ? err.message : String(err)}`);

      throw err;
    }
  });
}
