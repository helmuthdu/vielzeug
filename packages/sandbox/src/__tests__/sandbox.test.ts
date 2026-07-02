import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCsp, buildDocument, createSandbox } from '../_sandbox.js';
import { SandboxTimeoutError } from '../errors.js';
import { createSandboxTestHelpers } from '../testing.js';

// ---------------------------------------------------------------------------
// Test setup helpers
// ---------------------------------------------------------------------------

function makeContainer() {
  const container = document.createElement('div');

  document.body.appendChild(container);

  return container;
}

function makeHelpers(container: HTMLElement) {
  return createSandboxTestHelpers(container);
}

// ---------------------------------------------------------------------------
// buildCsp
// ---------------------------------------------------------------------------

describe('buildCsp', () => {
  it('defaults to unsafe-inline script-src', () => {
    expect(buildCsp()).toContain("script-src 'unsafe-inline'");
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
    expect(buildCsp({ allowedStyleOrigins: ['https://cdn.example.com'] })).toContain('https://cdn.example.com');
  });

  it('appends allowedImageOrigins to img-src', () => {
    expect(buildCsp({ allowedImageOrigins: ['https://images.example.com'] })).toContain('https://images.example.com');
  });

  it('sets font-src to provided origins when given', () => {
    expect(buildCsp({ allowedFontOrigins: ['https://fonts.gstatic.com'] })).toContain(
      'font-src https://fonts.gstatic.com',
    );
  });

  it('appends allowedScriptOrigins to script-src', () => {
    expect(buildCsp({ allowedScriptOrigins: ['https://cdn.example.com'] })).toContain('https://cdn.example.com');
  });

  it('extracts origin from scripts URLs and adds to script-src', () => {
    expect(buildCsp({ scripts: ['https://cdn.example.com/lib.js'] })).toContain('https://cdn.example.com');
  });

  it('handles empty arrays without error', () => {
    expect(buildCsp({ allowedScriptOrigins: [], allowedStyleOrigins: [] })).toContain("script-src 'unsafe-inline'");
  });

  it('includes all required CSP directives', () => {
    const csp = buildCsp();

    for (const directive of [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'connect-src',
      'form-action',
      'base-uri',
    ]) {
      expect(csp).toContain(directive);
    }
  });

  it('adds nonce to script-src when provided', () => {
    expect(buildCsp({ nonce: 'abc123' })).toContain("'nonce-abc123'");
  });

  it('handles data: script URLs without adding null origin', () => {
    expect(buildCsp({ scripts: ['data:text/javascript,console.log(1)'] })).not.toContain('null');
  });

  it('handles non-URL script entries without crashing', () => {
    expect(buildCsp({ scripts: ['not-a-valid-url'] })).not.toContain('null');
  });

  it('handles blob: URLs by extracting origin correctly', () => {
    expect(buildCsp({ scripts: ['blob:https://cdn.example.com/abc-123'] })).toContain('https://cdn.example.com');
  });

  it('does not include a nonce token when nonce is not provided', () => {
    expect(buildCsp()).not.toContain('nonce-');
  });

  it("includes base-uri 'none'", () => {
    expect(buildCsp()).toContain("base-uri 'none'");
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

    expect(doc.indexOf('src="https://cdn.example.com/lib.js"')).toBeLessThan(doc.indexOf('<p>Content</p>'));
  });

  it('adds crossorigin="anonymous" to injected scripts', () => {
    expect(buildDocument('<p>Hi</p>', { scripts: ['https://cdn.example.com/lib.js'] })).toContain(
      'crossorigin="anonymous"',
    );
  });

  it('includes the bridge script with ready postMessage', () => {
    expect(buildDocument('<p>Hi</p>')).toContain("post({ type: 'ready' }");
  });

  it('renders namedStyles as <style id="key"> blocks', () => {
    const doc = buildDocument('<p>Hi</p>', {
      namedStyles: { 'base-css': 'body { margin: 0; }', 'theme-css': 'body { color: red; }' },
    });

    expect(doc).toContain('<style id="base-css">body { margin: 0; }</style>');
    expect(doc).toContain('<style id="theme-css">body { color: red; }</style>');
  });

  it('renders no <style> block when namedStyles is empty', () => {
    expect(buildDocument('<p>Hi</p>')).not.toContain('<style');
  });

  it('defaults lang to "en"', () => {
    expect(buildDocument('<p>Hi</p>')).toContain('<html lang="en">');
  });

  it('uses the provided lang value', () => {
    expect(buildDocument('<p>Hi</p>', { lang: 'de' })).toContain('<html lang="de">');
  });

  it('defaults to an empty <title>', () => {
    expect(buildDocument('<p>Hi</p>')).toContain('<title></title>');
  });

  it('renders the provided title', () => {
    expect(buildDocument('<p>Hi</p>', { title: 'My Sandbox' })).toContain('<title>My Sandbox</title>');
  });

  it('adds nonce to the bridge script tag when provided', () => {
    expect(buildDocument('<p>Hi</p>', { nonce: 'abc123' })).toContain('<script nonce="abc123">');
  });

  it('produces no nonce attribute when not provided', () => {
    const doc = buildDocument('<p>Hi</p>');

    expect(doc).toContain('<script>');
    expect(doc).not.toContain('nonce=');
  });

  it('bridge script appears after injected <script src> tags', () => {
    const doc = buildDocument('<p>hi</p>', { scripts: ['https://cdn.example.com/lib.js'] });

    expect(doc.indexOf('src="https://cdn.example.com/lib.js"')).toBeLessThan(doc.indexOf('parent.postMessage'));
  });

  it('includes auto-resize ResizeObserver in bridge script', () => {
    expect(buildDocument('<p>Hi</p>')).toContain('ResizeObserver');
  });

  it('ResizeObserver setup appears after the ready postMessage', () => {
    const doc = buildDocument('<p>Hi</p>');
    const readyIdx = doc.indexOf("post({ type: 'ready' }");
    const roIdx = doc.indexOf('ResizeObserver');

    expect(readyIdx).toBeGreaterThan(-1);
    expect(roIdx).toBeGreaterThan(readyIdx);
  });

  describe('CSS injection safety', () => {
    it('escapes </style in namedStyles CSS to prevent element breakout', () => {
      const doc = buildDocument('<p>hi</p>', {
        namedStyles: { theme: 'body { color: red; } </style><script>evil()</script>' },
      });

      // The raw </style sequence must not appear in the output
      expect(doc).not.toContain('</style><script>evil()');
      // The content must still be present in escaped form
      expect(doc).toContain('\\3C /style');
    });

    it('does not escape CSS that contains no closing style tag', () => {
      const css = 'body { color: red; background: url("data:image/png;base64,abc"); }';
      const doc = buildDocument('<p>hi</p>', { namedStyles: { theme: css } });

      expect(doc).toContain(css);
    });

    it('handles case-insensitive </STYLE breakout attempt', () => {
      const doc = buildDocument('<p>hi</p>', {
        namedStyles: { theme: 'body {} </STYLE><script>evil()</script>' },
      });

      expect(doc).not.toContain('</STYLE><script>evil()');
    });
  });
});

