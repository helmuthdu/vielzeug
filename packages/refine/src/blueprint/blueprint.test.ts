import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  type BlueprintNode,
  MAX_BLUEPRINT_CHILDREN,
  MAX_BLUEPRINT_DEPTH,
  MAX_BLUEPRINT_ID_LENGTH,
  MAX_BLUEPRINT_NODES,
  MAX_BLUEPRINT_NUMBER,
  MAX_BLUEPRINT_TEXT_LENGTH,
  parseUiBlueprint,
  safeParseUiBlueprint,
  UI_BLUEPRINT_COMPONENTS,
  UI_BLUEPRINT_JSON_SCHEMA,
  UI_BLUEPRINT_REGISTRY,
  UI_BLUEPRINT_VERSION,
  UiBlueprintError,
} from '../blueprint/blueprint';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..', 'src');

function componentSource(path: string): string {
  return readFileSync(resolve(sourceRoot, path), 'utf8');
}

/* ------------------------------------------------------------------ *
 * Reads a component's real prop contract out of its own source, so the
 * registry is compared against the component rather than against a copy
 * of itself. Shared const lists and spread prop bundles resolve through
 * `shared/`, which is where the components actually get them from.
 * ------------------------------------------------------------------ */

const SHARED_SOURCES = ['shared/prop-bundles.ts', 'shared/types.ts'];

function resolveConstList(name: string, primary: string): (number | string)[] | undefined {
  for (const source of [primary, ...SHARED_SOURCES.map(componentSource)]) {
    const declaration = new RegExp(`const ${name} = (\\[[^\\]]*\\])`, 'm').exec(source);
    if (!declaration?.[1]) continue;

    return [...declaration[1].matchAll(/'([^']+)'|(\d+)/g)].map((match) => match[1] ?? Number(match[2]));
  }

  return undefined;
}

/** Extract the balanced `props: { … }` body from a `define()` call. */
function propsBlock(source: string): string {
  const header = '  props: {';
  const start = source.indexOf(header);
  if (start === -1) throw new Error('No props block found.');

  let depth = 0;
  for (let index = start + header.length - 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start + header.length, index);
    }
  }

  throw new Error('Unbalanced props block.');
}

/** Split on top-level commas only, so commas inside arrays or calls stay put. */
function splitEntries(body: string): string[] {
  const entries: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of body) {
    if ('{(['.includes(char)) depth += 1;
    if ('})]'.includes(char)) depth -= 1;

    if (char === ',' && depth === 0) {
      if (current.trim()) entries.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) entries.push(current.trim());

  return entries;
}

function readPropEntries(text: string, primary: string): [string, (number | string)[] | null][] {
  const parsed: [string, (number | string)[] | null][] = [];

  for (const entry of splitEntries(text)) {
    const nested = /^\.\.\.(\w+)$/.exec(entry)?.[1];
    if (nested) {
      parsed.push(...readBundle(nested, primary));
      continue;
    }

    const name = /^'([^']+)'|^([\w-]+)/.exec(entry);
    if (!name || !entry.includes(':')) continue;

    const oneOf = /prop\.oneOf\((\[[^\]]*\]|\w+)/.exec(entry);
    if (oneOf?.[1]?.startsWith('[')) {
      parsed.push([name[1] ?? name[2]!, [...oneOf[1].matchAll(/'([^']+)'/g)].map((inline) => inline[1])]);
      continue;
    }
    if (oneOf?.[1]) {
      const values = resolveConstList(oneOf[1], primary);
      if (!values) throw new Error(`Unresolved prop.oneOf const: ${oneOf[1]}`);
      parsed.push([name[1] ?? name[2]!, values]);
      continue;
    }

    parsed.push([name[1] ?? name[2]!, null]);
  }

  return parsed;
}

