import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCsp, buildDocument, createSandbox } from '../_sandbox.js';
import { SandboxDisposedError, SandboxError, SandboxTimeoutError } from '../errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireReady(source: Window | null): void {
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'ready' }, source }));
}

function fireCustom(source: Window | null, event = 'test', detail: unknown = null): void {
  window.dispatchEvent(new MessageEvent('message', { data: { detail, event, type: 'custom' }, source }));
}

// ---------------------------------------------------------------------------
// buildCsp
// ---------------------------------------------------------------------------

describe('buildCsp', () => {
  it('includes required directives', () => {
    const csp = buildCsp();

    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'unsafe-inline'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("form-action 'none'");
  });

  it("always includes 'unsafe-inline' in style-src", () => {
    expect(buildCsp()).toContain("style-src 'unsafe-inline'");
  });

  it('appends allowedStyleOrigins to style-src', () => {
    const csp = buildCsp({ allowedStyleOrigins: ['https://cdn.example.com'] });

    expect(csp).toContain("style-src 'unsafe-inline' https://cdn.example.com");
  });

  it("always includes 'data:' in img-src", () => {
    expect(buildCsp()).toContain('img-src data:');
  });

  it('appends allowedImageOrigins to img-src', () => {
    const csp = buildCsp({ allowedImageOrigins: ['https://images.example.com'] });

    expect(csp).toContain('img-src data: https://images.example.com');
  });

  it('includes font-src none by default', () => {
    expect(buildCsp()).toContain("font-src 'none'");
  });

  it('appends allowedFontOrigins to font-src', () => {
    const csp = buildCsp({ allowedFontOrigins: ['https://fonts.gstatic.com'] });

    expect(csp).toContain('font-src https://fonts.gstatic.com');
  });

  it('includes allowedScriptOrigins in script-src alongside unsafe-inline', () => {
    const csp = buildCsp({ allowedScriptOrigins: ['https://cdn.example.com'] });

    expect(csp).toContain("script-src 'unsafe-inline' https://cdn.example.com");
  });

  it('extracts script origin from scripts[] and adds it to script-src', () => {
    const csp = buildCsp({ scripts: ['https://cdn.example.com/lib.js'] });

    expect(csp).toContain("script-src 'unsafe-inline' https://cdn.example.com");
  });

  it('produces no extra whitespace with empty option arrays', () => {
    const csp = buildCsp({ allowedScriptOrigins: [], allowedStyleOrigins: [] });

    expect(csp).toContain("script-src 'unsafe-inline'");
    expect(csp).toContain("style-src 'unsafe-inline'");
  });

  it('produces the full CSP string in the expected directive order', () => {
    const csp = buildCsp();
    const directives = csp.split('; ').map((d) => d.split(' ')[0]);

    expect(directives).toEqual([
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'connect-src',
      'form-action',
    ]);
  });

  it('adds nonce to script-src when provided', () => {
    const csp = buildCsp({ nonce: 'abc123' });

    expect(csp).toContain("'nonce-abc123'");
    expect(csp).toContain("script-src 'unsafe-inline' 'nonce-abc123'");
  });

  it('ignores data: URLs in scripts[] — data: origin is null', () => {
    const csp = buildCsp({ scripts: ['data:text/javascript,console.log(1)'] });

    expect(csp).toContain("script-src 'unsafe-inline'");
    expect(csp).not.toContain('data:text');
  });

  it('ignores invalid URLs in scripts[]', () => {
    const csp = buildCsp({ scripts: ['not-a-valid-url'] });

    expect(csp).toContain("script-src 'unsafe-inline'");
    expect(csp).not.toContain('not-a-valid-url');
  });

  it('extracts origin from blob: URLs in scripts[]', () => {
    const csp = buildCsp({ scripts: ['blob:https://cdn.example.com/abc-123'] });

    expect(csp).toContain('https://cdn.example.com');
  });
});

// ---------------------------------------------------------------------------
// buildDocument
// ---------------------------------------------------------------------------