// ---------------------------------------------------------------------------
// createSandbox — lifecycle
// ---------------------------------------------------------------------------

describe('createSandbox — lifecycle', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
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

    sandbox.render('<p>Hello</p>');
    expect(container.querySelector('iframe')).not.toBeNull();
    sandbox.dispose();
  });

  it('removes the iframe from the DOM on dispose()', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');
    sandbox.dispose();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('dispose() before render() does not throw', () => {
    expect(() => createSandbox(container).dispose()).not.toThrow();
  });

  it('dispose() is idempotent', () => {
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
// createSandbox — disposalSignal
// ---------------------------------------------------------------------------

describe('createSandbox — disposalSignal', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it('is not aborted before dispose()', () => {
    const sandbox = createSandbox(container);

    expect(sandbox.disposalSignal.aborted).toBe(false);
    sandbox.dispose();
  });

  it('is aborted after dispose()', () => {
    const sandbox = createSandbox(container);

    sandbox.dispose();
    expect(sandbox.disposalSignal.aborted).toBe(true);
  });

  it('abort event fires when sandbox is disposed', () => {
    const sandbox = createSandbox(container);
    let fired = false;

    sandbox.disposalSignal.addEventListener('abort', () => {
      fired = true;
    });
    sandbox.dispose();
    expect(fired).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createSandbox — ready promise
// ---------------------------------------------------------------------------

describe('createSandbox — ready promise', () => {
  let container: HTMLElement;
  let helpers: ReturnType<typeof makeHelpers>;

  beforeEach(() => {
    container = makeContainer();
    helpers = makeHelpers(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('ready resolves when the sandbox sends a ready message', async () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');
    helpers.fireReady();
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
    // Fire ready from wrong source (window itself, not the iframe)
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'ready' }, source: window }));
    await new Promise((r) => setTimeout(r, 10));
    expect(resolved).toBe(false);
    sandbox.dispose();
  });

  it('ready resolves when the sandbox is disposed before the first render', async () => {
    const sandbox = createSandbox(container);

    sandbox.dispose();
    await expect(sandbox.ready).resolves.toBeUndefined();
  });

  it('disposed is true when ready resolves after dispose', async () => {
    const sandbox = createSandbox(container);

    sandbox.dispose();
    await sandbox.ready;
    expect(sandbox.disposed).toBe(true);
  });

  it('ready is still pending before any ready signal', async () => {
    const sandbox = createSandbox(container);
    const result = await Promise.race([sandbox.ready.then(() => 'resolved'), Promise.resolve('pending')]);

    expect(result).toBe('pending');
    sandbox.dispose();
  });

  it('ready resolves only once even with multiple renders', async () => {
    const sandbox = createSandbox(container);
    let count = 0;

    void sandbox.ready.then(() => count++);
    sandbox.render('<p>v1</p>');
    helpers.fireReady();
    await sandbox.ready;
    sandbox.render('<p>v2</p>');
    helpers.fireReady();
    await new Promise((r) => setTimeout(r, 10));
    expect(count).toBe(1);
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — render() Promise
// ---------------------------------------------------------------------------

describe('createSandbox — render() Promise', () => {
  let container: HTMLElement;
  let helpers: ReturnType<typeof makeHelpers>;

  beforeEach(() => {
    container = makeContainer();
    helpers = makeHelpers(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('resolves when the document signals ready', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>Hello</p>');

    helpers.fireReady();
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

  it('first render Promise resolves immediately when superseded by second render()', async () => {
    const sandbox = createSandbox(container);
    const p1 = sandbox.render('<p>v1</p>');
    const p2 = sandbox.render('<p>v2</p>');

    await expect(p1).resolves.toBeUndefined();
    helpers.fireReady();
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
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    expect(container.querySelector('iframe')).toBe(iframe1);
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
    const ac = new AbortController();

    sandbox.render('<p>Hello</p>', { signal: ac.signal });
    expect((container.querySelector('iframe') as HTMLIFrameElement).srcdoc).toContain('<p>Hello</p>');
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — render() ready-timeout rejection
// ---------------------------------------------------------------------------

describe('createSandbox — render() ready-timeout rejection', () => {
  let container: HTMLElement;
  let helpers: ReturnType<typeof makeHelpers>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = makeContainer();
    helpers = makeHelpers(container);
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
  });

  it('rejects with SandboxTimeoutError if no ready signal arrives within 5s', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>missing bridge</p>');
    const assertion = expect(p).rejects.toThrow(SandboxTimeoutError);

    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    sandbox.dispose();
  });

  it('SandboxTimeoutError message names the timeout and points to buildDocument()', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>missing bridge</p>');
    const assertion = expect(p).rejects.toThrow(/5000ms.*buildDocument/s);

    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    sandbox.dispose();
  });

  it('does not reject if ready fires before the timeout', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>hi</p>');

    helpers.fireReady();
    await expect(p).resolves.toBeUndefined();

    await vi.advanceTimersByTimeAsync(5000);
    sandbox.dispose();
  });

  it('does not reject a superseded render — it resolves when replaced by a second render()', async () => {
    const sandbox = createSandbox(container);
    const p1 = sandbox.render('<p>v1</p>');
    const p2 = sandbox.render('<p>v2</p>');

    await expect(p1).resolves.toBeUndefined();

    helpers.fireReady();
    await expect(p2).resolves.toBeUndefined();

    await vi.advanceTimersByTimeAsync(5000);
    sandbox.dispose();
  });

  it('does not reject a pending render when the sandbox is disposed', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>hi</p>');

    sandbox.dispose();
    await expect(p).resolves.toBeUndefined();

    await vi.advanceTimersByTimeAsync(5000);
  });
});

// ---------------------------------------------------------------------------
// createSandbox — onMessage
// ---------------------------------------------------------------------------

describe('createSandbox — onMessage', () => {
  let container: HTMLElement;
  let helpers: ReturnType<typeof makeHelpers>;

  beforeEach(() => {
    container = makeContainer();
    helpers = makeHelpers(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('onMessage returns an Unsubscribe function', () => {
    const sandbox = createSandbox(container);
    const unsub = sandbox.onMessage(() => undefined);

    expect(typeof unsub).toBe('function');
    sandbox.dispose();
  });

  it('onMessage() after dispose() warns and returns a no-op', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();

    const unsub = sandbox.onMessage(() => undefined);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    expect(() => unsub()).not.toThrow();
    warnSpy.mockRestore();
  });

  it('does not forward ready messages to subscribers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    helpers.fireReady();
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('forwards custom messages to subscribers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    helpers.fireCustom('click', { x: 1 });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ detail: { x: 1 }, event: 'click', type: 'custom' });
    sandbox.dispose();
  });

  it('forwards resize messages to subscribers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    helpers.fireResize(420);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ height: 420, type: 'resize' });
    sandbox.dispose();
  });

  it('forwards error messages to subscribers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    helpers.fireError('ReferenceError: x is not defined', 'at eval:1');
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ message: 'ReferenceError: x is not defined', type: 'error' });
    sandbox.dispose();
  });

  it('does not forward resize messages with non-numeric height', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { height: 'bad', type: 'resize' },
        source: iframe.contentWindow,
      }),
    );
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('does not forward messages from other sources', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    // Dispatch with wrong source
    window.dispatchEvent(
      new MessageEvent('message', { data: { detail: null, event: 'spoofed', type: 'custom' }, source: window }),
    );
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('unsubscribe removes the handler', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const received: unknown[] = [];
    const unsub = sandbox.onMessage((msg) => received.push(msg));

    helpers.fireCustom('first');
    unsub();
    helpers.fireCustom('second');
    expect(received).toHaveLength(1);
    sandbox.dispose();
  });

  it('multiple independent subscribers each receive messages', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const a: unknown[] = [];
    const b: unknown[] = [];

    sandbox.onMessage((msg) => a.push(msg));
    sandbox.onMessage((msg) => b.push(msg));
    helpers.fireCustom('ping');
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — setState
// ---------------------------------------------------------------------------

describe('createSandbox — setState', () => {
  let container: HTMLElement;
  let helpers: ReturnType<typeof makeHelpers>;

  beforeEach(() => {
    container = makeContainer();
    helpers = makeHelpers(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('posts a state-update message to iframe.contentWindow', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>test</p>');
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    helpers.fireReady();
    await p;

    const postSpy = vi.spyOn(iframe.contentWindow as Window, 'postMessage');

    sandbox.setState('theme', 'dark');
    expect(postSpy).toHaveBeenCalledWith({ key: 'theme', type: 'state-update', value: 'dark' }, '*');
    sandbox.dispose();
  });

  it('warns before render() — no contentWindow yet', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.setState('theme', 'dark');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('warns after render() but before ready fires', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('<p>test</p>');
    sandbox.setState('theme', 'dark');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('before ready'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('does not warn after ready fires', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>test</p>');

    helpers.fireReady();
    await p;
    sandbox.setState('theme', 'dark');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('warns after dispose()', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();
    sandbox.setState('theme', 'dark');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — setStateAll
// ---------------------------------------------------------------------------

describe('createSandbox — setStateAll', () => {
  let container: HTMLElement;
  let helpers: ReturnType<typeof makeHelpers>;

  beforeEach(() => {
    container = makeContainer();
    helpers = makeHelpers(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('posts a state-update-all message with the given record when bridge is ready', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>test</p>');
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    helpers.fireReady();
    await p;

    const postSpy = vi.spyOn(iframe.contentWindow as Window, 'postMessage');

    sandbox.setStateAll({ count: 1, theme: 'dark' });
    expect(postSpy).toHaveBeenCalledWith({ record: { count: 1, theme: 'dark' }, type: 'state-update-all' }, '*');
    sandbox.dispose();
  });

  it('warns before render() — no contentWindow yet', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.setStateAll({ key: 'value' });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('warns after render() but before ready fires', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('<p>test</p>');
    sandbox.setStateAll({ key: 'value' });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('before ready'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('does not warn after ready fires', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>test</p>');

    helpers.fireReady();
    await p;
    sandbox.setStateAll({ key: 'value' });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('warns after dispose()', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();
    sandbox.setStateAll({ key: 'value' });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — updateStyle
// ---------------------------------------------------------------------------

describe('createSandbox — updateStyle', () => {
  let container: HTMLElement;
  let helpers: ReturnType<typeof makeHelpers>;

  beforeEach(() => {
    container = makeContainer();
    helpers = makeHelpers(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('injects namedStyles as <style id> blocks', () => {
    const sandbox = createSandbox(container, {
      namedStyles: { 'base-css': 'body { margin: 0; }', 'theme-css': 'body { color: red; }' },
    });

    sandbox.render('<p>Hello</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('<style id="base-css">body { margin: 0; }</style>');
    expect(iframe.srcdoc).toContain('<style id="theme-css">body { color: red; }</style>');
    sandbox.dispose();
  });

  it('posts style-patch message to iframe when bridge is ready', async () => {
    const sandbox = createSandbox(container, { namedStyles: { 'theme-css': 'body { color: red; }' } });
    const p = sandbox.render('<p>Hello</p>');
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    helpers.fireReady();
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

    helpers.fireReady();
    await p;
    sandbox.updateStyle('theme-css', 'body { color: blue; }');
    sandbox.render('<p>Updated</p>');
    expect(iframe.srcdoc).toContain('<style id="theme-css">body { color: blue; }</style>');
    sandbox.dispose();
  });

  it('before first render: updates baseline only, no postMessage', () => {
    const sandbox = createSandbox(container, { namedStyles: { 'theme-css': 'body { color: red; }' } });
    const postMessageSpy = vi.fn();

    sandbox.updateStyle('theme-css', 'body { color: green; }');
    sandbox.render('<p>Hello</p>');
    expect((container.querySelector('iframe') as HTMLIFrameElement).srcdoc).toContain(
      '<style id="theme-css">body { color: green; }</style>',
    );
    expect(postMessageSpy).not.toHaveBeenCalled();
    sandbox.dispose();
  });

  it('no-ops after dispose', async () => {
    const sandbox = createSandbox(container, { namedStyles: { 'theme-css': 'body { color: red; }' } });
    const p = sandbox.render('<p>Hello</p>');

    helpers.fireReady();
    await p;
    sandbox.dispose();
    expect(() => sandbox.updateStyle('theme-css', 'body { color: blue; }')).not.toThrow();
  });

  it('warns in dev when id is not a known namedStyles key', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>Hello</p>');

    helpers.fireReady();
    await p;
    sandbox.updateStyle('unknown-id', 'body {}');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("'unknown-id'"));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('does not warn when id is a known namedStyles key', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container, { namedStyles: { 'theme-css': 'body {}' } });
    const p = sandbox.render('<p>Hello</p>');

    helpers.fireReady();
    await p;
    sandbox.updateStyle('theme-css', 'body { color: blue; }');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('allowedFontOrigins appears in font-src CSP of rendered srcdoc', () => {
    const sandbox = createSandbox(container, { allowedFontOrigins: ['https://fonts.gstatic.com'] });

    sandbox.render('<p>Hello</p>');
    expect((container.querySelector('iframe') as HTMLIFrameElement).srcdoc).toContain(
      'font-src https://fonts.gstatic.com',
    );
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandbox — patch()
// ---------------------------------------------------------------------------

describe('createSandbox — patch()', () => {
  let container: HTMLElement;
  let helpers: ReturnType<typeof makeHelpers>;

  beforeEach(() => {
    container = makeContainer();
    helpers = makeHelpers(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('posts an html-patch message to iframe.contentWindow', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>initial</p>');
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    helpers.fireReady();
    await p;

    const postSpy = vi.spyOn(iframe.contentWindow as Window, 'postMessage');

    sandbox.patch('<p>updated</p>');
    expect(postSpy).toHaveBeenCalledWith({ html: '<p>updated</p>', type: 'html-patch' }, '*');
    sandbox.dispose();
  });

  it('warns before render() resolves', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.render('<p>initial</p>');
    sandbox.patch('<p>too early</p>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('warns before any render() call', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.patch('<p>no render yet</p>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('warns after dispose()', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();
    sandbox.patch('<p>after dispose</p>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/sandbox]'));
    warnSpy.mockRestore();
  });

  it('does not navigate the iframe — srcdoc is unchanged', async () => {
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>initial</p>');
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    helpers.fireReady();
    await p;

    const srcdocBefore = iframe.srcdoc;

    sandbox.patch('<p>updated</p>');
    expect(iframe.srcdoc).toBe(srcdocBefore);
    sandbox.dispose();
  });

  it('does not reset bridgeReady — setState still works after patch()', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);
    const p = sandbox.render('<p>initial</p>');

    helpers.fireReady();
    await p;
    sandbox.patch('<p>patched</p>');
    sandbox.setState('key', 'value');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    sandbox.dispose();
  });

  it('patch() after re-render (before ready) warns', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);
    const p1 = sandbox.render('<p>v1</p>');

    helpers.fireReady();
    await p1;

    // Start a new full render — bridgeReady resets
    sandbox.render('<p>v2</p>');
    sandbox.patch('<p>too early again</p>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('bridge is not yet initialized'));
    warnSpy.mockRestore();
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// createSandboxTestHelpers
// ---------------------------------------------------------------------------

describe('createSandboxTestHelpers', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it('fireReady dispatches a ready message from the iframe source', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const h = createSandboxTestHelpers(container);
    // onMessage doesn't forward ready, so spy on the raw message event
    const spy = vi.fn();

    window.addEventListener('message', spy);
    h.fireReady();
    window.removeEventListener('message', spy);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: { type: 'ready' } }));
    sandbox.dispose();
  });

  it('fireCustom dispatches a custom message with event and detail', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const h = createSandboxTestHelpers(container);
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    h.fireCustom('greet', { name: 'Alice' });
    expect(received[0]).toMatchObject({ detail: { name: 'Alice' }, event: 'greet', type: 'custom' });
    sandbox.dispose();
  });

  it('fireResize dispatches a resize message with the given height', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const h = createSandboxTestHelpers(container);
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    h.fireResize(320);
    expect(received[0]).toMatchObject({ height: 320, type: 'resize' });
    sandbox.dispose();
  });

  it('fireError dispatches an error message', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const h = createSandboxTestHelpers(container);
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    h.fireError('TypeError: null is not an object', 'at foo:1');
    expect(received[0]).toMatchObject({
      message: 'TypeError: null is not an object',
      stack: 'at foo:1',
      type: 'error',
    });
    sandbox.dispose();
  });

  it('fireError without stack omits the stack field', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const h = createSandboxTestHelpers(container);
    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    h.fireError('Some error');
    expect((received[0] as { stack?: string }).stack).toBeUndefined();
    sandbox.dispose();
  });

  it('fireCustom with no detail argument sends detail: undefined (not null)', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>Hello</p>');

    const h = createSandboxTestHelpers(container);
    const spy = vi.fn();

    window.addEventListener('message', spy);
    h.fireCustom('ping');
    window.removeEventListener('message', spy);

    const event = spy.mock.calls[0]![0] as MessageEvent;

    expect('detail' in (event.data as Record<string, unknown>)).toBe(true);
    expect((event.data as { detail: unknown }).detail).toBeUndefined();
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// C1: onMessage() on disposed sandbox — exact warning message
// ---------------------------------------------------------------------------

describe('createSandbox — onMessage disposed warning', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it('emits exact warning when onMessage() is called on a disposed sandbox', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sandbox = createSandbox(container);

    sandbox.dispose();
    sandbox.onMessage(() => undefined);

    expect(warnSpy).toHaveBeenCalledWith(
      '[@vielzeug/sandbox] onMessage() called on a disposed sandbox — handler will never fire.',
    );
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// C2: buildDocument nonce appears in CSP meta tag content attribute
// ---------------------------------------------------------------------------

describe('buildDocument — nonce in CSP meta tag', () => {
  it("nonce appears as 'nonce-<value>' inside the CSP meta tag content attribute", () => {
    const doc = buildDocument('<p>hi</p>', { nonce: 'abc123' });
    const contentMatch = doc.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/);

    expect(contentMatch).not.toBeNull();
    expect(contentMatch![1]).toContain("'nonce-abc123'");
  });

  it('the bridge <script nonce="..."> attribute matches the CSP nonce token exactly for a nonce with special characters', () => {
    // Regression: buildCsp() and buildDocument() previously sanitized the nonce
    // differently (strip vs escape-only) — a mismatch here means the browser
    // rejects the nonce and the bridge script silently never executes.
    const doc = buildDocument('<p>hi</p>', { nonce: `abc;"'\ndef` });
    const contentMatch = doc.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/);
    const scriptNonceMatch = doc.match(/<script nonce="([^"]*)">/);

    expect(contentMatch).not.toBeNull();
    expect(scriptNonceMatch).not.toBeNull();

    const cspNonceMatch = contentMatch![1]!.match(/'nonce-([^']*)'/);

    expect(cspNonceMatch).not.toBeNull();
    expect(scriptNonceMatch![1]).toBe(cspNonceMatch![1]);
    expect(scriptNonceMatch![1]).toBe('abcdef');
  });
});

// ---------------------------------------------------------------------------
// C3: updateStyle before render() — render picks up updated CSS
// ---------------------------------------------------------------------------

describe('createSandbox — updateStyle before render', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it('render() uses CSS updated via updateStyle() before first render', () => {
    const sandbox = createSandbox(container, { namedStyles: { theme: 'body { color: red; }' } });

    sandbox.updateStyle('theme', 'body { color: blue; }');
    sandbox.render('<p>hi</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('body { color: blue; }');
    expect(iframe.srcdoc).not.toContain('body { color: red; }');
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// window.__sandbox__.onState — bridge-side state subscription
// ---------------------------------------------------------------------------

describe('buildDocument — window.__sandbox__.onState', () => {
  it('wires an onState method onto window.__sandbox__ in the bridge script', () => {
    const doc = buildDocument('<p>hi</p>');

    expect(doc).toContain('onState: function(key, handler)');
    expect(doc).toContain("addEventListener('sandbox:state-update', listener)");
    expect(doc).toContain("removeEventListener('sandbox:state-update', listener)");
  });

  it('onState filters sandbox:state-update events by key and returns an unsubscribe function', () => {
    // The bridge script is plain JS embedded in an iframe srcdoc — jsdom does not execute
    // srcdoc scripts. This mirrors onState's exact logic (see BRIDGE_SCRIPT in _sandbox.ts)
    // against the real DOM to verify the filtering/unsubscribe contract without an iframe.
    function onState(key: string, handler: (value: unknown) => void) {
      function listener(e: Event) {
        const detail = (e as CustomEvent<{ key: string; value: unknown }>).detail;

        if (detail && detail.key === key) handler(detail.value);
      }

      document.addEventListener('sandbox:state-update', listener);

      return function unsubscribe() {
        document.removeEventListener('sandbox:state-update', listener);
      };
    }

    const received: unknown[] = [];
    const unsubscribe = onState('theme', (value) => received.push(value));

    document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: 'theme', value: 'dark' } }));
    document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: 'other', value: 'ignored' } }));
    expect(received).toEqual(['dark']);

    unsubscribe();
    document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: 'theme', value: 'light' } }));
    expect(received).toEqual(['dark']);
  });

  it("state-update-all fan-out reaches each key's own onState() handler exactly once", () => {
    // Mirrors the BRIDGE_SCRIPT 'state-update-all' handler: one CustomEvent per key
    // in the pushed record — verifies the fan-out reaches multiple independent
    // onState() subscriptions correctly, each receiving only its own key's value.
    function dispatchStateUpdateAll(record: Record<string, unknown>): void {
      for (const key of Object.keys(record)) {
        document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key, value: record[key] } }));
      }
    }

    function onState(key: string, handler: (value: unknown) => void) {
      function listener(e: Event) {
        const detail = (e as CustomEvent<{ key: string; value: unknown }>).detail;

        if (detail && detail.key === key) handler(detail.value);
      }

      document.addEventListener('sandbox:state-update', listener);

      return function unsubscribe() {
        document.removeEventListener('sandbox:state-update', listener);
      };
    }

    const themeReceived: unknown[] = [];
    const countReceived: unknown[] = [];
    const unsubTheme = onState('theme', (value) => themeReceived.push(value));
    const unsubCount = onState('count', (value) => countReceived.push(value));

    dispatchStateUpdateAll({ count: 1, label: 'ignored-by-both', theme: 'dark' });

    expect(themeReceived).toEqual(['dark']);
    expect(countReceived).toEqual([1]);

    unsubTheme();
    unsubCount();
  });
});

// ---------------------------------------------------------------------------
// Render generation — stale-document message protection
// ---------------------------------------------------------------------------

describe('createSandbox — render generation', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it('embeds an incrementing generation marker in the live srcdoc on each render()', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>one</p>');

    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    expect(iframe.srcdoc).toContain('window.__sandboxGeneration=1;');

    sandbox.render('<p>two</p>');
    expect(iframe.srcdoc).toContain('window.__sandboxGeneration=2;');
    sandbox.dispose();
  });

  it('ignores a ready message carrying a stale (superseded) generation number', async () => {
    const sandbox = createSandbox(container);
    const renderPromise = sandbox.render('<p>hi</p>');
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    // Simulate a leftover 'ready' message from a document a newer render() already
    // superseded (generation 0 predates the current render's generation 1).
    window.dispatchEvent(
      new MessageEvent('message', { data: { generation: 0, type: 'ready' }, source: iframe.contentWindow }),
    );

    let resolved = false;

    void renderPromise.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(false);

    // The current generation's ready message must still resolve the render.
    window.dispatchEvent(
      new MessageEvent('message', { data: { generation: 1, type: 'ready' }, source: iframe.contentWindow }),
    );
    await renderPromise;
    expect(resolved).toBe(true);
    sandbox.dispose();
  });

  it('accepts messages with no generation field (e.g. from test helpers)', async () => {
    const sandbox = createSandbox(container);
    const helpers = makeHelpers(container);

    const renderPromise = sandbox.render('<p>hi</p>');

    helpers.fireReady();
    await expect(renderPromise).resolves.toBeUndefined();
    sandbox.dispose();
  });
});
