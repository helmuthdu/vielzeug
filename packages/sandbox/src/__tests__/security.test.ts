import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildCsp, buildDocument, createSandbox } from '../_sandbox.js';
import { SandboxConfigurationError } from '../errors.js';
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

describe('buildCsp — origin validation', () => {
  it.each([
    ['allowedScriptOrigins', { allowedScriptOrigins: ['evil.com; connect-src *'] }],
    ['allowedStyleOrigins', { allowedStyleOrigins: ['evil.com; script-src *'] }],
    ['allowedImageOrigins', { allowedImageOrigins: ['evil.com; connect-src *'] }],
    ['allowedFontOrigins', { allowedFontOrigins: ['evil.com; connect-src *'] }],
    ['attribute breakout', { allowedScriptOrigins: ['evil.com"><script>alert(1)</script>'] }],
    ['CSP token breakout', { allowedScriptOrigins: ["evil.com' 'unsafe-eval"] }],
    ['line break', { allowedScriptOrigins: ['evil.com\r\nSet-Cookie: pwned=1'] }],
  ])('rejects %s instead of changing policy meaning', (_name, options) => {
    expect(() => buildCsp(options)).toThrow(SandboxConfigurationError);
  });

  it('normalizes a valid origin', () => {
    expect(buildCsp({ allowedScriptOrigins: ['https://cdn.example.com/'] })).toContain('https://cdn.example.com');
  });
});

// ---------------------------------------------------------------------------
// F1 (nonce): nonce sanitization
// ---------------------------------------------------------------------------

describe('buildCsp — nonce validation', () => {
  it.each(["abc' 'unsafe-eval", 'abc;connect-src *', 'abc\r\ndef', 'abc" onmouseover="alert(1)'])(
    'rejects invalid nonce %s',
    (nonce) => {
      expect(() => buildCsp({ nonce })).toThrow(SandboxConfigurationError);
    },
  );

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

  it('rejects CSP attribute breakout input before serializing the document', () => {
    expect(() => buildDocument('<p>hi</p>', { allowedScriptOrigins: ['evil.com"><script>alert(1)</script>'] })).toThrow(
      SandboxConfigurationError,
    );
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

describe('buildDocument — lang validation', () => {
  it('rejects an attribute-breakout attempt in lang', () => {
    expect(() => buildDocument('<p>hi</p>', { lang: 'en" onmouseover="alert(1)' })).toThrow(SandboxConfigurationError);
  });
});

describe('buildDocument — namedStyles id validation', () => {
  it.each(['theme" onmouseover="alert(1)', 'theme"><script>alert(1)</script>', 'theme id'])(
    'rejects invalid style id %s',
    (id) => {
      expect(() => buildDocument('<p>hi</p>', { namedStyles: { [id]: 'body {}' } })).toThrow(SandboxConfigurationError);
    },
  );
});

describe('buildDocument — nonce validation', () => {
  it('rejects an attribute-breakout attempt in nonce', () => {
    expect(() => buildDocument('<p>hi</p>', { nonce: 'abc" onmouseover="alert(1)' })).toThrow(
      SandboxConfigurationError,
    );
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
    const payload =
      typeof data === 'object' && data !== null
        ? { ...data, channel: iframe.dataset.sandboxChannel, generation: Number(iframe.dataset.sandboxGeneration) }
        : data;

    window.dispatchEvent(new MessageEvent('message', { data: payload, source: iframe.contentWindow }));
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
    const payload =
      typeof data === 'object' && data !== null
        ? { ...data, channel: iframe.dataset.sandboxChannel, generation: Number(iframe.dataset.sandboxGeneration) }
        : data;

    window.dispatchEvent(new MessageEvent('message', { data: payload, source: iframe.contentWindow }));
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
