import { test as base } from '@playwright/test';
/**
 * Shared Playwright test fixture for refine e2e specs.
 *
 * Loads the full IIFE dependency stack (same load order as verify-layout.mjs and the
 * docs component preview) via page.setContent() with inline scripts. Tests call
 * mountComponent(html) to render arbitrary HTML inside a styled frame element.
 *
 * No dev server is required — all scripts are inlined from the built dist/ outputs.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const PKG = path.resolve(__dirname, '../../..');
const PNPM_STORE = path.join(ROOT, 'common/temp/node_modules/.pnpm');

// Paths to UMD/IIFE bundles — mirrors verify-layout.mjs's resolveDepScripts()
const TEMPORAL_UMD = path.join(
  PNPM_STORE,
  '@js-temporal+polyfill@0.5.1/node_modules/@js-temporal/polyfill/dist/index.umd.js',
);
const LUCIDE_UMD = path.join(PNPM_STORE, 'lucide@1.23.0/node_modules/lucide/dist/umd/lucide.js');

const IIFE_ENTRIES: Array<{ path: string; shim?: string }> = [
  { path: TEMPORAL_UMD, shim: 'if(typeof temporal!=="undefined"){window.Temporal=temporal;}' },
  { path: path.join(PKG, 'ripple/dist/ripple.iife.js') },
  { path: path.join(PKG, 'arsenal/dist/arsenal.iife.js') },
  { path: path.join(PKG, 'keymap/dist/keymap.iife.js') },
  { path: path.join(PKG, 'ore/dist/ore.iife.js') },
  { path: path.join(PKG, 'orbit/dist/orbit.iife.js') },
  { path: path.join(PKG, 'tempo/dist/tempo.iife.js') },
  { path: path.join(PKG, 'dnd/dist/dnd.iife.js') },
  { path: LUCIDE_UMD, shim: 'if(typeof Lucide==="undefined"&&typeof lucide!=="undefined"){window.Lucide=lucide;}' },
  { path: path.join(PKG, 'refine/dist/refine.iife.js') },
];

const STYLES_CSS = readFileSync(path.join(PKG, 'refine/dist/styles/styles.css'), 'utf-8');

// Pre-build the script tags string once (expensive — large IIFE bundles)
const IIFE_SCRIPT_TAGS = IIFE_ENTRIES.map(({ path: p, shim }) => {
  const content = readFileSync(p, 'utf-8');
  const tag = `<script>${content}</script>`;

  return shim ? `${tag}\n<script>${shim}</script>` : tag;
}).join('\n');

/** Returns a full HTML page with all IIFE deps loaded and an empty `.frame` div. */
function buildPage(bodyHtml = ''): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${STYLES_CSS}</style>
<style>body{background:#fff;margin:0;padding:40px;font-family:sans-serif;}.frame{max-width:600px;}</style>
</head>
<body>
<div class="frame">${bodyHtml}</div>
${IIFE_SCRIPT_TAGS}
</body>
</html>`;
}

// Eagerly build the base page HTML once at module load time
const BASE_PAGE_HTML = buildPage();

export interface RefinePage {
  /** Renders `html` inside `.frame` and waits for custom elements to upgrade. */
  mountComponent(html: string): Promise<void>;
}

// Custom fixture that pre-loads the IIFE stack once per test
export const test = base.extend<{ refinePage: RefinePage }>({
  refinePage: async ({ page }, use) => {
    // Load the full IIFE stack via setContent (no file:// URL restrictions)
    await page.setContent(BASE_PAGE_HTML, { waitUntil: 'domcontentloaded' });

    const fixture: RefinePage = {
      async mountComponent(html: string) {
        await page.evaluate((innerHtml) => {
          const frame = document.querySelector('.frame') as HTMLElement;

          frame.innerHTML = innerHtml;
        }, html);
        // Wait for custom elements registry to settle
        await page.waitForFunction(() =>
          customElements
            .whenDefined('ore-button')
            .then(() => true)
            .catch(() => true),
        );
        // Give micro-tasks a chance to run (ore reactive system, attribute upgrades)
        await page.waitForTimeout(50);
      },
    };

    await use(fixture);
  },
});

export { expect } from '@playwright/test';
