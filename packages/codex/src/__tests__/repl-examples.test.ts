import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { readReplExamples } from '../../scripts/repl-examples.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../..');

describe('readReplExamples', () => {
  it('returns [] for a package with no REPL examples directory', () => {
    expect(readReplExamples(REPO_ROOT, 'not-a-real-package')).toEqual([]);
  });

  it('returns [] for DOM-output packages excluded from the REPL', () => {
    expect(readReplExamples(REPO_ROOT, 'refine')).toEqual([]);
  });

  it('extracts id, name, and code for a known arsenal example', () => {
    const examples = readReplExamples(REPO_ROOT, 'arsenal');

    expect(examples.length).toBeGreaterThan(0);

    const debounce = examples.find((e) => e.id === 'function-debounce');

    expect(debounce).toBeDefined();
    expect(debounce!.name.length).toBeGreaterThan(0);
    expect(debounce!.code).toContain("import { debounce } from '@vielzeug/arsenal'");
  });

  it('returns examples sorted by id', () => {
    const examples = readReplExamples(REPO_ROOT, 'arsenal');
    const ids = examples.map((e) => e.id);

    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it('preserves escaped template-literal interpolation as literal text, not evaluated code', () => {
    const debounce = readReplExamples(REPO_ROOT, 'arsenal').find((e) => e.id === 'function-debounce')!;

    expect(debounce.code).toContain('${trailingCount}');
  });
});
