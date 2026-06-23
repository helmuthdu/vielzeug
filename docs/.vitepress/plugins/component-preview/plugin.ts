// plugin.ts
//
// Vite virtual-module plugin that makes sigil's IIFE bundle, peer dependencies,
// and inlined CSS available to ComponentPreview (and any future component that
// needs to render sigil components inside a sandboxed iframe).
//
// srcdoc iframes have a null origin and cannot load external resources, so all
// assets are inlined at build time via three virtual modules:
//
//   sigil-preview:css  — sigil's stylesheet with @import rules fully inlined
//   sigil-preview:deps — all IIFE peer deps concatenated in load order
//   sigil-preview:js   — sigil's own IIFE bundle

import type { Plugin } from 'vite';

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const JS_ID = 'sigil-preview:js';
const CSS_ID = 'sigil-preview:css';
const DEPS_ID = 'sigil-preview:deps';

const pkgDir = resolve(__dirname, '../../../../packages');
const sigilDir = resolve(pkgDir, 'sigil/dist');

// createRequire from within .pnpm/node_modules so it can resolve hoisted
// pnpm packages. Subpath exports on these packages don't expose dist files
// directly, so we resolve the CJS main entry and navigate to the UMD build.
const req = createRequire(resolve(__dirname, '../../../../node_modules/.pnpm/node_modules/placeholder'));

const temporalUmd = resolve(dirname(req.resolve('@js-temporal/polyfill')), '../dist/index.umd.js');
const lucideUmd = resolve(dirname(req.resolve('lucide')), '../../dist/umd/lucide.js');

// Load order: each entry must appear after its own dependencies.
// Temporal → Ripple → Arsenal → Craft(Ripple) → Orbit(Arsenal) → Tempo(Temporal) → Dnd → Lucide
const depPaths = [
  temporalUmd,
  resolve(pkgDir, 'ripple/dist/ripple.iife.js'),
  resolve(pkgDir, 'arsenal/dist/arsenal.iife.js'),
  resolve(pkgDir, 'craft/dist/craft.iife.js'),
  resolve(pkgDir, 'orbit/dist/orbit.iife.js'),
  resolve(pkgDir, 'tempo/dist/tempo.iife.js'),
  resolve(pkgDir, 'dnd/dist/dnd.iife.js'),
  lucideUmd,
];

// @js-temporal/polyfill UMD registers as globalThis.temporal (lowercase);
// sigil.iife.js expects Temporal (uppercase).
// tempo.iife.js maps @js-temporal/polyfill to window.Temporal and re-exports
// it as Tempo.Temporal via `get(){ return t.Temporal }` where t=window.Temporal.
// So window.Temporal must be the polyfill exports object {Intl,Temporal,...},
// not the native Temporal namespace. Override unconditionally so native Temporal
// (Chrome 129+) doesn't shadow the polyfill exports shape that tempo expects.
const temporalShim = 'if(typeof temporal!=="undefined"){var Temporal=temporal;}';

// Lucide UMD registers as window.lucide (lowercase); sigil.iife.js expects Lucide (uppercase).
const lucideShim = 'if(typeof Lucide==="undefined"&&typeof lucide!=="undefined"){var Lucide=lucide;}';

// Recursively replace @import url(...) with file contents so the resulting
// CSS string is fully self-contained and passes the iframe's CSP.
function inlineCss(filePath: string): string {
  const dir = dirname(filePath);
  const src = readFileSync(filePath, 'utf-8');

  return src.replace(/@import\s+url\(['"]?([^'")\s]+)['"]?\)\s*;?/g, (_match, ref) => {
    try {
      return inlineCss(resolve(dir, ref));
    } catch {
      return '';
    }
  });
}

export function componentPreviewPlugin(): Plugin {
  return {
    load(id) {
      if (id === '\0' + JS_ID) {
        const code = readFileSync(resolve(sigilDir, 'sigil.iife.js'), 'utf-8');

        return `export default ${JSON.stringify(code)}`;
      }

      if (id === '\0' + CSS_ID) {
        const code = inlineCss(resolve(sigilDir, 'styles/styles.css'));

        return `export default ${JSON.stringify(code)}`;
      }

      if (id === '\0' + DEPS_ID) {
        const depContents = depPaths.map((p) => readFileSync(p, 'utf-8'));

        // Inject shims immediately after their respective UMD bundles.
        depContents.splice(1, 0, temporalShim); // after temporalUmd (index 0)

        const combined = [...depContents, lucideShim].join('\n;\n');

        return `export default ${JSON.stringify(combined)}`;
      }
    },
    name: 'sigil-preview',
    resolveId(id) {
      if (id === JS_ID || id === CSS_ID || id === DEPS_ID) return '\0' + id;
    },
  };
}
