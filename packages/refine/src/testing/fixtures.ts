import AxeBuilder from '@axe-core/playwright';
import { test as base } from '@playwright/test';
/**
 * Shared Playwright test fixture for refine e2e specs — the real-browser counterpart to this
 * same folder's jsdom `axeCheck()`/ARIA helpers (`index.ts`), just Playwright/Chromium-only
 * instead of jsdom-only. It remains private test infrastructure so every `*.e2e.ts` file's
 * harness lives next to its jsdom equivalent.
 *
 * Loads the full IIFE dependency stack (same load order as verify-layout.mjs and the
 * docs component preview) via page.setContent() with inline scripts. Tests call
 * mountComponent(html) to render arbitrary HTML inside a styled frame element.
 *
 * e2e specs are co-located next to the component they cover (`<component>.e2e.ts`, matching
 * `<component>.test.ts`'s jsdom co-location) rather than centralized here — this file is just
 * the shared harness/helpers every one of them imports.
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

// The token stylesheet keeps its imports external so consumers' bundlers can dedupe/split them.
// Pointing a `<link>` at it via
// `page.setContent()` fails silently: the page's own origin is `about:blank`, so the `file://`
// stylesheet (and its own nested `@import`s) is cross-origin and Chromium never applies it —
// `getComputedStyle()` on anything under `.frame` then sees none of the `--size-*`/`--color-*`
// tokens every component's CSS falls back through, not even as a loud error. Reading and
// Concatenating the files directly in the production cascade order
// sidesteps needing a real file:// page origin at all.
const STYLES_DIR = path.join(PKG, 'refine/dist/styles');
const STYLES_CSS = ['preflight.css', 'theme.css', 'animation.css', 'layer.css']
  .map((name) => readFileSync(path.join(STYLES_DIR, name), 'utf-8'))
  .join('\n');

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

// Page-level rules that produce false positives for component-level axe scans (axe still runs
// on the full document; these rules target <html>/<head> structure that `.frame` doesn't own).
const PAGE_LEVEL_RULES: Record<string, { enabled: false }> = {
  'document-title': { enabled: false },
  'html-has-lang': { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
  region: { enabled: false },
};

/**
 * Runs axe against `selector` (default `.frame`, the component container) with the full
 * wcag2a/wcag2aa/best-practice ruleset — including `color-contrast` and `target-size`, which the
 * jsdom-based `axeCheck()` in `vitest.setup.ts` must disable (no CSS layout engine there). Shared
 * by every component's `*.e2e.ts` a11y tests so the rule config lives in exactly one place.
 */
export async function axeCheck(
  page: ConstructorParameters<typeof AxeBuilder>[0]['page'],
  selector = '.frame',
): ReturnType<AxeBuilder['analyze']> {
  return new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .options({
      rules: {
        ...PAGE_LEVEL_RULES,
        'color-contrast': { enabled: true },
        'target-size': { enabled: true },
      },
    })
    .analyze();
}