describe('buildDocument', () => {
  it('produces a complete HTML document with doctype and CSP meta tag', () => {
    const doc = buildDocument('<p>Hello</p>');

    expect(doc).toContain('<!doctype html>');
    expect(doc).toContain('http-equiv="Content-Security-Policy"');
    expect(doc).toContain('<p>Hello</p>');
  });

  it('places injected scripts before user content', () => {
    const doc = buildDocument('<p>Content</p>', { scripts: ['https://cdn.example.com/lib.js'] });
    const scriptPos = doc.indexOf('src="https://cdn.example.com/lib.js"');
    const contentPos = doc.indexOf('<p>Content</p>');

    expect(scriptPos).toBeGreaterThan(-1);
    expect(contentPos).toBeGreaterThan(-1);
    expect(scriptPos).toBeLessThan(contentPos);
  });

  it('adds crossorigin="anonymous" to injected scripts', () => {
    const doc = buildDocument('<p>Hi</p>', { scripts: ['https://cdn.example.com/lib.js'] });

    expect(doc).toContain('crossorigin="anonymous"');
  });

  it('includes the bridge script with ready postMessage', () => {
    const doc = buildDocument('<p>Hi</p>');

    expect(doc).toContain("postMessage({ type: 'ready' }");
  });

  it('includes injected styles in the document head', () => {
    const doc = buildDocument('<p>Hi</p>', { styles: 'body { margin: 0; }' });

    expect(doc).toContain('<style>body { margin: 0; }</style>');
  });

  it('adds nonce to the bridge script tag when provided', () => {
    const doc = buildDocument('<p>Hi</p>', { nonce: 'abc123' });

    expect(doc).toContain('<script nonce="abc123">');
  });

  it('produces no nonce attribute on the bridge script when not provided', () => {
    const doc = buildDocument('<p>Hi</p>');

    expect(doc).toContain('<script>');
    expect(doc).not.toContain('nonce=');
  });

  it('bridge script appears after injected <script src> tags (C3)', () => {
    const doc = buildDocument('<p>hi</p>', {
      scripts: ['https://cdn.example.com/lib.js'],
    });

    const scriptSrcIndex = doc.indexOf('src="https://cdn.example.com/lib.js"');
    const bridgeIndex = doc.indexOf('parent.postMessage');

    expect(scriptSrcIndex).toBeGreaterThan(0);
    expect(bridgeIndex).toBeGreaterThan(scriptSrcIndex);
  });
});

// ---------------------------------------------------------------------------
// createSandbox — lifecycle and lazy init
// ---------------------------------------------------------------------------

