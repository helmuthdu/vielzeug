import { describe, expect, it } from 'vitest';

import { parseProse } from '../parse';
import type { ProseBlock, ProseDoc } from '../types';

const blocks = (markdown: string): readonly ProseBlock[] => parseProse(markdown).blocks;
const first = (markdown: string): ProseBlock => blocks(markdown)[0];

describe('parseProse: blocks', () => {
  it('parses ATX headings with levels and inline content', () => {
    const heading = first('# Hello **world**');
    expect(heading).toMatchObject({ level: 1, type: 'heading' });
  });

  it('caps heading level at six and ignores seven hashes', () => {
    expect(first('####### seven')).toMatchObject({ type: 'paragraph' });
    expect(first('###### six')).toMatchObject({ level: 6, type: 'heading' });
  });

  it('treats a hash without a following space as paragraph text', () => {
    expect(first('#hashtag')).toMatchObject({ type: 'paragraph' });
  });

  it('strips closing hash runs from headings', () => {
    const heading = first('## Title ##');
    expect(heading).toMatchObject({ children: [{ text: 'Title', type: 'text' }], type: 'heading' });
  });

  it('parses thematic breaks in all three marker styles', () => {
    expect(blocks('---\n\n***\n\n___')).toHaveLength(3);
    for (const block of blocks('---\n\n***\n\n___')) expect(block.type).toBe('thematicBreak');
  });

  it('parses fenced code with language info and no inline processing', () => {
    expect(first('```ts\nconst a = 1;\n```')).toEqual({
      language: 'ts',
      text: 'const a = 1;',
      type: 'codeBlock',
    });
  });

  it('parses indented code blocks outside paragraphs', () => {
    expect(first('    x = 1')).toEqual({ text: 'x = 1', type: 'codeBlock' });
  });

  it('keeps a four-space-indented paragraph continuation as paragraph text', () => {
    expect(first('para\n    continues here')).toMatchObject({ type: 'paragraph' });
  });

  it('parses blockquotes with recursive block content', () => {
    const quote = first('> quoted **text**');
    expect(quote).toMatchObject({ children: [{ type: 'paragraph' }], type: 'blockquote' });
  });

  it('ends a blockquote when a line stops carrying the marker (no lazy continuation)', () => {
    expect(blocks('> quoted\nlazy continuation')).toHaveLength(2);
  });

  it('parses tight unordered lists without paragraph wrappers', () => {
    const list = first('- one\n- two');
    expect(list).toMatchObject({ ordered: false, tight: true, type: 'list' });
  });

  it('marks a list loose when a blank line separates items', () => {
    const list = first('- one\n\n- two');
    expect(list).toMatchObject({ tight: false, type: 'list' });
  });

  it('keeps ordered list start numbers', () => {
    const list = first('3. three\n4. four');
    expect(list).toMatchObject({ ordered: true, start: 3, type: 'list' });
  });

  it('treats an ordered marker other than 1 right below a paragraph as text', () => {
    const doc = parseProse('para\n2. not a list');
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0]).toMatchObject({ type: 'paragraph' });
  });

  it('nests a deeper list inside the containing item', () => {
    const list = first('- one\n  - nested') as { items: readonly { children: readonly ProseBlock[] }[] };
    const firstItem = list.items[0];
    expect(list.items).toHaveLength(1);
    expect(firstItem.children[1]).toMatchObject({ type: 'list' });
  });

  it('starts a new list when the marker kind changes', () => {
    expect(blocks('- a\n\n+ b')).toHaveLength(2);
  });

  it('parses a GFM table with alignments and escaped pipes', () => {
    const table = first('| a | b |\n|:--|:-:|\n| 1 | \\| |') as {
      alignments: string[];
      header: readonly unknown[];
      rows: readonly (readonly unknown[])[];
    };
    expect(table.type).toBe('table');
    expect(table.alignments).toEqual(['left', 'center']);
    expect(table.header).toHaveLength(2);
    expect(table.rows[0][1]).toEqual([{ text: '|', type: 'text' }]);
  });

  it('renders setext-style underlines as literal text (profile has no setext headings)', () => {
    const doc = parseProse('Setext\n======');
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0]).toMatchObject({ type: 'paragraph' });
  });

  it('normalizes CRLF and tabs', () => {
    expect(blocks('# a\r\n\r\n- b')).toHaveLength(2);
    expect(first('    indented')).toMatchObject({ type: 'codeBlock' });
  });

  it('returns an empty block list for an empty document', () => {
    expect(parseProse('').blocks).toEqual([]);
  });

  it('freezes the returned document deeply', () => {
    const doc: ProseDoc = parseProse('text');
    expect(Object.isFrozen(doc)).toBe(true);
    const paragraph = doc.blocks[0] as { children: unknown[] };
    expect(Object.isFrozen(paragraph.children)).toBe(true);
  });
});

