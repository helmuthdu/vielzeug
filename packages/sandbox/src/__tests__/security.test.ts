import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildCsp, buildDocument, createSandbox } from '../_sandbox.js';
import { createSandboxTestHelpers } from '../testing.js';

// ---------------------------------------------------------------------------
// Test setup helpers
// ---------------------------------------------------------------------------

function makeContainer() {
  const container = document.createElement('div');

  document.body.appendChild(container);

  return container;
}

function getCspContent(doc: string): string {
  const match = doc.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/);

  expect(match).not.toBeNull();

  return match![1]!;
}

// ---------------------------------------------------------------------------
// F1: CSP directive injection via allowed*Origins
// ---------------------------------------------------------------------------

describe('buildCsp — origin sanitization (CSP directive injection)', () => {
  it('strips a semicolon from allowedScriptOrigins to prevent directive injection', () => {
    const csp = buildCsp({ allowedScriptOrigins: ['evil.com; connect-src *'] });

    expect(csp).not.toContain('evil.com; connect-src *');
    expect(csp).toContain('evil.com connect-src *');
  });

  it('strips a semicolon from allowedStyleOrigins to prevent directive injection', () => {
    const csp = buildCsp({ allowedStyleOrigins: ['evil.com; script-src *'] });

    expect(csp).not.toContain('evil.com; script-src *');
  });

  it('strips a semicolon from allowedImageOrigins to prevent directive injection', () => {
    const csp = buildCsp({ allowedImageOrigins: ['evil.com; connect-src *'] });

    expect(csp).not.toContain('evil.com; connect-src *');
  });

  it('strips a semicolon from allowedFontOrigins to prevent directive injection', () => {
    const csp = buildCsp({ allowedFontOrigins: ['evil.com; connect-src *'] });

    expect(csp).not.toContain('evil.com; connect-src *');
  });

  it('strips double-quote characters from origins to prevent attribute breakout', () => {
    const csp = buildCsp({ allowedScriptOrigins: ['evil.com"><script>alert(1)</script>'] });

    expect(csp).not.toContain('"');
  });

  it('strips single-quote characters from origins to prevent CSP token breakout', () => {
    const csp = buildCsp({ allowedScriptOrigins: ["evil.com' 'unsafe-eval"] });

    // The literal single-quoted 'unsafe-eval' token must not survive sanitization.
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('strips newline and carriage-return characters from origins', () => {
    const csp = buildCsp({ allowedScriptOrigins: ['evil.com\r\nSet-Cookie: pwned=1'] });

    expect(csp).not.toContain('\r');
    expect(csp).not.toContain('\n');
  });

  it("the connect-src directive remains 'none' even with a malicious allowedScriptOrigins entry", () => {
    const csp = buildCsp({ allowedScriptOrigins: ['evil.com; connect-src *'] });

    expect(csp).toContain("connect-src 'none'");
  });
});

// ---------------------------------------------------------------------------
// F1 (nonce): nonce sanitization
// ---------------------------------------------------------------------------

describe('buildCsp — nonce sanitization', () => {
  it('strips a single-quote from the nonce before embedding it as a CSP token', () => {
    const csp = buildCsp({ nonce: "abc' 'unsafe-eval" });

    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("'nonce-abc unsafe-eval'");
  });

  it('strips a semicolon from the nonce', () => {
    const csp = buildCsp({ nonce: 'abc;connect-src *' });

    expect(csp).not.toContain(';connect-src *');
  });

  it('strips newlines from the nonce', () => {
    const csp = buildCsp({ nonce: 'abc\r\ndef' });

    expect(csp).toContain("'nonce-abcdef'");
  });

  it('does not include a nonce token when nonce is not provided', () => {
    expect(buildCsp()).not.toContain('nonce-');
  });
});

// ---------------------------------------------------------------------------
// F3: base-uri 'none' directive
// ---------------------------------------------------------------------------

describe('buildCsp — base-uri directive', () => {
  it("includes 'base-uri 'none'' in the default CSP", () => {
    expect(buildCsp()).toContain("base-uri 'none'");
  });

  it("includes base-uri 'none' regardless of other options", () => {
    const csp = buildCsp({
      allowedFontOrigins: ['https://fonts.gstatic.com'],
      allowedScriptOrigins: ['https://cdn.example.com'],
      nonce: 'abc123',
    });

    expect(csp).toContain("base-uri 'none'");
  });
});

// ---------------------------------------------------------------------------
// F2: CSP <meta> content attribute — defense-in-depth escaping must not
// corrupt legitimate single-quoted CSP keywords.
// ---------------------------------------------------------------------------

describe('buildDocument — CSP meta content attribute integrity', () => {
  it('preserves single-quoted CSP keywords unescaped inside the content attribute', () => {
    const doc = buildDocument('<p>hi</p>');
    const content = getCspContent(doc);

    expect(content).toContain("'unsafe-inline'");
    expect(content).toContain("'none'");
  });

  it('the content attribute is terminated by exactly one closing double-quote', () => {
    const doc = buildDocument('<p>hi</p>');
    const metaMatch = doc.match(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/);

    expect(metaMatch).not.toBeNull();
  });

  it('sanitized malicious allowedScriptOrigins never breaks the content attribute out of the meta tag', () => {
    const doc = buildDocument('<p>hi</p>', {
      allowedScriptOrigins: ['evil.com"><script>alert(1)</script>'],
    });

    expect(doc).not.toContain('<script>alert(1)</script>');

    // The meta tag must still be well-formed — exactly one <meta ... CSP ...> element.
    const metaMatches = doc.match(/<meta http-equiv="Content-Security-Policy"/g) ?? [];

    expect(metaMatches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// buildDocument — HTML injection safety (escapeAttr / escapeText)
// ---------------------------------------------------------------------------

describe('buildDocument — title escaping (escapeText)', () => {
  it('escapes a </title> breakout attempt', () => {
    const doc = buildDocument('<p>hi</p>', { title: '</title><script>alert(1)</script>' });

    expect(doc).not.toContain('</title><script>alert(1)</script>');
    expect(doc).toContain('&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes an ampersand in the title', () => {
    expect(buildDocument('<p>hi</p>', { title: 'Foo & Bar' })).toContain('<title>Foo &amp; Bar</title>');
  });
});

describe('buildDocument — lang escaping (escapeAttr)', () => {
  it('escapes a double-quote attribute-breakout attempt in lang', () => {
    const doc = buildDocument('<p>hi</p>', { lang: 'en" onmouseover="alert(1)' });

    expect(doc).not.toContain('en" onmouseover="alert(1)');
    expect(doc).toContain('lang="en&quot; onmouseover=&quot;alert(1)"');
  });
});

describe('buildDocument — namedStyles id escaping (escapeAttr)', () => {
  it('escapes a double-quote attribute-breakout attempt in a namedStyles key', () => {
    const doc = buildDocument('<p>hi</p>', {
      namedStyles: { ['theme" onmouseover="alert(1)']: 'body {}' },
    });

    expect(doc).not.toContain('id="theme" onmouseover="alert(1)"');
    expect(doc).toContain('id="theme&quot; onmouseover=&quot;alert(1)"');
  });

  it('escapes a tag-breakout attempt in a namedStyles key', () => {
    const doc = buildDocument('<p>hi</p>', {
      namedStyles: { ['theme"><script>alert(1)</script>']: 'body {}' },
    });

    expect(doc).not.toContain('<script>alert(1)</script>');
  });
});

describe('buildDocument — nonce attribute escaping (escapeAttr)', () => {
  it('escapes a double-quote attribute-breakout attempt in nonce', () => {
    const doc = buildDocument('<p>hi</p>', { nonce: 'abc" onmouseover="alert(1)' });

    expect(doc).not.toContain('nonce="abc" onmouseover="alert(1)"');
    expect(doc).toContain('nonce="abc&quot; onmouseover=&quot;alert(1)"');
  });
});

describe('buildDocument — script src escaping (escapeAttr)', () => {
  it('encodes an ampersand in a script URL query string', () => {
    const doc = buildDocument('<p>hi</p>', { scripts: ['https://cdn.example.com/lib.js?a=1&b=2'] });

    expect(doc).toContain('src="https://cdn.example.com/lib.js?a=1&amp;b=2"');
  });

  it('escapes a double-quote attribute-breakout attempt in a script URL', () => {
    const doc = buildDocument('<p>hi</p>', { scripts: ['https://cdn.example.com/lib.js"><script>alert(1)</script>'] });

    expect(doc).not.toContain('<script>alert(1)</script>');
  });
});

// ---------------------------------------------------------------------------
// F4: prototype-pollution-safe message dispatch
// ---------------------------------------------------------------------------

describe('createSandbox — prototype-safe message dispatch (F4 regression)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    container.remove();
  });

  function fireRaw(container_: HTMLElement, data: unknown): void {
    const iframe = container_.querySelector('iframe') as HTMLIFrameElement;

    window.dispatchEvent(new MessageEvent('message', { data, source: iframe.contentWindow }));
  }

  it('does not throw when a message has type "__proto__"', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');
    expect(() => fireRaw(container, { type: '__proto__' })).not.toThrow();
    sandbox.dispose();
  });

  it('does not broadcast a message with type "__proto__" to subscribers', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireRaw(container, { type: '__proto__' });
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('does not throw when a message has type "__defineGetter__"', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');
    expect(() => fireRaw(container, { type: '__defineGetter__' })).not.toThrow();
    sandbox.dispose();
  });

  it('does not throw and does not broadcast for type "constructor"', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    expect(() => fireRaw(container, { type: 'constructor' })).not.toThrow();
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('does not throw and does not broadcast for type "toString"', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    expect(() => fireRaw(container, { type: 'toString' })).not.toThrow();
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('still dispatches legitimate messages after a prototype-key message was received', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireRaw(container, { type: '__proto__' });

    const helpers = createSandboxTestHelpers(container);

    helpers.fireCustom('ping');
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ event: 'ping', type: 'custom' });
    sandbox.dispose();
  });
});

// ---------------------------------------------------------------------------
// isMsgObject guard — malformed message payloads
// ---------------------------------------------------------------------------

describe('createSandbox — malformed message payload guard (isMsgObject)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    container.remove();
  });

  function fireRaw(data: unknown): void {
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;

    window.dispatchEvent(new MessageEvent('message', { data, source: iframe.contentWindow }));
  }

  it('ignores a null message payload without throwing', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');
    expect(() => fireRaw(null)).not.toThrow();
    sandbox.dispose();
  });

  it('ignores a string message payload without throwing', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');
    expect(() => fireRaw('not an object')).not.toThrow();
    sandbox.dispose();
  });

  it('ignores an object message payload with no type field', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireRaw({ foo: 'bar' });
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });

  it('ignores an object message payload with a non-string type field', () => {
    const sandbox = createSandbox(container);

    sandbox.render('<p>hi</p>');

    const received: unknown[] = [];

    sandbox.onMessage((msg) => received.push(msg));
    fireRaw({ type: 42 });
    expect(received).toHaveLength(0);
    sandbox.dispose();
  });
});
