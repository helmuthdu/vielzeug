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
import { existsSync, readFileSync } from 'node:fs';
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
const refineSrcStylesDir = resolve(pkgDir, 'refine/src/styles');

// createRequire from within .pnpm/node_modules so it can resolve hoisted
// pnpm packages. Subpath exports on these packages don't expose dist files
// directly, so we resolve the CJS main entry and navigate to the UMD build.
const req = createRequire(resolve(__dirname, '../../../../node_modules/.pnpm/node_modules/placeholder'));
const temporalUmd = resolve(dirname(req.resolve('@js-temporal/polyfill')), '../dist/index.umd.js');
const lucideUmd = resolve(dirname(req.resolve('lucide')), '../../dist/umd/lucide.js');

// Load order: each entry must appear after its own dependencies.
// Temporal → Ripple → Arsenal → Keymap → Ore(Ripple) → Orbit(Arsenal) → Prism(Ripple,Orbit) → Tempo(Temporal) → Dnd → Lucide
const depPaths = [
  temporalUmd,
  resolve(pkgDir, 'ripple/dist/ripple.iife.js'),
  resolve(pkgDir, 'arsenal/dist/arsenal.iife.js'),
  resolve(pkgDir, 'keymap/dist/keymap.iife.js'),
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
      // Watch refine's src/styles directly — CSS changes hot-patch live iframes
      // without any build step (color-mix, oklch, light-dark are natively supported
      // in all modern browsers so lightningcss compilation is not needed in dev).
      server.watcher.add(refineSrcStylesDir);

      // Also watch dist for JS/IIFE changes when running docs:dev:refine.
      server.watcher.add(refineDir);

      // `pnpm build` empties `dist/` before rewriting it (rimraf + vite `emptyOutDir`), which
      // chokidar reports as `unlink` + `add` rather than `change`. Listening to `change` only
      // meant a full package rebuild while `docs:dev` was running left the virtual modules
      // pinned to whatever they resolved to mid-rebuild (often an empty/missing dist file),
      // permanently blanking the preview until the dev server was restarted. Handle all three.
      const handleWatchEvent = (file: string) => {
        const isSrcCss = file.startsWith(refineSrcStylesDir) && file.endsWith('.css');
        const isDistFile = file.startsWith(refineDir);

        if (!isSrcCss && !isDistFile) return;

        if (isSrcCss || (isDistFile && file.endsWith('.css'))) {
          const mod = server.moduleGraph.getModuleById('\0' + CSS_ID);

          if (mod) server.moduleGraph.invalidateModule(mod);

          const distCssPath = resolve(refineDir, 'styles/styles.css');
          const srcCssPath = resolve(refineSrcStylesDir, 'styles.css');
          const css = inlineCss(existsSync(srcCssPath) ? srcCssPath : distCssPath);

          server.ws.send({ data: { css }, event: REFINE_CSS_HMR_EVENT, type: 'custom' });

          return;
        }

        // JS/IIFE dist change — full reload required (custom element re-registration).
        for (const id of [JS_ID, CSS_ID, DEPS_ID]) {
          const mod = server.moduleGraph.getModuleById('\0' + id);

          if (mod) server.moduleGraph.invalidateModule(mod);
        }

        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('add', handleWatchEvent).on('change', handleWatchEvent).on('unlink', handleWatchEvent);
    },
    load(id) {
      if (id === '\0' + JS_ID) {
        const jsPath = resolve(refineDir, 'refine.iife.js');
        const code = existsSync(jsPath) ? readFileSync(jsPath, 'utf-8') : '';

        return `export default ${JSON.stringify(code)}`;
      }

      if (id === '\0' + CSS_ID) {
        // Prefer src CSS (no build needed); fall back to dist when src unavailable.
        const distCssPath = resolve(refineDir, 'styles/styles.css');
        const srcCssPath = resolve(refineSrcStylesDir, 'styles.css');
        const refineCssPath = existsSync(srcCssPath) ? srcCssPath : distCssPath;
        const refine = inlineCss(refineCssPath);
        const prism = readFileSync(resolve(pkgDir, 'prism/dist/theme/prism.css'), 'utf-8');

        return `export default ${JSON.stringify(refine + '\n' + prism)}`;
      }

      if (id === '\0' + DEPS_ID) {
        const depContents = depPaths.map((p) => (existsSync(p) ? readFileSync(p, 'utf-8') : ''));

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