describe('parseProse: inline', () => {
  const inlineOf = (markdown: string): readonly unknown[] => (first(markdown) as { children: unknown[] }).children;

  it('parses strong and emphasis from asterisks and underscores', () => {
    expect(inlineOf('**b** and _i_')).toEqual([
      { children: [{ text: 'b', type: 'text' }], type: 'strong' },
      { text: ' and ', type: 'text' },
      { children: [{ text: 'i', type: 'text' }], type: 'emphasis' },
    ]);
  });

  it('parses combined emphasis like CommonMark ordering', () => {
    expect(inlineOf('***both***')).toEqual([
      {
        children: [{ children: [{ text: 'both', type: 'text' }], type: 'strong' }],
        type: 'emphasis',
      },
    ]);
  });

  it('leaves intra-word underscores literal', () => {
    expect(inlineOf('snake_case_word')).toEqual([{ text: 'snake_case_word', type: 'text' }]);
  });

  it('parses GFM strikethrough only for double tildes', () => {
    expect(inlineOf('~~gone~~ ~single~')).toEqual([
      { children: [{ text: 'gone', type: 'text' }], type: 'strikethrough' },
      { text: ' ~single~', type: 'text' },
    ]);
  });

  it('trims one surrounding space inside code spans', () => {
    expect(inlineOf('` a ` ')).toEqual([
      { text: 'a', type: 'codeSpan' },
      { text: ' ', type: 'text' },
    ]);
  });

  it('keeps unmatched backticks literal', () => {
    expect(inlineOf('a ` b')).toEqual([{ text: 'a ` b', type: 'text' }]);
  });

  it('escapes punctuation after a backslash', () => {
    expect(inlineOf('\\*not em\\*')).toEqual([{ text: '*not em*', type: 'text' }]);
  });

  it('renders raw HTML as literal text', () => {
    expect(inlineOf('<script>alert(1)</script>')).toEqual([{ text: '<script>alert(1)</script>', type: 'text' }]);
  });

  it('does not decode HTML entities', () => {
    expect(inlineOf('&amp; &copy;')).toEqual([{ text: '&amp; &copy;', type: 'text' }]);
  });

  it('parses inline links with titles', () => {
    expect(inlineOf('[x](https://a.b "T")')).toEqual([
      { children: [{ text: 'x', type: 'text' }], href: 'https://a.b', title: 'T', type: 'link' },
    ]);
  });

  it('keeps balanced parentheses inside link destinations', () => {
    expect(inlineOf('[w](https://ex.org/a_(b)_c)')).toEqual([
      { children: [{ text: 'w', type: 'text' }], href: 'https://ex.org/a_(b)_c', type: 'link' },
    ]);
  });

  it('parses angle autolinks and bare http links', () => {
    expect(inlineOf('<https://a.b>')).toEqual([
      { children: [{ text: 'https://a.b', type: 'text' }], href: 'https://a.b', type: 'link' },
    ]);
    expect(inlineOf('see https://a.b.')).toEqual([
      { text: 'see ', type: 'text' },
      { children: [{ text: 'https://a.b', type: 'text' }], href: 'https://a.b', type: 'link' },
      { text: '.', type: 'text' },
    ]);
  });

  it('parses images with alt text from the label', () => {
    expect(inlineOf('![a **b**](/i.png)')).toEqual([{ alt: 'a b', src: '/i.png', type: 'image' }]);
  });

  it('treats reference-link syntax as literal text (profile has no reference links)', () => {
    expect(inlineOf('[a][ref]')).toEqual([{ text: '[a][ref]', type: 'text' }]);
  });

  it('emits soft breaks for single newlines and hard breaks for trailing spaces', () => {
    expect(inlineOf('a  \nb')).toEqual([
      { text: 'a', type: 'text' },
      { type: 'hardBreak' },
      { text: 'b', type: 'text' },
    ]);
    expect(inlineOf('a\nb')).toEqual([{ text: 'a', type: 'text' }, { type: 'softBreak' }, { text: 'b', type: 'text' }]);
  });
});
