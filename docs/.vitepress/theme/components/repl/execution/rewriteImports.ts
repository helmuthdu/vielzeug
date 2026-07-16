/**
 * Rewrites `import ... from '@vielzeug/<lib>'` into a lookup against the global variable
 * the library's IIFE bundle exposes inside the sandboxed iframe (e.g. `window.Arsenal`).
 *
 * Why regex and not the TypeScript AST: by the time this runs, `transpileTypeScript()`
 * has already emitted plain JS via the real compiler (see transpile.ts) — all TS-only
 * syntax (types, `as` casts, generics) is already gone. The only thing left to translate
 * is the small, fixed set of ESM import forms below, so a handful of anchored regexes are
 * simpler to read and test than pulling in a second AST pass just for this.
 *
 * Supported forms:
 *   import { a, b as c } from '@vielzeug/lib'  ->  const { a, b: c } = window.Lib
 *   import Lib from '@vielzeug/lib'            ->  const Lib = window.Lib
 *   import * as ns from '@vielzeug/lib'        ->  const ns = window.Lib
 *   import '@vielzeug/lib'                     ->  (removed — bundle is already loaded)
 *
 * Any import that isn't `@vielzeug/*` has nothing to resolve to inside the sandbox and is
 * removed, matching the REPL's long-standing rule that examples only use top-level
 * `@vielzeug/<name>` imports (see `.ai/tasks/repl.md`).
 */

const NAMED_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]@vielzeug\/([\w-]+)['"];?/g;
const NAMESPACE_IMPORT = /import\s*\*\s*as\s+(\w+)\s*from\s*['"]@vielzeug\/([\w-]+)['"];?/g;
const DEFAULT_IMPORT = /import\s+(\w+)\s*from\s*['"]@vielzeug\/([\w-]+)['"];?/g;
const SIDE_EFFECT_IMPORT = /import\s*['"]@vielzeug\/([\w-]+)['"];?/g;
const ANY_REMAINING_IMPORT = /^\s*import\s.+from\s*['"][^'"]+['"];?\s*$/gm;

function toBindingClause(specifiers: string): string {
  const bindings = specifiers
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+as\s+/, ': '));

  return `{ ${bindings.join(', ')} }`;
}

/** Maps a `@vielzeug/<lib>` specifier to the global variable name exposed in the sandbox. */
export type GlobalNameResolver = (lib: string) => string;

export function rewriteVielzeugImports(code: string, resolveGlobalName: GlobalNameResolver): string {
  return code
    .replace(NAMED_IMPORT, (_match, specifiers: string, lib: string) => {
      const clause = toBindingClause(specifiers);

      return clause === '{  }' ? '' : `const ${clause} = window.${resolveGlobalName(lib)};`;
    })
    .replace(
      NAMESPACE_IMPORT,
      (_match, binding: string, lib: string) => `const ${binding} = window.${resolveGlobalName(lib)};`,
    )
    .replace(
      DEFAULT_IMPORT,
      (_match, binding: string, lib: string) => `const ${binding} = window.${resolveGlobalName(lib)};`,
    )
    .replace(SIDE_EFFECT_IMPORT, '')
    .replace(ANY_REMAINING_IMPORT, '');
}