/** Read a shared prop bundle, expanding any bundles it spreads in turn. */
function readBundle(name: string, primary: string): [string, (number | string)[] | null][] {
  const body = new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\};`).exec(componentSource(SHARED_SOURCES[0]));
  if (!body?.[1]) throw new Error(`Unresolved prop bundle: ${name}`);

  return readPropEntries(body[1], primary);
}

/**
 * Ore observes every prop as a kebab-case attribute (define.ts maps prop names through toKebab),
 * so a camelCase declaration like icon's `strokeWidth` is addressed as `stroke-width`. The
 * registry speaks attribute names; the drift guard must compare in the same space.
 */
const toKebab = (name: string): string => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

function readComponentProps(path: string): Map<string, (number | string)[] | null> {
  const source = componentSource(path);
  const props = new Map<string, (number | string)[] | null>();

  for (const [name, values] of readPropEntries(propsBlock(source), source)) {
    props.set(toKebab(name), values);
  }

  return props;
}

function documentOf(root: unknown): unknown {
  return { root, version: UI_BLUEPRINT_VERSION };
}

function rejection(value: unknown): readonly string[] {
  const result = safeParseUiBlueprint(value);
  if (result.success) throw new Error('Expected the document to be rejected.');
  return result.issues;
}

function textNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { text: 'Hello', type: 'text', ...overrides };
}

describe('parseUiBlueprint(): document envelope', () => {
  it('accepts a minimal document and returns it unchanged', () => {
    const value = documentOf(textNode());

    expect(parseUiBlueprint(value)).toBe(value);
  });

  it('rejects non-object documents', () => {
    for (const value of [null, undefined, 'text', 42, []]) {
      expect(rejection(value)[0]).toMatch(/document: expected an object/);
    }
  });

  it('rejects an unsupported version instead of guessing', () => {
    expect(rejection({ root: textNode(), version: 2 })[0]).toMatch(/version: expected 1, received 2/);
    expect(rejection({ root: textNode() })[0]).toMatch(/version: expected 1, received undefined/);
  });

  it('rejects unknown top-level keys rather than ignoring them', () => {
    const issues = rejection({ extra: true, root: textNode(), version: UI_BLUEPRINT_VERSION });
    expect(issues.join('\n')).toContain('document.extra: unsupported field');
  });

  it('requires a root node', () => {
    expect(rejection({ version: UI_BLUEPRINT_VERSION })[0]).toMatch(/root: required/);
  });
});

describe('parseUiBlueprint(): component registry', () => {
  it('accepts every registered component', () => {
    const samples: Record<string, unknown> = {
      alert: { children: [textNode()], type: 'alert' },
      badge: { text: 'New', type: 'badge' },
      box: { children: [textNode()], type: 'box' },
      button: { label: 'Save', type: 'button' },
      card: { children: [textNode()], type: 'card' },
      checkbox: { label: 'Accept', type: 'checkbox' },
      icon: { name: 'check', type: 'icon' },
      'number-input': { label: 'Amount', type: 'number-input' },
      progress: { type: 'progress', value: 40 },
      separator: { type: 'separator' },
      slider: { label: 'Rate', type: 'slider' },
      switch: { label: 'Enabled', type: 'switch' },
      text: textNode(),
    };

    expect(Object.keys(samples).sort()).toEqual([...UI_BLUEPRINT_COMPONENTS].sort());
    for (const root of Object.values(samples)) {
      expect(() => parseUiBlueprint(documentOf(root))).not.toThrow();
    }
  });

  it('rejects an unregistered component and names the allowed set', () => {
    const issues = rejection(documentOf({ type: 'dialog' }));
    expect(issues.join('\n')).toMatch(/root\.type: "dialog" is not a registered component/);
    expect(issues.join('\n')).toContain('Use one of');
  });

  it('rejects a non-object node', () => {
    expect(rejection(documentOf('just text'))[0]).toMatch(/root: expected a component object, received string/);
  });
});

describe('parseUiBlueprint(): per-component props', () => {
  it('rejects a prop the component does not document', () => {
    const issues = rejection(documentOf(textNode({ size: 'gigantic' })));
    expect(issues.join('\n')).toMatch(/root\.size: "gigantic" is not an accepted value/);
  });

  it('rejects an unknown prop name on a component', () => {
    const issues = rejection(documentOf(textNode({ onclick: 'alert(1)' })));
    expect(issues.join('\n')).toContain('root.onclick: unsupported field for "text"');
  });

  it.each([
    ['href', 'https://evil.example'],
    ['target', '_blank'],
    ['rel', 'noopener'],
  ])('cannot express %s on a button, so a generated control cannot route', (key, value) => {
    const issues = rejection(documentOf({ label: 'Save', [key]: value, type: 'button' }));
    expect(issues.join('\n')).toContain(`root.${key}: unsupported field for "button"`);
  });

  it.each(['style', 'class', 'className', 'innerHTML', 'dataset', 'part', 'slot'])(
    'rejects the presentation escape hatch %s',
    (key) => {
      const issues = rejection(documentOf(textNode({ [key]: 'color: red' })));
      expect(issues.join('\n')).toContain(`root.${key}: unsupported field for "text"`);
    },
  );

  it('rejects a wrong primitive type with the received type', () => {
    expect(rejection(documentOf(textNode({ italic: 'yes' })))[0]).toMatch(
      /root\.italic: expected a boolean, received string/,
    );
    expect(rejection(documentOf(textNode({ lines: 'two' })))[0]).toMatch(/root\.lines: expected an integer/);
    expect(rejection(documentOf({ count: 'five', type: 'badge' }))[0]).toMatch(/root\.count: expected an integer/);
  });

  it('rejects an out-of-range integer', () => {
    expect(rejection(documentOf(textNode({ lines: 0 })))[0]).toMatch(/root\.lines: 0 is outside the accepted range/);
    expect(rejection(documentOf({ count: -1, type: 'badge' }))[0]).toMatch(/root\.count: -1 is outside/);
  });

  it('accepts a numeric elevation because the component declares numbers', () => {
    expect(() => parseUiBlueprint(documentOf({ children: [textNode()], elevation: 2, type: 'box' }))).not.toThrow();
    expect(rejection(documentOf({ children: [textNode()], elevation: 9, type: 'box' }))[0]).toMatch(/elevation/);
  });

  it('requires a non-empty label on a button', () => {
    expect(rejection(documentOf({ label: '   ', type: 'button' }))[0]).toMatch(/root\.label: must not be empty/);
  });
});

describe('parseUiBlueprint(): child policy', () => {
  it('rejects children on a leaf component', () => {
    const issues = rejection(documentOf(textNode({ children: [textNode()] })));
    expect(issues.join('\n')).toMatch(/root\.children: "text" renders no children/);
  });

  it.each(['box', 'card'])('requires children on a %s container', (type) => {
    expect(rejection(documentOf({ type }))[0]).toMatch(new RegExp(`children: "${type}" requires an array`));
  });

  it('rejects an empty or non-array children list', () => {
    expect(rejection(documentOf({ children: [], type: 'box' }))[0]).toMatch(/at least one child/);
    expect(rejection(documentOf({ children: { type: 'text' }, type: 'box' }))[0]).toMatch(/requires an array/);
  });

  it('rejects more children than the layout ceiling', () => {
    const children = Array.from({ length: MAX_BLUEPRINT_CHILDREN + 1 }, () => textNode());
    expect(rejection(documentOf({ children, type: 'box' }))[0]).toMatch(/exceeds the 12 child limit/);
  });

  it('reports the child path so an error is actionable', () => {
    const issues = rejection(
      documentOf({ children: [textNode(), { children: [textNode({ size: 'huge' })], type: 'box' }], type: 'card' }),
    );
    expect(issues.join('\n')).toContain('root.children[1].children[0].size');
  });
});

describe('parseUiBlueprint(): node identity', () => {
  it('accepts a bounded id on any node', () => {
    expect(() => parseUiBlueprint(documentOf(textNode({ id: 'headline', text: 'Hi' })))).not.toThrow();
  });

  it('rejects a duplicate id across the document', () => {
    const issues = rejection(
      documentOf({
        children: [textNode({ id: 'dup' }), textNode({ id: 'dup' })],
        id: 'dup',
        type: 'box',
      }),
    );
    expect(issues.join('\n')).toMatch(/id: "dup" is already used/);
  });

  it('rejects an over-long id', () => {
    const id = 'x'.repeat(MAX_BLUEPRINT_ID_LENGTH + 1);
    expect(rejection(documentOf(textNode({ id }))).join('\n')).toMatch(/id: exceeds the 64 character limit/);
  });

  it('rejects an empty or non-string id', () => {
    expect(rejection(documentOf(textNode({ id: '   ' }))).join('\n')).toMatch(/id: must be a non-empty string/);
    expect(rejection(documentOf(textNode({ id: 42 }))).join('\n')).toMatch(/id: must be a non-empty string/);
  });

  it('treats id as metadata, never a component prop', () => {
    // id is allowed on every node but is not a real prop on any component; the drift guard checks
    // only rule.attributes, and id is deliberately absent from every attributes list.
    expect(UI_BLUEPRINT_REGISTRY.text.attributes).not.toContain('id');
    expect(() => parseUiBlueprint(documentOf(textNode({ id: 'ok' })))).not.toThrow();
  });
});

describe('parseUiBlueprint(): required fields', () => {
  it('rejects a button with no label', () => {
    expect(rejection(documentOf({ type: 'button' }))[0]).toMatch(/root\.label: required for "button"/);
  });

  it('rejects a slider, switch, or checkbox with no label', () => {
    for (const type of ['slider', 'switch', 'checkbox']) {
      expect(rejection(documentOf({ type }))[0]).toMatch(new RegExp(`root\\.label: required for "${type}"`));
    }
  });

  it('rejects an icon with no name', () => {
    expect(rejection(documentOf({ type: 'icon' }))[0]).toMatch(/root\.name: required for "icon"/);
  });
});

describe('parseUiBlueprint(): numeric fields', () => {
  it('accepts fractional numbers on a slider', () => {
    expect(() => parseUiBlueprint(documentOf({ label: 'Rate', step: 0.5, type: 'slider', value: 3.75 }))).not.toThrow();
  });

  it('rejects a non-finite number', () => {
    const issues = rejection(documentOf({ label: 'Rate', type: 'slider', value: Number.POSITIVE_INFINITY }));
    expect(issues.join('\n')).toMatch(/value: expected a finite number/);
  });

  it('rejects a number outside the document ceiling', () => {
    const issues = rejection(documentOf({ label: 'Rate', type: 'slider', value: MAX_BLUEPRINT_NUMBER + 1 }));
    expect(issues.join('\n')).toMatch(/value: .* is outside the accepted range/);
  });

  it('rejects a string where a number is required', () => {
    expect(rejection(documentOf({ label: 'Rate', type: 'slider', value: 'high' }))[0]).toMatch(
      /value: expected a finite number, received string/,
    );
  });

  it('rejects a non-positive step instead of letting the component absorb it', () => {
    // Both ore-slider (toPositiveStep) and ore-number-input (Number(step) || 1) silently replace
    // a zero or negative step with their default, which would render something other than what
    // the document asked for.
    for (const step of [0, -1]) {
      expect(rejection(documentOf({ label: 'Rate', step, type: 'slider' })).join('\n')).toMatch(
        /step: .* must be greater than 0/,
      );
      expect(rejection(documentOf({ label: 'Amount', step, type: 'number-input' })).join('\n')).toMatch(
        /step: .* must be greater than 0/,
      );
    }
  });

  it('rejects progress values the component would clamp', () => {
    expect(rejection(documentOf({ type: 'progress', value: -5 }))[0]).toMatch(
      /value: .* is outside the accepted range/,
    );
    expect(rejection(documentOf({ max: 0, type: 'progress' }))[0]).toMatch(/max: .* must be greater than 0/);
    expect(rejection(documentOf({ segments: 2.5, type: 'progress' }))[0]).toMatch(/segments: expected an integer/);
  });

  it('bounds icon size and stroke width to values the component renders', () => {
    expect(rejection(documentOf({ name: 'check', size: 0, type: 'icon' }))[0]).toMatch(/size: .* outside/);
    expect(rejection(documentOf({ name: 'check', 'stroke-width': -2, type: 'icon' }))[0]).toMatch(
      /stroke-width: .* must be greater than 0/,
    );
    expect(() =>
      parseUiBlueprint(documentOf({ name: 'check', size: 24, 'stroke-width': 1.5, type: 'icon' })),
    ).not.toThrow();
  });

  it('truncates an echoed value so issues stay safe to display', () => {
    const long = 'x'.repeat(500);
    const issues = rejection(documentOf(textNode({ size: long })));
    const joined = issues.join('\n');
    expect(joined).toContain('is not an accepted value');
    expect(joined.length).toBeLessThan(400);
    expect(joined).not.toContain(long);
  });
});

describe('parseUiBlueprint(): resource bounds', () => {
  it('rejects text longer than the bound', () => {
    const long = 'x'.repeat(MAX_BLUEPRINT_TEXT_LENGTH + 1);
    expect(rejection(documentOf(textNode({ text: long })))[0]).toMatch(/exceeds the 500 character limit/);
  });

  it('accepts text exactly at the bound', () => {
    const exact = 'x'.repeat(MAX_BLUEPRINT_TEXT_LENGTH);
    expect(() => parseUiBlueprint(documentOf(textNode({ text: exact })))).not.toThrow();
  });

  it('rejects nesting deeper than the depth limit', () => {
    let node: Record<string, unknown> = textNode();
    for (let level = 0; level < MAX_BLUEPRINT_DEPTH; level += 1) {
      node = { children: [node], type: 'box' };
    }

    expect(rejection(documentOf(node))[0]).toMatch(/nesting exceeds the 6 level limit/);
  });

  it('accepts nesting exactly at the depth limit', () => {
    let node: Record<string, unknown> = textNode();
    for (let level = 1; level < MAX_BLUEPRINT_DEPTH; level += 1) {
      node = { children: [node], type: 'box' };
    }

    expect(() => parseUiBlueprint(documentOf(node))).not.toThrow();
  });

  it('rejects a document over the node budget', () => {
    // 12 x 12 x 12 leaves is 132 containers plus 1728 leaves: the budget must stop the walk
    // long before the tree is exhausted, and stop it without recursing to the leaves.
    const leaf = textNode();
    const level3 = () => ({ children: Array.from({ length: MAX_BLUEPRINT_CHILDREN }, () => leaf), type: 'box' });
    const level2 = () => ({ children: Array.from({ length: MAX_BLUEPRINT_CHILDREN }, level3), type: 'box' });
    const root = { children: Array.from({ length: MAX_BLUEPRINT_CHILDREN }, level2), type: 'card' };

    const issues = rejection(documentOf(root));
    expect(issues.some((issue) => issue.includes(`${MAX_BLUEPRINT_NODES} node limit`))).toBe(true);
  });

  it('does not blow the stack on a pathological deep chain', () => {
    let node: Record<string, unknown> = textNode();
    for (let level = 0; level < 50_000; level += 1) {
      node = { children: [node], type: 'box' };
    }

    expect(() => parseUiBlueprint(documentOf(node))).toThrow(UiBlueprintError);
  });
});

describe('parseUiBlueprint(): untrusted content', () => {
  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '{{constructor.prototype}}',
    '</ore-text><ore-button>injected</ore-button>',
  ])('accepts %s as plain text data, to be rendered as text', (payload) => {
    expect(() => parseUiBlueprint(documentOf(textNode({ text: payload })))).not.toThrow();
  });

  it('never copies a rejected field into the returned document', () => {
    const result = safeParseUiBlueprint(documentOf(textNode({ style: 'color:red' })));
    expect(result.success).toBe(false);
  });
});

describe('safeParseUiBlueprint()', () => {
  it('returns issues instead of throwing', () => {
    const result = safeParseUiBlueprint(documentOf({ type: 'nope' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.length).toBeGreaterThan(0);
  });

  it('returns the document on success', () => {
    const value = documentOf(textNode());
    const result = safeParseUiBlueprint(value);
    expect(result.success).toBe(true);
    if (result.success) expect(result.document.root.type).toBe('text');
  });
});

describe('UI_BLUEPRINT_JSON_SCHEMA', () => {
  it('declares one branch per registered component', () => {
    const defs = UI_BLUEPRINT_JSON_SCHEMA.$defs as { node: { oneOf: Record<string, unknown>[] } };
    expect(defs.node.oneOf).toHaveLength(UI_BLUEPRINT_COMPONENTS.length);
    const types = defs.node.oneOf.map((branch) => (branch.properties as Record<string, { const: string }>).type.const);
    expect(types.sort()).toEqual([...UI_BLUEPRINT_COMPONENTS].sort());
  });

  it('closes every branch to unknown keys', () => {
    const defs = UI_BLUEPRINT_JSON_SCHEMA.$defs as { node: { oneOf: Record<string, unknown>[] } };
    for (const branch of defs.node.oneOf) {
      expect(branch.additionalProperties).toBe(false);
    }
  });
});

describe('registry drift against the installed components', () => {
  const componentSources: Record<string, string> = {
    alert: 'feedback/alert/alert.ts',
    badge: 'feedback/badge/badge.ts',
    box: 'layout/box/box.ts',
    button: 'inputs/button/button.ts',
    card: 'content/card/card.ts',
    checkbox: 'inputs/checkbox/checkbox.ts',
    icon: 'content/icon/icon.ts',
    'number-input': 'inputs/number-input/number-input.ts',
    progress: 'feedback/progress/progress.ts',
    separator: 'layout/separator/separator.ts',
    slider: 'inputs/slider/slider.ts',
    switch: 'inputs/switch/switch.ts',
    text: 'content/text/text.ts',
  };

  it.each(Object.entries(componentSources))('%s registers only props the component declares', (component, path) => {
    const declared = readComponentProps(path);
    const rule = UI_BLUEPRINT_REGISTRY[component as BlueprintNode['type']];

    for (const attribute of rule.attributes) {
      expect(declared.has(attribute), `${component}.${attribute} is not a real prop`).toBe(true);
    }
  });

  it.each(Object.entries(componentSources))(
    '%s accepts only values its own prop.oneOf list allows',
    (component, path) => {
      const declared = readComponentProps(path);
      const rule = UI_BLUEPRINT_REGISTRY[component as BlueprintNode['type']];

      for (const [attribute, values] of Object.entries(rule.values)) {
        const accepted = declared.get(attribute);
        expect(accepted, `${component}.${attribute} is not an enumerated prop`).not.toBeNull();

        for (const value of values) {
          expect(accepted, `${component}.${attribute} does not accept "${String(value)}"`).toContain(value);
        }
      }
    },
  );

  it.each(Object.entries(componentSources))(
    '%s registers every enumerated value the component offers for its accepted props',
    (component, path) => {
      const declared = readComponentProps(path);
      const rule = UI_BLUEPRINT_REGISTRY[component as BlueprintNode['type']];

      // Widening a component enum without widening the registry would make the model able to
      // name a value the validator rejects, so the sets must stay equal per prop.
      for (const [attribute, accepted] of declared) {
        if (!accepted || !rule.attributes.includes(attribute)) continue;
        expect([...rule.values[attribute]].sort(), `${component}.${attribute} drifted from the component`).toEqual(
          [...accepted].sort(),
        );
      }
    },
  );

  it('registers the element each component actually defines', () => {
    for (const [component, path] of Object.entries(componentSources)) {
      const tag = /export const \w+_TAG = '(ore-[^']+)'/u.exec(componentSource(path))?.[1];
      const rule = UI_BLUEPRINT_REGISTRY[component as BlueprintNode['type']];
      expect(tag, `${path} defines no tag`).toBeTruthy();
      expect(rule.tag).toBe(tag);
    }
  });

  it('matches each component child policy', () => {
    // A leaf component has no default slot to fill; a container must have one.
    const containers = ['alert', 'box', 'card'];
    for (const component of UI_BLUEPRINT_COMPONENTS) {
      const rule = UI_BLUEPRINT_REGISTRY[component];
      expect(rule.children, `${component} child policy`).toBe(containers.includes(component));
    }
  });

  it('never registers a component the renderer has no case for', () => {
    const renderer = componentSource('blueprint/render.ts');
    for (const component of UI_BLUEPRINT_COMPONENTS) {
      expect(renderer).toContain(`case '${component}'`);
    }
  });

  it('creates exactly the registered element in the renderer', () => {
    const renderer = componentSource('blueprint/render.ts');
    const created = [...renderer.matchAll(/createElement\('(ore-[a-z-]+)'\)/g)].map((match) => match[1]).sort();
    expect([...new Set(created)]).toEqual(UI_BLUEPRINT_COMPONENTS.map((c) => UI_BLUEPRINT_REGISTRY[c].tag).sort());
  });

  it('keeps the exported node union in step with the registry', () => {
    const contract = componentSource('blueprint/blueprint.ts');
    const union = /export type BlueprintNode =([\s\S]*?);/.exec(contract)?.[1] ?? '';
    // Interface names are PascalCase (BlueprintNumberInputNode); component ids are kebab-case
    // ('number-input'), so insert a dash before each interior capital before lowercasing.
    const members = [...union.matchAll(/Blueprint(\w+)Node/g)]
      .map((match) => match[1].replace(/(?<!^)([A-Z])/g, '-$1').toLowerCase())
      .sort();
    expect(members).toEqual([...UI_BLUEPRINT_COMPONENTS].sort());
  });

  it.each(Object.entries(componentSources))('%s stays closed to props the registry omits', (component, path) => {
    const declared = readComponentProps(path);
    const rule = UI_BLUEPRINT_REGISTRY[component as BlueprintNode['type']];

    // Deliberately omitted: anything that routes, links, styles, or fires a host callback.
    const mustStayOut = ['href', 'target', 'rel', 'type', 'onClick', 'onChange'];
    for (const prop of mustStayOut) {
      if (!declared.has(prop)) continue;
      expect(rule.attributes, `${component}.${prop} must not be registrable`).not.toContain(prop);
    }
  });
});

describe('type surface', () => {
  it('narrows a validated node by discriminant', () => {
    const parsed = parseUiBlueprint(documentOf({ children: [textNode()], type: 'card' }));
    const root: BlueprintNode = parsed.root;
    if (root.type === 'card') {
      expect(root.children).toHaveLength(1);
    } else {
      throw new Error('Expected a card root.');
    }
  });
});
