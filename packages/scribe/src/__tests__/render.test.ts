import { describe, expect, it } from 'vitest';

import { parseProse } from '../parse';
import { proseOutline, proseToText, renderProseHtml } from '../render';

const html = (markdown: string): string => renderProseHtml(parseProse(markdown));

describe('renderProseHtml', () => {
  it('escapes text and code content', () => {
    expect(html('<b>&"\'')).toBe('<p>&lt;b&gt;&amp;&quot;&#39;</p>');
    expect(html('`<x>`')).toBe('<p><code>&lt;x&gt;</code></p>');
  });

  it('renders the fixed inline tag set', () => {
    expect(html('**b** *i* ~~s~~ `c` [l](/u)')).toBe(
      '<p><strong>b</strong> <em>i</em> <del>s</del> <code>c</code> <a href="/u">l</a></p>',
    );
  });

  it('renders images with alt and optional title', () => {
    expect(html('![x](/i.png "T")')).toBe('<p><img src="/i.png" alt="x" title="T"></p>');
  });

  it('renders fenced code with a language class', () => {
    expect(html('```js\nlet a;\n```')).toBe('<pre><code class="language-js">let a;\n</code></pre>');
  });

  it('unwraps paragraphs inside tight list items only', () => {
    expect(html('- a\n- b')).toBe('<ul>\n<li>a</li>\n<li>b</li>\n</ul>');
    expect(html('- a\n\n- b')).toBe('<ul>\n<li><p>a</p></li>\n<li><p>b</p></li>\n</ul>');
  });

  it('emits the start attribute only for non-one ordered lists', () => {
    expect(html('3. c')).toBe('<ol start="3">\n<li>c</li>\n</ol>');
  });

  it('renders blockquotes recursively', () => {
    expect(html('> a\n>\n> - b')).toBe('<blockquote>\n<p>a</p>\n<ul>\n<li>b</li>\n</ul>\n</blockquote>');
  });

  it('renders tables with alignment attributes except for left', () => {
    expect(html('| a | b |\n|:-:|--:|\n| 1 | 2 |')).toBe(
      '<table>\n<thead>\n<tr><th align="center">a</th><th align="right">b</th></tr>\n</thead>\n<tbody>\n<tr><td align="center">1</td><td align="right">2</td></tr>\n</tbody>\n</table>',
    );
  });

  it('emits no heading ids by default and unique slugs with headingIds', () => {
    const doc = parseProse('# Setup\n## Setup');
    expect(renderProseHtml(doc)).toBe('<h1>Setup</h1>\n<h2>Setup</h2>');
    expect(renderProseHtml(doc, { headingIds: true })).toBe('<h1 id="setup">Setup</h1>\n<h2 id="setup-2">Setup</h2>');
  });

  it('never emits event-handler or raw tags regardless of input', () => {
    const hostile = html('<img src=x onerror=alert(1)>\n\n[a](javascript:alert(1))\n\n<div onclick=x>');
    expect(hostile).not.toMatch(/<(script|img|div|a)\b/i);
    expect(hostile).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('proseToText', () => {
  it('renders blocks separated by blank lines', () => {
    expect(proseToText(parseProse('# t\n\npara'))).toBe('t\n\npara');
  });

  it('keeps link labels and image alts as text', () => {
    expect(proseToText(parseProse('[label](https://a.b) ![alt](/i.png)'))).toBe('label alt');
  });

  it('prefixes list items', () => {
    expect(proseToText(parseProse('- a\n- b'))).toBe('- a\n- b');
    expect(proseToText(parseProse('2. a'))).toBe('2. a');
  });

  it('joins table rows with pipes', () => {
    expect(proseToText(parseProse('| a |\n| - |\n| 1 |'))).toBe('a\n1');
  });

  it('omits thematic breaks', () => {
    expect(proseToText(parseProse('a\n\n---\n\nb'))).toBe('a\n\nb');
  });
});

describe('proseOutline', () => {
  it('lists top-level headings with levels and plain text', () => {
    expect(proseOutline(parseProse('# A\n\ntext\n\n## B **c**'))).toEqual([
      { id: 'a', level: 1, text: 'A' },
      { id: 'b-c', level: 2, text: 'B c' },
    ]);
  });

  it('honours maxLevel without breaking slug alignment', () => {
    const doc = parseProse('## Dup\n# Dup\n## Dup');
    expect(proseOutline(doc, { maxLevel: 1 })).toEqual([{ id: 'dup-2', level: 1, text: 'Dup' }]);
    expect(renderProseHtml(doc, { headingIds: true })).toContain('id="dup-2"');
  });

  it('includes blockquote-nested headings so slug alignment with the renderer holds', () => {
    const doc = parseProse('# A\n\n> # A\n\n# A');
    expect(proseOutline(doc)).toEqual([
      { id: 'a', level: 1, text: 'A' },
      { id: 'a-2', level: 1, text: 'A' },
      { id: 'a-3', level: 1, text: 'A' },
    ]);
    const html = renderProseHtml(doc, { headingIds: true });
    expect(html).toContain('id="a-2"');
    expect(html).toContain('id="a-3"');
  });
});
