import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScribeError, ScribeLimitError } from '../errors';
import { parseProse } from '../parse';
import { renderProseHtml } from '../render';

const html = (markdown: string): string => renderProseHtml(parseProse(markdown));

describe('destination policy', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('degrades javascript: links to their label text and warns in dev', () => {
    expect(html('[click](javascript:alert(1))')).toBe('<p>click</p>');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('rejected link destination'));
  });

  it('always rejects data: destinations, even when a protocol list includes them', () => {
    const doc = parseProse('![x](data:image/svg+xml,%3Csvg/%3E)', { linkProtocols: ['data'] });
    expect(renderProseHtml(doc)).toBe('<p>x</p>');
  });

  it('rejects entity-encoded and whitespace-split scheme tricks', () => {
    expect(html('[x](&#58;javascript:alert(1))')).toBe('<p>x</p>');
    expect(html('[x](&#106;avascript:evil)')).toBe('<p>x</p>');
    expect(html('[x](java\nscript:alert(1))')).not.toContain('<a');
  });

  it('accepts relative, fragment, protocol-relative, and mailto destinations', () => {
    expect(html('[a](/p) [b](#s) [c](//cdn/x.png)')).toBe(
      '<p><a href="/p">a</a> <a href="#s">b</a> <a href="//cdn/x.png">c</a></p>',
    );
    expect(html('[m](mailto:a@b.c)')).toBe('<p><a href="mailto:a@b.c">m</a></p>');
  });

  it('applies custom protocol allowlists', () => {
    expect(html('[f](ftp://x/y)')).toBe('<p>f</p>');
    const doc = parseProse('[f](ftp://x/y)', { linkProtocols: ['ftp'] });
    expect(renderProseHtml(doc)).toBe('<p><a href="ftp://x/y">f</a></p>');
  });

  it('rejects non-http bare autolinks when configured to', () => {
    const doc = parseProse('see https://a.b', { linkProtocols: ['mailto'] });
    expect(renderProseHtml(doc)).toBe('<p>see https://a.b</p>');
  });
});

describe('parser limits', () => {
  it('rejects inputs beyond the size limit', () => {
    expect(() => parseProse('x'.repeat(200_001))).toThrow(ScribeLimitError);
  });

  it('rejects block nesting beyond the depth limit', () => {
    expect(() => parseProse('> '.repeat(40) + 'x')).toThrow(ScribeLimitError);
  });

  it('routes limit failures through the ScribeError hierarchy', () => {
    expect(() => parseProse('x'.repeat(300_000))).toThrow(ScribeError);
  });
});

describe('hostile inputs stay literal', () => {
  it('renders script tags and event handlers as escaped text', () => {
    expect(html('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(html('<div onclick="x">t</div>')).toBe('<p>&lt;div onclick=&quot;x&quot;&gt;t&lt;/div&gt;</p>');
  });

  it('escapes quote breakout characters in text', () => {
    expect(html('"><img src=x>')).toBe('<p>&quot;&gt;&lt;img src=x&gt;</p>');
  });

  it('survives pathological delimiter runs without hanging', () => {
    const started = Date.now();
    const out = html(`${'*'.repeat(500)}x${'*'.repeat(500)}`);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(out).toContain('x');
  });

  it('survives unterminated link and table structures', () => {
    expect(() => html('[a](\n\n| b |\n|---|---|\n| 1 | 2 | 3 |')).not.toThrow();
  });
});
