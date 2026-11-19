import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { splitDocSections } from '../../../../scripts/lib/codex-markdown.ts';
import type { PackageEntry, Snapshot } from '../types.js';

/** The version the runtime loader expects for snapshots in this package's tests. */
export const codexVersion = (
  JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as { version: string }
).version;

export const demoPage = `# Demo

Intro text about the demo package and its signals.

## Signals

Use \`signal()\` to create reactive state. Signals hold values.

### Writing signals

Call \`set()\` to replace a signal's value.

## Animation

Animate values with \`spring()\`.
`;

const demoIndex = '# Demo package\n\nThe demo package.';

/** Sections computed by the real splitter, so fixtures cannot drift from generator offsets. */
function sectionsFor(markdown: string, page: string, introHeading: string) {
  return splitDocSections(markdown, introHeading).map((section) => ({
    end: section.end,
    heading: section.heading,
    level: section.level as 2 | 3,
    page,
    start: section.start,
  }));
}

export const demoPackage: PackageEntry = {
  examples: [{ code: 'const s = signal(1)', id: 'basic', name: 'Basic' }],
  exports: [
    {
      doc: 'Create reactive state.',
      kind: 'function',
      name: 'signal',
      signature: 'export function signal<T>(value: T): Signal<T>',
    },
    { kind: 'function', name: 'spring', signature: 'export function spring(target: number): Signal<number>' },
  ],
  meta: {
    category: 'reactivity',
    description: 'Reactive core',
    keywords: ['signal', 'reactive'],
    name: '@vielzeug/demo',
    related: ['ripple'],
    slug: 'demo',
    version: '1.0.0',
  },
  pages: { api: demoPage, index: demoIndex },
  sections: [...sectionsFor(demoPage, 'api', 'Demo'), ...sectionsFor(demoIndex, 'index', 'Demo package')],
  titles: { api: 'Demo API', index: 'Demo package' },
};

export function snapshotFixture(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    components: [
      {
        attributes: [
          { name: 'disabled', type: 'boolean' },
          { default: 'md', name: 'size', type: "'sm' | 'md' | 'lg'" },
          { name: 'variant', type: "'primary' | 'ghost'" },
        ],
        docPage: 'components/button',
        events: [{ name: 'press' }],
        slots: [{ name: 'icon' }],
        summary: 'A button.',
        tag: 'ore-button',
      },
    ],
    packages: [demoPackage],
    tokens: [
      { comment: 'Base spacing unit', name: '--space-100', value: '0.25rem' },
      { name: '--color-bg', value: '#ffffff' },
    ],
    version: codexVersion,
    ...overrides,
  };
}
