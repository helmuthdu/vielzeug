import { describe, expect, it } from 'vitest';

import { rewriteVielzeugImports } from '../rewriteImports';

const resolve = (lib: string) => lib.charAt(0).toUpperCase() + lib.slice(1);

describe('rewriteVielzeugImports', () => {
  it('rewrites named imports to a destructured global lookup', () => {
    const out = rewriteVielzeugImports("import { chunk, uniq } from '@vielzeug/arsenal';", resolve);

    expect(out).toBe('const { chunk, uniq } = window.Arsenal;');
  });

  it('rewrites aliased named imports (a as b) to object-destructure aliasing (a: b)', () => {
    const out = rewriteVielzeugImports("import { chunk as splitInto } from '@vielzeug/arsenal';", resolve);

    expect(out).toBe('const { chunk: splitInto } = window.Arsenal;');
  });

  it('rewrites default imports', () => {
    const out = rewriteVielzeugImports("import Rune from '@vielzeug/rune';", resolve);

    expect(out).toBe('const Rune = window.Rune;');
  });

  it('rewrites namespace imports', () => {
    const out = rewriteVielzeugImports("import * as arsenal from '@vielzeug/arsenal';", resolve);

    expect(out).toBe('const arsenal = window.Arsenal;');
  });

  it('drops side-effect-only imports entirely', () => {
    const out = rewriteVielzeugImports("import '@vielzeug/arsenal';\nconsole.log(1);", resolve);

    expect(out.trim()).toBe('console.log(1);');
  });

  it('drops imports from any non-@vielzeug specifier', () => {
    const out = rewriteVielzeugImports("import lodash from 'lodash';\nconsole.log(1);", resolve);

    expect(out.trim()).toBe('console.log(1);');
  });

  it('rewrites multiple import statements independently', () => {
    const out = rewriteVielzeugImports(
      "import { chunk } from '@vielzeug/arsenal';\nimport { signal } from '@vielzeug/ripple';\nchunk(signal);",
      resolve,
    );

    expect(out).toBe('const { chunk } = window.Arsenal;\nconst { signal } = window.Ripple;\nchunk(signal);');
  });

  it('leaves non-import code untouched', () => {
    const code = 'const x = 1;\nconsole.log(x);';

    expect(rewriteVielzeugImports(code, resolve)).toBe(code);
  });
});
