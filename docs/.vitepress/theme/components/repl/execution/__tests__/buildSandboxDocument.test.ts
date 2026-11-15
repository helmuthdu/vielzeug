import { describe, expect, it } from 'vitest';

import { buildSandboxRunHtml } from '../buildSandboxDocument';

describe('buildSandboxRunHtml', () => {
  it('inlines each library bundle as its own <script> tag, in the given order', () => {
    const html = buildSandboxRunHtml({
      code: '',
      libraries: [
        { globalName: 'Arsenal', iifeSource: 'var Arsenal = {};' },
        { globalName: 'Courier', iifeSource: 'var Courier = {};' },
      ],
    });

    const arsenalIndex = html.indexOf('var Arsenal');
    const courierIndex = html.indexOf('var Courier');

    expect(arsenalIndex).toBeGreaterThan(-1);
    expect(courierIndex).toBeGreaterThan(arsenalIndex);
  });

  it('embeds the user code inside an async IIFE', () => {
    const html = buildSandboxRunHtml({ code: "console.log('hi')", libraries: [] });

    expect(html).toContain("console.log('hi')");
    expect(html).toMatch(/\(async function \(\) \{/);
  });

  it('escapes literal </script sequences in user code to avoid ending the script block early', () => {
    const html = buildSandboxRunHtml({ code: 'const s = "</script>";', libraries: [] });

    expect(html).not.toContain('</script>";');
    expect(html).toContain('<\\/script>";');
  });

  it('escapes </script sequences inside library bundle source too', () => {
    const html = buildSandboxRunHtml({
      code: '',
      libraries: [{ globalName: 'Weird', iifeSource: 'var x = "</script>";' }],
    });

    expect(html).toContain('<\\/script>";');
  });

  it('always includes the console bridge so console.log reaches the host', () => {
    const html = buildSandboxRunHtml({ code: '', libraries: [] });

    expect(html).toContain("__replEmit('repl:console'");
  });

  it('emits repl:dom then repl:done in a finally so they fire regardless of success or failure', () => {
    const html = buildSandboxRunHtml({ code: '', libraries: [] });

    expect(html).toContain(
      ".finally(function () {\n  __replEmit('repl:dom', Boolean(document.body.querySelector(':scope > :not(script)')));\n  __replEmit('repl:done');\n});",
    );
  });

  it('reports whether the run rendered visible DOM, ignoring injected script tags', () => {
    const html = buildSandboxRunHtml({ code: '', libraries: [] });

    // The host uses this to decide whether the Preview tab has content; the run's own
    // <script> tags live in the body too, so they must not count as visible output.
    expect(html).toContain(':not(script)');
  });

  // The bridge script (which defines `window.__sandbox__`) lives in <head>, before the
  // body content passed to render(): see packages/sandbox/src/_document.ts. The theme
  // listener can therefore use `window.__sandbox__.onState`, but console/result emits
  // still go through __replEmit, which carries channel + generation itself and works
  // regardless of bridge ordering.
  it('emits via postMessage helper and registers the dark-mode state listener', () => {
    const html = buildSandboxRunHtml({ code: "console.log('hi')", libraries: [] });

    expect(html).toContain('parent.postMessage');
    expect(html).toContain("__replEmit('repl:console'");
    expect(html).toContain("window.__sandbox__.onState('dark'");
    expect(html).toContain("document.documentElement.classList.toggle('dark'");
  });

  it('defines the emit helper and theme listener before any library script runs', () => {
    const html = buildSandboxRunHtml({
      code: '',
      libraries: [{ globalName: 'Arsenal', iifeSource: 'var Arsenal = {};' }],
    });

    const helperIndex = html.indexOf('function __replEmit');
    const themeIndex = html.indexOf("window.__sandbox__.onState('dark'");
    const libraryIndex = html.indexOf('var Arsenal');
    const consoleOverrideIndex = html.indexOf("__replEmit('repl:console'");

    expect(helperIndex).toBeGreaterThan(-1);
    expect(themeIndex).toBeGreaterThan(helperIndex);
    expect(libraryIndex).toBeGreaterThan(themeIndex);
    expect(consoleOverrideIndex).toBeGreaterThan(helperIndex);
  });

  // Regression test: the sandbox iframe has no allow-same-origin, so real
  // localStorage/sessionStorage throw a SecurityError on access: @vielzeug/vault's
  // webstorage adapter surfaces that as "not available in this environment". The polyfill
  // must be installed before any library script or user code runs.
  it('installs the storage polyfill before any library script or the user code runs', () => {
    const html = buildSandboxRunHtml({
      code: "localStorage.setItem('x', '1')",
      libraries: [{ globalName: 'Vault', iifeSource: 'var Vault = {};' }],
    });

    const polyfillIndex = html.indexOf('__replMemoryStorage');
    const libraryIndex = html.indexOf('var Vault');
    const userCodeIndex = html.indexOf("localStorage.setItem('x', '1')");

    expect(polyfillIndex).toBeGreaterThan(-1);
    expect(libraryIndex).toBeGreaterThan(polyfillIndex);
    expect(userCodeIndex).toBeGreaterThan(polyfillIndex);
  });

  it('only swaps in the memory polyfill when real storage access throws', () => {
    const html = buildSandboxRunHtml({ code: '', libraries: [] });

    expect(html).toContain("window[name].setItem('__repl_probe__', '1')");
    expect(html).toContain(
      'Object.defineProperty(window, name, { configurable: true, value: __replMemoryStorage(), writable: true })',
    );
  });

  it('installs the api.example.com fetch mock before user code runs', () => {
    const html = buildSandboxRunHtml({ code: "await fetch('https://api.example.com/users')", libraries: [] });

    const mockIndex = html.indexOf("url.origin !== 'https://api.example.com'");
    const userCodeIndex = html.indexOf("await fetch('https://api.example.com/users')");

    expect(mockIndex).toBeGreaterThan(-1);
    expect(userCodeIndex).toBeGreaterThan(mockIndex);
  });

  it('keeps unknown api.example.com routes deterministic with a JSON 404 mock response', () => {
    const html = buildSandboxRunHtml({ code: '', libraries: [] });

    expect(html).toContain("return __replJson({ message: 'Not found' }, 404)");
  });
});
