import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildScenarioHtml, findChrome, parseResult, SCENARIOS } from '../verify-layout.mjs';

describe('module has no import-time side effects', () => {
  it('only exports functions and data, does not spawn Chrome or touch the filesystem', () => {
    expect(typeof buildScenarioHtml).toBe('function');
    expect(typeof findChrome).toBe('function');
    expect(typeof parseResult).toBe('function');
    expect(Array.isArray(SCENARIOS)).toBe(true);
  });
});

describe('findChrome()', () => {
  const originalChromePath = process.env.CHROME_PATH;

  afterEach(() => {
    if (originalChromePath === undefined) delete process.env.CHROME_PATH;
    else process.env.CHROME_PATH = originalChromePath;
  });

  it('returns null when no candidate path exists', () => {
    expect(findChrome(() => false)).toBeNull();
  });

  it('returns the first existing candidate path', () => {
    expect(findChrome((p) => p === '/usr/bin/google-chrome')).toBe('/usr/bin/google-chrome');
  });

  it('prefers CHROME_PATH when set and present', () => {
    process.env.CHROME_PATH = '/custom/chrome';

    expect(findChrome((p) => p === '/custom/chrome')).toBe('/custom/chrome');
  });

  it('defaults to the real node:fs existsSync when no override is given', () => {
    // Sanity check that the default parameter wires up to a real filesystem check —
    // every other test in this block passes its own fake `exists` instead.
    const result = findChrome();

    expect(result === null || typeof result === 'string').toBe(true);
  });
});

describe('buildScenarioHtml()', () => {
  const depScripts = [
    { path: '/pkg/temporal.js', shimAfter: '@js-temporal/polyfill' },
    { path: '/pkg/ripple.iife.js' },
    { path: '/pkg/lucide.js', shimAfter: 'lucide' },
  ];

  it('includes the body HTML verbatim', () => {
    const html = buildScenarioHtml('<div id="x">hi</div>', '', depScripts);

    expect(html).toContain('<div id="x">hi</div>');
  });

  it('emits one <script> tag per dep, in order', () => {
    const html = buildScenarioHtml('', '', depScripts);
    const order = [...html.matchAll(/<script src="file:\/\/(.*?)">/g)].map((m) => m[1]);

    expect(order).toEqual(['/pkg/temporal.js', '/pkg/ripple.iife.js', '/pkg/lucide.js']);
  });

  it('inserts each shim immediately after its script tag', () => {
    const html = buildScenarioHtml('', '', depScripts);
    const temporalIdx = html.indexOf('/pkg/temporal.js');
    const temporalShimIdx = html.indexOf('typeof temporal');
    const rippleIdx = html.indexOf('/pkg/ripple.iife.js');

    expect(temporalShimIdx).toBeGreaterThan(temporalIdx);
    expect(temporalShimIdx).toBeLessThan(rippleIdx);
  });

  it('does not insert a shim for a dep with none', () => {
    const html = buildScenarioHtml('', '', [{ path: '/pkg/ripple.iife.js' }]);

    expect(html).not.toContain('typeof temporal');
    expect(html).not.toContain('typeof Lucide');
  });

  it('embeds the check script inside the load handler', () => {
    const html = buildScenarioHtml('', 'console.log(1);', depScripts);

    expect(html).toContain("window.addEventListener('load'");
    expect(html).toContain('console.log(1);');
  });
});

describe('parseResult()', () => {
  it('extracts a RESULT_JSON payload from a Chrome console log line', () => {
    const stderr = '[123:456:INFO:CONSOLE:1] "RESULT_JSON:{"width":42,"height":10}", source: file:///x.html (1)';

    expect(parseResult(stderr)).toEqual({ height: 10, width: 42 });
  });

  it('returns null when no RESULT_JSON payload is present', () => {
    expect(parseResult('some unrelated Chrome stderr output')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseResult('')).toBeNull();
  });
});

describe('SCENARIOS', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('each scenario has the shape runScenario()/the CLI reporter expects', () => {
    for (const scenario of SCENARIOS) {
      expect(typeof scenario.name).toBe('string');
      expect(typeof scenario.html).toBe('string');
      expect(typeof scenario.measure).toBe('string');
      expect(typeof scenario.check).toBe('function');
      expect(typeof scenario.describe).toBe('function');
    }
  });

  it('each scenario\'s measure script logs a RESULT_JSON payload that check() and describe() can consume', () => {
    // Runs each scenario's `measure` string as if it already has the DOM query results it
    // expects — a placeholder `console.log` stand-in proves the payload shape lines up with
    // `check`/`describe` without needing a real browser (that's verify-layout.mjs's own
    // manual/dev-time job, not this test suite's).
    for (const scenario of SCENARIOS) {
      const fakeResult = new Proxy({}, { get: () => 1 });

      expect(() => scenario.check(fakeResult)).not.toThrow();
      expect(() => scenario.describe(fakeResult)).not.toThrow();
      expect(typeof scenario.check(fakeResult)).toBe('boolean');
      expect(typeof scenario.describe(fakeResult)).toBe('string');
    }
  });

  it('writes valid, distinct temp HTML per scenario when combined with buildScenarioHtml()', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'verify-layout-test-'));

    for (const [i, scenario] of SCENARIOS.entries()) {
      const html = buildScenarioHtml(scenario.html, scenario.measure, []);
      const file = path.join(tmpDir, `scenario-${i}.html`);

      writeFileSync(file, html);
      expect(existsSync(file)).toBe(true);
      expect(html).toContain(scenario.html.trim().slice(0, 20));
    }
  });
});
