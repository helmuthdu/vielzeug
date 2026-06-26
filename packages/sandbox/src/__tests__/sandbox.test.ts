import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCsp, buildDocument, createSandbox } from '../_sandbox.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireReady(source: Window | null): void {
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'ready' }, source }));
}

function fireCustom(source: Window | null, event = 'test', detail: unknown = null): void {
  window.dispatchEvent(new MessageEvent('message', { data: { detail, event, type: 'custom' }, source }));
}

function fireResize(source: Window | null, height: number): void {
  window.dispatchEvent(new MessageEvent('message', { data: { height, type: 'resize' }, source }));
}

// ---------------------------------------------------------------------------
// buildCsp
// ---------------------------------------------------------------------------

describe('buildCsp', () => {
  it('defaults to unsafe-inline script-src', () => {
    const csp = buildCsp();

    expect(csp).toContain("script-src 'unsafe-inline'");
  });

  it('defaults to unsafe-inline style-src', () => {
    expect(buildCsp()).toContain("style-src 'unsafe-inline'");
  });

  it('defaults to data: img-src', () => {
    expect(buildCsp()).toContain('img-src data:');
  });

  it('defaults to none font-src', () => {
    expect(buildCsp()).toContain("font-src 'none'");
  });

  it('appends allowedStyleOrigins to style-src', () => {
    const csp = buildCsp({ allowedStyleOrigins: ['https://cdn.example.com'] });

    expect(csp).toContain('https://cdn.example.com');
  });

  it('appends allowedImageOrigins to img-src', () => {
    const csp = buildCsp({ allowedImageOrigins: ['https://images.example.com'] });

    expect(csp).toContain('https://images.example.com');
  });

  it('sets font-src to provided origins when given', () => {
    const csp = buildCsp({ allowedFontOrigins: ['https://fonts.gstatic.com'] });

    expect(csp).toContain('font-src https://fonts.gstatic.com');
  });

  it('appends allowedScriptOrigins to script-src', () => {
    const csp = buildCsp({ allowedScriptOrigins: ['https://cdn.example.com'] });

    expect(csp).toContain('https://cdn.example.com');
  });

  it('extracts origin from scripts URLs and adds to script-src', () => {
    const csp = buildCsp({ scripts: ['https://cdn.example.com/lib.js'] });

    expect(csp).toContain('https://cdn.example.com');
  });

  it('handles empty arrays without error', () => {
    const csp = buildCsp({ allowedScriptOrigins: [], allowedStyleOrigins: [] });

    expect(csp).toContain("script-src 'unsafe-inline'");
  });

  it('includes all required CSP directives', () => {
    const csp = buildCsp();

    expect(csp).toContain('default-src');
    expect(csp).toContain('script-src');
    expect(csp).toContain('style-src');
    expect(csp).toContain('img-src');
    expect(csp).toContain('font-src');
    expect(csp).toContain('connect-src');
    expect(csp).toContain('form-action');
  });

  it('adds nonce to script-src when provided', () => {
    const csp = buildCsp({ nonce: 'abc123' });

    expect(csp).toContain("'nonce-abc123'");
  });

  it('handles data: script URLs without adding null origin', () => {
    const csp = buildCsp({ scripts: ['data:text/javascript,console.log(1)'] });

    expect(csp).not.toContain('null');
  });

  it('handles non-URL script entries without crashing', () => {
    const csp = buildCsp({ scripts: ['not-a-valid-url'] });

    expect(csp).not.toContain('null');
  });

  it('handles blob: URLs by extracting origin correctly', () => {
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

  it('includes anonymous styles block (string form)', () => {
    const doc = buildDocument('<p>Hi</p>', { styles: 'body { margin: 0; }' });

    expect(doc).toContain('<style>body { margin: 0; }</style>');
  });

  it('emits named <style id> blocks for namedStyles', () => {
    const doc = buildDocument('<p>Hi</p>', {
      namedStyles: { 'base-css': 'body { margin: 0; }', 'theme-css': 'body { color: red; }' },
    });

    expect(doc).toContain('<style id="base-css">body { margin: 0; }</style>');
    expect(doc).toContain('<style id="theme-css">body { color: red; }</style>');
  });

  it('emits both styles and namedStyles when both provided', () => {
    const doc = buildDocument('<p>Hi</p>', {
      namedStyles: { 'theme-css': 'body { color: red; }' },
      styles: 'body { margin: 0; }',
    });

    expect(doc).toContain('<style>body { margin: 0; }</style>');
    expect(doc).toContain('<style id="theme-css">body { color: red; }</style>');
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

  it('bridge script appears after injected <script src> tags', () => {
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
// createSandbox — lifecycle
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

  it('ready is still pending before any ready signal', async () => {
    const sandbox = createSandbox(container);

    const result = await Promise.race([sandbox.ready.then(() => 'resolved'), Promise.resolve('pending')]);

    expect(result).toBe('pending');
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — render() returns Promise
// ---------------------------------------------------------------------------

describe('createSandbox — render() Promise', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('resolves when the document signals ready', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await expect(p).resolves.toBeUndefined();
    sandbox.dispose();
  });

  it('resolves immediately when called on a disposed sandbox', async () => {
    const sandbox = createSandbox(container);

    sandbox.dispose();
    await expect(sandbox.render('<p>Hello</p>')).resolves.toBeUndefined();
  });

  it('resolves immediately when signal is already aborted', async () => {
    const sandbox = createSandbox(container);
    const ac = new AbortController();

    ac.abort();
    await expect(sandbox.render('<p>Hello</p>', { signal: ac.signal })).resolves.toBeUndefined();
    sandbox.dispose();
  });

  it('first render Promise resolves immediately when a second render() is called', async () => {
    const sandbox = createSandbox(container);
    const p1 = sandbox.render('<p>v1</p>');
    const p2 = sandbox.render('<p>v2</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    // p1 should already be resolved (superseded), p2 pending
    await expect(p1).resolves.toBeUndefined();

    fireReady(iframe.contentWindow);
    await expect(p2).resolves.toBeUndefined();
    sandbox.dispose();
  });

  it('in-flight render Promise resolves when sandbox is disposed', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>Hello</p>');

    sandbox.dispose();
    await expect(p).resolves.toBeUndefined();
  });

  it('second render() updates srcdoc', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('v1');
    sandbox.render('<p>v2</p>');
    expect(iframe.srcdoc).toContain('v2');
    expect(iframe.srcdoc).not.toContain('v1');
    sandbox.dispose();
  });

  it('re-render reuses the same iframe element', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>v1</p>');

    const iframe1 = container.querySelector('iframe');

    sandbox.render('<p>v2</p>');

    const iframe2 = container.querySelector('iframe');

    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    expect(iframe1).toBe(iframe2);
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

  it('render() after dispose() warns and does not create an iframe', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();
    await sandbox.render('<p>Hello</p>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    expect(container.querySelector('iframe')).toBeNull();
    warnSpy.mockRestore();
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

  it('forwards custom messages to onMessage subscribers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireCustom(iframe.contentWindow, 'click', { x: 1 });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ detail: { x: 1 }, event: 'click', type: 'custom' });
    sandbox.dispose();
  });

  it('forwards resize messages to onMessage subscribers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireResize(iframe.contentWindow, 420);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ height: 420, type: 'resize' });
    sandbox.dispose();
  });

  it('does not forward resize messages with non-numeric height', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    window.dispatchEvent(
      new MessageEvent('message', { data: { height: 'bad', type: 'resize' }, source: iframe.contentWindow }),
    );
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('does not forward messages from other sources', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireCustom(window, 'spoofed'); // wrong source
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('unsubscribe removes the handler', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const received: unknown[] = [];

    const unsub = sandbox.onMessage((msg) => received.push(msg));

    fireCustom(iframe.contentWindow, 'first');
    unsub();
    fireCustom(iframe.contentWindow, 'second');
    expect(received).toHaveLength(1);
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
    const p = sandbox.render('<p>test</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await p;

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

  it('setState() after render() but before ready warns', () => {
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
    const p = sandbox.render('<p>test</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await p;

    sandbox.setState('theme', 'dark');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('setState() after dispose() warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();
    sandbox.setState('theme', 'dark');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — updateStyle
// ---------------------------------------------------------------------------

describe('createSandbox — updateStyle', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('injects named <style id> blocks for namedStyles option', () => {
    const sandbox = createSandbox(container, {
      namedStyles: { 'base-css': 'body { margin: 0; }', 'theme-css': 'body { color: red; }' },
    });

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('<style id="base-css">body { margin: 0; }</style>');
    expect(iframe.srcdoc).toContain('<style id="theme-css">body { color: red; }</style>');
    sandbox.dispose();
  });

  it('posts style-patch message to iframe when loaded', async () => {
    const sandbox = createSandbox(container, { namedStyles: { 'theme-css': 'body { color: red; }' } });
    const p = sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await p;

    const postSpy = vi.spyOn(iframe.contentWindow as Window, 'postMessage');

    sandbox.updateStyle('theme-css', 'body { color: blue; }');

    expect(postSpy).toHaveBeenCalledWith({ css: 'body { color: blue; }', id: 'theme-css', type: 'style-patch' }, '*');
    sandbox.dispose();
  });

  it('updates baseline so next render() uses new CSS', async () => {
    const sandbox = createSandbox(container, { namedStyles: { 'theme-css': 'body { color: red; }' } });
    const p = sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await p;
    sandbox.updateStyle('theme-css', 'body { color: blue; }');
    sandbox.render('<p>Updated</p>');

    expect(iframe.srcdoc).toContain('<style id="theme-css">body { color: blue; }</style>');
    sandbox.dispose();
  });

  it('updateStyle before first render updates baseline only (no postMessage)', () => {
    const sandbox = createSandbox(container, { namedStyles: { 'theme-css': 'body { color: red; }' } });
    const postMessageSpy = vi.fn();

    sandbox.updateStyle('theme-css', 'body { color: green; }');
    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('<style id="theme-css">body { color: green; }</style>');
    expect(postMessageSpy).not.toHaveBeenCalled();
    sandbox.dispose();
  });

  it('updateStyle no-ops after dispose', async () => {
    const sandbox = createSandbox(container, { namedStyles: { 'theme-css': 'body { color: red; }' } });
    const p = sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await p;
    sandbox.dispose();

    expect(() => sandbox.updateStyle('theme-css', 'body { color: blue; }')).not.toThrow();
  });

  it('updateStyle works for IDs not pre-declared in namedStyles', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    fireReady(iframe.contentWindow);
    await p;

    const postSpy = vi.spyOn(iframe.contentWindow as Window, 'postMessage');

    sandbox.updateStyle('any-id', 'body { color: blue; }');
    expect(postSpy).toHaveBeenCalledWith({ css: 'body { color: blue; }', id: 'any-id', type: 'style-patch' }, '*');
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — styles option
// ---------------------------------------------------------------------------

describe('createSandbox — styles option', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('injects anonymous styles into the srcdoc head when provided', () => {
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
});

// ---------------------------------------------------------------------------
// createSandbox — disposalSignal
// ---------------------------------------------------------------------------

describe('createSandbox — disposalSignal', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('disposalSignal is not aborted before dispose()', () => {
    const sandbox = createSandbox(container);

    expect(sandbox.disposalSignal.aborted).toBe(false);
    sandbox.dispose();
  });

  it('disposalSignal is aborted after dispose()', () => {
    const sandbox = createSandbox(container);

    sandbox.dispose();
    expect(sandbox.disposalSignal.aborted).toBe(true);
  });
});
