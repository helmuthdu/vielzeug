#!/usr/bin/env node
// Headless-Chrome layout smoke check for CSS-layout-sensitive refine components.
//
// Why this exists: jsdom has no layout engine, and can't even *parse* `@layer` (it silently
// drops the whole ruleset every refine component ships its styles in) — so flex/box-model
// regressions in these components are invisible to `pnpm test`. Three separate chat-message
// layout bugs (a bubble stretching to fill its row, text misaligned across sibling elements,
// phantom blank lines from template whitespace) shipped past review before this script did.
// See docs/refine/components/chat-message.md's revision history for the concrete symptoms.
//
// This is a manual/dev-time check, not wired into `pnpm test`/CI — it needs a real Chrome or
// Chromium binary, which this repo doesn't otherwise depend on, and this repo has no existing
// browser-automation tooling (no Playwright/Puppeteer) to build on instead. Run it after
// touching layout-sensitive CSS: `pnpm verify:layout`.
//
// Pure functions below are exported for scripts/__tests__/verify-layout.test.mjs. Side effects
// (finding Chrome, spawning it, reading dist/) are guarded by the `isMain` check at the bottom.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMain } from './lib/cli.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');

const CHROME_INSTALL_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

/**
 * First Chrome/Chromium binary found on this machine, or `null`. Checks `CHROME_PATH` first.
 * `exists` is injectable so tests don't need to mock `node:fs`'s native ESM namespace (which
 * Vitest can't `spyOn` — "Module namespace is not configurable in ESM").
 */
export function findChrome(exists = existsSync) {
  const candidates = [process.env.CHROME_PATH, ...CHROME_INSTALL_PATHS].filter(Boolean);

  return candidates.find(exists) ?? null;
}

/**
 * IIFE peer-dependency load order for refine — mirrors
 * `docs/.vitepress/plugins/component-preview/plugin.ts`'s `depPaths`. Keep the two in sync;
 * this doesn't import that file since it's Vite/docs-only tooling with a `Plugin`-shaped
 * export, not a reusable list. Each entry is `{ path, shimAfter? }` — `shimAfter` names the
 * `SHIMS` key to inject right after that script tag.
 */
export function resolveDepScripts(root = ROOT) {
  const pkgDir = join(root, 'packages');
  const req = createRequire(join(root, 'node_modules/.pnpm/node_modules/placeholder'));
  const temporalUmd = join(dirname(req.resolve('@js-temporal/polyfill')), '../dist/index.umd.js');
  const lucideUmd = join(dirname(req.resolve('lucide')), '../../dist/umd/lucide.js');

  return [
    { path: temporalUmd, shimAfter: '@js-temporal/polyfill' },
    { path: join(pkgDir, 'ripple/dist/ripple.iife.js') },
    { path: join(pkgDir, 'arsenal/dist/arsenal.iife.js') },
    { path: join(pkgDir, 'keymap/dist/keymap.iife.js') },
    { path: join(pkgDir, 'ore/dist/ore.iife.js') },
    { path: join(pkgDir, 'orbit/dist/orbit.iife.js') },
    { path: join(pkgDir, 'prism/dist/prism.iife.js') },
    { path: join(pkgDir, 'tempo/dist/tempo.iife.js') },
    { path: join(pkgDir, 'dnd/dist/dnd.iife.js') },
    { path: lucideUmd, shimAfter: 'lucide' },
    { path: join(pkgDir, 'refine/dist/refine.iife.js') },
  ];
}

// Shims placed right after loading their respective UMD script — see
// docs/.vitepress/plugins/component-preview/plugin.ts's identically-named constants for why
// each is needed (case-mismatch between what the UMD bundle registers as a global and what
// refine.iife.js expects to find).
const SHIMS = {
  '@js-temporal/polyfill': 'if(typeof temporal!=="undefined"){var Temporal=temporal;}',
  lucide: 'if(typeof Lucide==="undefined"&&typeof lucide!=="undefined"){var Lucide=lucide;}',
};

/** Builds a self-contained HTML page: peer-dep scripts (each optionally followed by its shim,
 * keyed by `depScripts`'s parallel `shimAfter` labels), `bodyHtml`, then `checkScript`, which
 * must `console.log('RESULT_JSON:' + JSON.stringify(...))` with whatever it measured. */
