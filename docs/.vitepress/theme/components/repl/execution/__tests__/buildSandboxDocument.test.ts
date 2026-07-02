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

  it('emits repl:done in a finally so it fires regardless of success or failure', () => {
    const html = buildSandboxRunHtml({ code: '', libraries: [] });

    expect(html).toContain(".finally(function () {\n  __replEmit('repl:done');\n});");
  });

  // Regression test: @vielzeug/sandbox's own bridge script (which defines `window.__sandbox__`)
  // is appended by buildDocument() *after* the html passed to render() — so anything emitted
  // here must not depend on `window.__sandbox__` existing yet. See buildSandboxDocument.ts.
  it('never references window.__sandbox__ directly — emits via postMessage instead', () => {
    const html = buildSandboxRunHtml({ code: "console.log('hi')", libraries: [] });

    expect(html).not.toContain('__sandbox__');
    expect(html).toContain('parent.postMessage');
  });

  it('defines the emit helper before any library script or the console bridge runs', () => {
    const html = buildSandboxRunHtml({
      code: '',
      libraries: [{ globalName: 'Arsenal', iifeSource: 'var Arsenal = {};' }],
    });

    const helperIndex = html.indexOf('function __replEmit');
    const libraryIndex = html.indexOf('var Arsenal');
    const consoleOverrideIndex = html.indexOf("__replEmit('repl:console'");

    expect(helperIndex).toBeGreaterThan(-1);
    expect(libraryIndex).toBeGreaterThan(helperIndex);
    expect(consoleOverrideIndex).toBeGreaterThan(helperIndex);
  });

  // Regression test: the sandbox iframe has no allow-same-origin, so real
  // localStorage/sessionStorage throw a SecurityError on access — @vielzeug/vault's
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
});
