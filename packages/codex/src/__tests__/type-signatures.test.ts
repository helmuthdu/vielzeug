import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolvePackageExports } from '../../scripts/type-signatures.ts';

describe('type-only package exports', () => {
  it('resolves re-exported aliases and interfaces to their declarations and documentation', () => {
    const root = mkdtempSync(join(tmpdir(), 'codex-type-exports-'));
    try {
      const source = join(root, 'packages/example/src');
      mkdirSync(source, { recursive: true });
      writeFileSync(join(source, 'index.ts'), "export type { Hint, Options } from './types';\n");
      writeFileSync(
        join(source, 'types.ts'),
        `
/** A native keyboard action label. */
export type Hint = 'enter' | 'send';
/** Options for a native editor. */
export interface Options { hint?: Hint; }
`,
      );
      const [entry] = resolvePackageExports(root, ['example']);

      expect(entry.exports).toEqual([
        {
          doc: 'A native keyboard action label.',
          kind: 'type',
          name: 'Hint',
          signature: "/** A native keyboard action label. */\nexport type Hint = 'enter' | 'send';",
        },
        {
          doc: 'Options for a native editor.',
          kind: 'interface',
          name: 'Options',
          signature: '/** Options for a native editor. */\nexport interface Options { hint?: Hint; }',
        },
      ]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