export function buildScenarioHtml(bodyHtml, checkScript, depScripts) {
  const scriptTags = depScripts
    .map(({ path, shimAfter }) => {
      const tag = `<script src="file://${path}"></script>`;

      return shimAfter ? `${tag}\n<script>${SHIMS[shimAfter]}</script>` : tag;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><link rel="stylesheet" href="file://${join(ROOT, 'packages/refine/dist/styles/styles.css')}">
<style>body{background:#111;margin:0;padding:40px;font-family:sans-serif;}.frame{max-width:500px;}</style>
</head>
<body>
<div class="frame">${bodyHtml}</div>
${scriptTags}
<script>
  window.addEventListener('load', () => {
    setTimeout(() => { ${checkScript} }, 300);
  });
</script>
</body>
</html>`;
}

/** Extracts the `RESULT_JSON:{...}` payload `buildScenarioHtml`'s check script logs to the
 * console (captured via Chrome's `--enable-logging=stderr`). `null` if the page never logged
 * one — a real page/script error, not a scenario failure to report as a value mismatch. */
export function parseResult(stderr) {
  const match = stderr.match(/RESULT_JSON:(\{.*\})(?="|$)/);

  return match ? JSON.parse(match[1]) : null;
}

/**
 * Concrete regressions this project has actually shipped — not a speculative framework for
 * arbitrary future components. Add a scenario here when a *new* real layout bug is found and
 * fixed; this isn't a general-purpose visual-regression harness.
 */
export const SCENARIOS = [
  {
    check: (r) => r.bubbleWidth < r.rowWidth * 0.6,
    describe: (r) => `bubble width ${r.bubbleWidth}px should be well under the row's ${r.rowWidth}px`,
    // Deliberately the default `sender` (assistant), not `"user"` — `:host([sender='user'])`
    // carries its own `align-items: flex-end` override that happens to *also* prevent
    // stretch, which would mask a regression in the shared, unqualified `.column` rule.
    html: '<ore-chat-message id="msg">Hi</ore-chat-message>',
    measure: `
      const el = document.getElementById('msg');
      const row = el.shadowRoot.querySelector('.row');
      const bubble = el.shadowRoot.querySelector('.bubble');
      console.log('RESULT_JSON:' + JSON.stringify({
        bubbleWidth: bubble.getBoundingClientRect().width,
        rowWidth: row.getBoundingClientRect().width,
      }));
    `,
    name: 'chat-message bubble hugs content width instead of stretching to fill the row',
  },
  {
    check: (r) => Math.abs(r.nameTextX - r.contentTextX) < 1,
    describe: (r) => `name text starts at x=${r.nameTextX}, bubble text starts at x=${r.contentTextX} — should match`,
    html: `<ore-chat-message id="msg" sender="assistant" name="Assistant">
      <ore-avatar slot="avatar" initials="AI" size="sm"></ore-avatar>
      Here is the summary.
    </ore-chat-message>`,
    measure: `
      const el = document.getElementById('msg');
      const name = el.shadowRoot.querySelector('.name');
      const content = el.shadowRoot.querySelector('.content');
      console.log('RESULT_JSON:' + JSON.stringify({
        nameTextX: name.getBoundingClientRect().left + parseFloat(getComputedStyle(name).paddingLeft),
        contentTextX: content.getBoundingClientRect().left,
      }));
    `,
    name: 'chat-message name and bubble text share the same left edge (avatar + name)',
  },
  {
    check: (r) => r.contentHeight < r.lineHeight * 1.5,
    describe: (r) => `content height ${r.contentHeight}px should be about one line-height (${r.lineHeight}px), not several`,
    html: '<ore-chat-message id="msg" sender="assistant">Single line of text.</ore-chat-message>',
    measure: `
      const el = document.getElementById('msg');
      const content = el.shadowRoot.querySelector('.content');
      console.log('RESULT_JSON:' + JSON.stringify({
        contentHeight: content.getBoundingClientRect().height,
        lineHeight: parseFloat(getComputedStyle(content).lineHeight),
      }));
    `,
    name: 'chat-message single-line content has no phantom blank lines from template whitespace',
  },
];

/** Runs one scenario in headless Chrome, returns `{ error?, name, ok, result? }`. */
export function runScenario(scenario, { chromePath, depScripts, root = ROOT } = {}) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'verify-layout-'));
  const htmlPath = join(tmpDir, 'scenario.html');

  try {
    writeFileSync(htmlPath, buildScenarioHtml(scenario.html, scenario.measure, depScripts ?? resolveDepScripts(root)));

    const proc = spawnSync(
      chromePath,
      ['--headless=new', '--disable-gpu', '--enable-logging=stderr', '--v=1', '--virtual-time-budget=4000', `file://${htmlPath}`],
      { encoding: 'utf8' },
    );

    const result = parseResult(proc.stderr ?? '');

    if (!result) {
      return { error: `no RESULT_JSON in Chrome output (stderr tail: ${(proc.stderr ?? '').slice(-500)})`, name: scenario.name, ok: false };
    }

    return { name: scenario.name, ok: scenario.check(result), result };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) {
  const chromePath = findChrome();

  if (!chromePath) {
    console.error(
      'verify-layout: no Chrome/Chromium binary found (checked CHROME_PATH and common install paths). ' +
        'Set CHROME_PATH or install Chrome to run this check. Skipping — this script is not CI-gated.',
    );
    process.exitCode = 0;
  } else {
    console.log(`verify-layout: using ${chromePath}\n`);

    let failed = 0;

    for (const scenario of SCENARIOS) {
      const outcome = runScenario(scenario, { chromePath });

      if (outcome.ok) {
        console.log(`  ok  — ${outcome.name}`);
      } else {
        failed++;
        console.error(`FAIL  — ${outcome.name}`);
        console.error(`        ${outcome.error ?? scenario.describe(outcome.result)}`);
      }
    }

    console.log(`\n${SCENARIOS.length - failed}/${SCENARIOS.length} scenarios passed.`);
    process.exitCode = failed > 0 ? 1 : 0;
  }
}