describe('createSandbox — lifecycle', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('does not create an iframe until render() is called', () => {
    const sandbox = createSandbox(container);

    expect(container.querySelector('iframe')).toBeNull();
    sandbox.dispose();
  });

  it('creates an iframe lazily on the first render()', () => {
    const sandbox = createSandbox(container);

    expect(container.querySelector('iframe')).toBeNull();
    sandbox.render('<p>Hello</p>');
    expect(container.querySelector('iframe')).not.toBeNull();
    sandbox.dispose();
  });

  it('removes the iframe from the DOM on dispose()', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');
    expect(container.querySelector('iframe')).not.toBeNull();
    sandbox.dispose();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('dispose() before render() does not throw', () => {
    const sandbox = createSandbox(container);

    expect(() => sandbox.dispose()).not.toThrow();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('dispose() is idempotent — calling twice does not throw', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');
    sandbox.dispose();
    expect(() => sandbox.dispose()).not.toThrow();
  });

  it('[Symbol.dispose] removes the iframe from the DOM', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');
    sandbox[Symbol.dispose]();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('disposed is false before dispose() and true after', () => {
    const sandbox = createSandbox(container);

    expect(sandbox.disposed).toBe(false);
    sandbox.dispose();
    expect(sandbox.disposed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createSandbox — ready promise
// ---------------------------------------------------------------------------

describe('createSandbox — ready promise', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('ready resolves when the sandbox sends a ready message', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await expect(sandbox.ready).resolves.toBeUndefined();
    sandbox.dispose();
  });

  it('ready does not resolve for messages from other sources', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    let resolved = false;

    void sandbox.ready.then(() => {
      resolved = true;
    });
    fireReady(window); // wrong source
    await new Promise((r) => setTimeout(r, 10));
    expect(resolved).toBe(false);
    sandbox.dispose();
  });

  it('ready resolves when the sandbox is disposed before the first render', async () => {
    const sandbox = createSandbox(container);

    sandbox.dispose();
    await expect(sandbox.ready).resolves.toBeUndefined();
  });

  it('ready is still pending and loaded is false before any render (C2)', async () => {
    const sandbox = createSandbox(container);

    const result = await Promise.race([sandbox.ready.then(() => 'resolved'), Promise.resolve('pending')]);

    expect(result).toBe('pending');
    expect(sandbox.loaded).toBe(false);
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — re-render (C1)
// ---------------------------------------------------------------------------

describe('createSandbox — re-render', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('second render() updates srcdoc with new content', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('v1');

    sandbox.render('<p>v2</p>');
    expect(iframe.srcdoc).toContain('v2');
    expect(iframe.srcdoc).not.toContain('v1');
    sandbox.dispose();
  });

  it('re-render reuses the same iframe element, not a new one', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const iframe1 = container.querySelector('iframe');

    sandbox.render('<p>v2</p>');

    const iframe2 = container.querySelector('iframe');

    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    expect(iframe1).toBe(iframe2);
    sandbox.dispose();
  });

  it('nextReady() registered before second render resolves on the second ready', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await sandbox.ready;

    const next = sandbox.nextReady();

    sandbox.render('<p>v2</p>');
    fireReady(iframe.contentWindow);
    await expect(next).resolves.toBeUndefined();
    sandbox.dispose();
  });

  it('loaded is false after render() and true after ready (E1)', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(sandbox.loaded).toBe(false);
    fireReady(iframe.contentWindow);
    await sandbox.ready;
    expect(sandbox.loaded).toBe(true);

    sandbox.render('<p>v2</p>');
    expect(sandbox.loaded).toBe(false);
    fireReady(iframe.contentWindow);
    await new Promise((r) => setTimeout(r));
    expect(sandbox.loaded).toBe(true);
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — nextReady
// ---------------------------------------------------------------------------

describe('createSandbox — nextReady', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('resolves after the next ready message', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await sandbox.ready;

    const next = sandbox.nextReady();

    sandbox.render('<p>v2</p>');
    fireReady(iframe.contentWindow);
    await expect(next).resolves.toBeUndefined();
    sandbox.dispose();
  });

  it('supports multiple simultaneous callers', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    const next1 = sandbox.nextReady();
    const next2 = sandbox.nextReady();

    fireReady(iframe.contentWindow);
    await expect(next1).resolves.toBeUndefined();
    await expect(next2).resolves.toBeUndefined();
    sandbox.dispose();
  });

  it('resolves immediately on a disposed sandbox', async () => {
    const sandbox = createSandbox(container);

    sandbox.dispose();
    await expect(sandbox.nextReady()).resolves.toBeUndefined();
  });

  it('resolves when the sandbox is disposed while waiting', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const next = sandbox.nextReady();

    sandbox.dispose();
    await expect(next).resolves.toBeUndefined();
  });

  it('resolves when nextReady() is called before the first render()', async () => {
    const sandbox = createSandbox(container);

    // Register interest before any render — no iframe exists yet
    const next = sandbox.nextReady();

    sandbox.render('<p>v1</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await expect(next).resolves.toBeUndefined();
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — render
// ---------------------------------------------------------------------------

describe('createSandbox — render', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('sets iframe.srcdoc containing the HTML fragment', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('<p>Hello</p>');
    sandbox.dispose();
  });

  it('includes the CSP meta tag in the srcdoc', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('http-equiv="Content-Security-Policy"');
    sandbox.dispose();
  });

  it('injects custom styles into the srcdoc head when provided', () => {
    const sandbox = createSandbox(container, { styles: 'body { margin: 0; }' });

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('<style>body { margin: 0; }</style>');
    sandbox.dispose();
  });

  it('includes allowedFontOrigins in font-src CSP when provided via SandboxOptions', () => {
    const sandbox = createSandbox(container, {
      allowedFontOrigins: ['https://fonts.gstatic.com'],
    });

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('font-src https://fonts.gstatic.com');
    sandbox.dispose();
  });

  it('render() with empty string warns in dev mode', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('render() with whitespace-only string warns in dev mode', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('   ');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('render() with valid HTML does not warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('<p>Valid</p>');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('render() after dispose() warns and does not create an iframe', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();
    sandbox.render('<p>Hello</p>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    expect(container.querySelector('iframe')).toBeNull();
    warnSpy.mockRestore();
  });

  it('render() with an already-aborted signal skips rendering', () => {
    const sandbox = createSandbox(container);
    const controller = new AbortController();

    controller.abort();
    sandbox.render('<p>Hello</p>', { signal: controller.signal });
    expect(container.querySelector('iframe')).toBeNull();
    sandbox.dispose();
  });

  it('render() with a non-aborted signal renders normally', () => {
    const sandbox = createSandbox(container);
    const controller = new AbortController();

    sandbox.render('<p>Hello</p>', { signal: controller.signal });

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('<p>Hello</p>');
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — onMessage
// ---------------------------------------------------------------------------

describe('createSandbox — onMessage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('onMessage returns an unsubscribe function', () => {
    const sandbox = createSandbox(container);
    const unsub = sandbox.onMessage(() => undefined);

    expect(typeof unsub).toBe('function');
    sandbox.dispose();
  });

  it('onMessage() after dispose() warns and returns a no-op unsubscribe', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();

    const unsub = sandbox.onMessage(() => undefined);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    expect(() => unsub()).not.toThrow();
    warnSpy.mockRestore();
  });

  it('does not forward ready messages to onMessage subscribers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireReady(iframe.contentWindow);
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — setState
// ---------------------------------------------------------------------------

describe('createSandbox — setState', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('posts a state-update message to iframe.contentWindow', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>test</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await sandbox.ready;

    const postSpy = vi.spyOn(iframe.contentWindow as Window, 'postMessage');

    sandbox.setState('theme', 'dark');
    expect(postSpy).toHaveBeenCalledWith({ key: 'theme', type: 'state-update', value: 'dark' }, '*');
    sandbox.dispose();
  });

  it('setState() before render() warns — no contentWindow yet', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.setState('theme', 'dark');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('setState() after render() but before ready warns — bridge may not be initialized (D1)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('<p>test</p>');
    sandbox.setState('theme', 'dark');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('before ready'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('setState() after ready does not warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('<p>test</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await sandbox.ready;

    sandbox.setState('theme', 'dark');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('setState() after dispose() warns and does not post', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('<p>test</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const postSpy = vi.spyOn(iframe.contentWindow as Window, 'postMessage');

    sandbox.dispose();
    sandbox.setState('theme', 'dark');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    expect(postSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — postMessage round-trip
// ---------------------------------------------------------------------------

describe('createSandbox — postMessage round-trip', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('delivers application messages from iframe.contentWindow to onMessage handlers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireCustom(iframe.contentWindow, 'ping', 42);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ detail: 42, event: 'ping', type: 'custom' });
    sandbox.dispose();
  });

  it('ignores messages from other sources', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireCustom(window, 'ping', 42); // wrong source
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('ignores non-object and untyped messages from the sandbox', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));

    for (const bad of [null, 42, 'string', { noType: true }]) {
      window.dispatchEvent(new MessageEvent('message', { data: bad, source: iframe.contentWindow }));
    }

    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('ignores messages with unknown type values from the sandbox (allow-list guard)', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));

    for (const type of ['state-update', 'ping', 'internal']) {
      window.dispatchEvent(new MessageEvent('message', { data: { type }, source: iframe.contentWindow }));
    }

    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('unsubscribe function stops message delivery', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];
    const unsub = sandbox.onMessage((msg) => received.push(msg));

    fireCustom(iframe.contentWindow);
    expect(received).toHaveLength(1);
    unsub();
    fireCustom(iframe.contentWindow);
    expect(received).toHaveLength(1);
    sandbox.dispose();
  });

  it('delivers error messages from the sandbox', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { message: 'Something went wrong', stack: 'Error: ...', type: 'error' },
        source: iframe.contentWindow,
      }),
    );
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      message: 'Something went wrong',
      stack: 'Error: ...',
      type: 'error',
    });
    sandbox.dispose();
  });

  it('delivers custom messages emitted from the sandbox', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireCustom(iframe.contentWindow, 'button:click', { label: 'Save' });
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ detail: { label: 'Save' }, event: 'button:click', type: 'custom' });
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — scripts option
// ---------------------------------------------------------------------------

describe('createSandbox — scripts option', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('injects script src tags with crossorigin="anonymous" before user content in srcdoc', () => {
    const sandbox = createSandbox(container, { scripts: ['https://cdn.example.com/lib.js'] });

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('crossorigin="anonymous"');
    expect(iframe.srcdoc).toContain('src="https://cdn.example.com/lib.js"');

    const scriptPos = iframe.srcdoc.indexOf('cdn.example.com');
    const contentPos = iframe.srcdoc.indexOf('<p>Hello</p>');

    expect(scriptPos).toBeLessThan(contentPos);
    sandbox.dispose();
  });

  it('includes the script origin in script-src CSP when scripts are provided', () => {
    const sandbox = createSandbox(container, { scripts: ['https://cdn.example.com/lib.js'] });

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('https://cdn.example.com');
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — nonce option
// ---------------------------------------------------------------------------

describe('createSandbox — nonce option', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('adds nonce to bridge script tag and script-src CSP', () => {
    const sandbox = createSandbox(container, { nonce: 'abc123' });

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain("'nonce-abc123'");
    expect(iframe.srcdoc).toContain('nonce="abc123"');
    sandbox.dispose();
  });
});

describe('SandboxError — named subclasses', () => {
  it('each subclass is instanceof SandboxError and Error', () => {
    expect(new SandboxDisposedError('disposed')).toBeInstanceOf(SandboxError);
    expect(new SandboxDisposedError('disposed')).toBeInstanceOf(Error);
    expect(new SandboxTimeoutError('timeout')).toBeInstanceOf(SandboxError);
  });

  it('each subclass has the correct .name', () => {
    expect(new SandboxDisposedError('').name).toBe('SandboxDisposedError');
    expect(new SandboxTimeoutError('').name).toBe('SandboxTimeoutError');
  });

  it('SandboxError.is() returns true for any subclass', () => {
    expect(SandboxError.is(new SandboxDisposedError(''))).toBe(true);
    expect(SandboxError.is(new Error('plain'))).toBe(false);
  });
});
