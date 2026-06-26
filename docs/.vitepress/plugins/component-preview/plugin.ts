// plugin.ts
//
// Vite virtual-module plugin that makes refine's IIFE bundle, peer dependencies,
// and inlined CSS available to ComponentPreview (and any future component that
// needs to render refine components inside a sandboxed iframe).
//
// srcdoc iframes have a null origin and cannot load external resources, so all
// assets are inlined at build time via three virtual modules:
//
//   refine-preview:css  — refine's stylesheet with @import rules fully inlined
//   refine-preview:deps — all IIFE peer deps concatenated in load order
//   refine-preview:js   — refine's own IIFE bundle
//
// HMR: CSS-only dist changes send a custom WS event (REFINE_CSS_HMR_EVENT)
// instead of a full page reload. Consumers subscribe via useRefineHmr().

import type { Plugin } from 'vite';

export { REFINE_CSS_HMR_EVENT } from './constants';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REFINE_CSS_HMR_EVENT } from './constants';

const __dirname = dirname(fileURLToPath(import.meta.url));

const JS_ID = 'refine-preview:js';
const CSS_ID = 'refine-preview:css';
const DEPS_ID = 'refine-preview:deps';

const pkgDir = resolve(__dirname, '../../../../packages');
const refineDir = resolve(pkgDir, 'refine/dist');

// createRequire from within .pnpm/node_modules so it can resolve hoisted
// pnpm packages. Subpath exports on these packages don't expose dist files
// directly, so we resolve the CJS main entry and navigate to the UMD build.
const req = createRequire(resolve(__dirname, '../../../../node_modules/.pnpm/node_modules/placeholder'));
const temporalUmd = resolve(dirname(req.resolve('@js-temporal/polyfill')), '../dist/index.umd.js');
const lucideUmd = resolve(dirname(req.resolve('lucide')), '../../dist/umd/lucide.js');

// Load order: each entry must appear after its own dependencies.
// Temporal → Ripple → Arsenal → Ore(Ripple) → Orbit(Arsenal) → Prism(Ripple,Orbit) → Tempo(Temporal) → Dnd → Lucide
const depPaths = [
  temporalUmd,
  resolve(pkgDir, 'ripple/dist/ripple.iife.js'),
  resolve(pkgDir, 'arsenal/dist/arsenal.iife.js'),
  resolve(pkgDir, 'ore/dist/ore.iife.js'),
  resolve(pkgDir, 'orbit/dist/orbit.iife.js'),
  resolve(pkgDir, 'prism/dist/prism.iife.js'),
  resolve(pkgDir, 'tempo/dist/tempo.iife.js'),
  resolve(pkgDir, 'dnd/dist/dnd.iife.js'),
  lucideUmd,
];

// @js-temporal/polyfill UMD registers as globalThis.temporal (lowercase);
// refine.iife.js expects Temporal (uppercase).
// tempo.iife.js maps @js-temporal/polyfill to window.Temporal and re-exports
// it as Tempo.Temporal via `get(){ return t.Temporal }` where t=window.Temporal.
// So window.Temporal must be the polyfill exports object {Intl,Temporal,...},
// not the native Temporal namespace. Override unconditionally so native Temporal
// (Chrome 129+) doesn't shadow the polyfill exports shape that tempo expects.
const temporalShim = 'if(typeof temporal!=="undefined"){var Temporal=temporal;}';

// Lucide UMD registers as window.lucide (lowercase); refine.iife.js expects Lucide (uppercase).
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
    configureServer(server) {
      // Watch the refine dist directory so that when `pnpm --filter @vielzeug/refine build:bundle:watch`
      // rebuilds the IIFE bundle, the docs dev server picks up the changes automatically
      // without requiring a manual restart. Use `pnpm docs:dev:refine` to run both together.
      server.watcher.add(refineDir);

      server.watcher.on('change', (file) => {
        if (!file.startsWith(refineDir)) return;

        const isCssOnly = file.endsWith('.css');

        // Invalidate only the affected virtual module(s).
        const toInvalidate = isCssOnly ? [CSS_ID] : [JS_ID, CSS_ID, DEPS_ID];

        for (const id of toInvalidate) {
          const mod = server.moduleGraph.getModuleById('\0' + id);

          if (mod) server.moduleGraph.invalidateModule(mod);
        }

        if (isCssOnly) {
          // Hot-patch CSS into live iframes without a full page reload.
          // useComponentPreview listens for this event and calls sandbox.patchStyle().
          const css = inlineCss(resolve(refineDir, 'styles/styles.css'));

          server.ws.send({ data: { css }, event: REFINE_CSS_HMR_EVENT, type: 'custom' });
        } else {
          // JS changes re-register custom elements — full reload required.
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
    load(id) {
      if (id === '\0' + JS_ID) {
        const code = readFileSync(resolve(refineDir, 'refine.iife.js'), 'utf-8');

        return `export default ${JSON.stringify(code)}`;
      }

      if (id === '\0' + CSS_ID) {
        const refine = inlineCss(resolve(refineDir, 'styles/styles.css'));
        const prism = readFileSync(resolve(pkgDir, 'prism/dist/theme/prism.css'), 'utf-8');

        return `export default ${JSON.stringify(refine + '\n' + prism)}`;
      }

      if (id === '\0' + DEPS_ID) {
        const depContents = depPaths.map((p) => readFileSync(p, 'utf-8'));

        // Inject shims immediately after their respective UMD bundles.
        depContents.splice(1, 0, temporalShim); // after temporalUmd (index 0)

        const combined = [...depContents, lucideShim].join('\n;\n');

        return `export default ${JSON.stringify(combined)}`;
      }
    },
    name: 'refine-preview',
    resolveId(id) {
      if (id === JS_ID || id === CSS_ID || id === DEPS_ID) return '\0' + id;
    },
  };
}
