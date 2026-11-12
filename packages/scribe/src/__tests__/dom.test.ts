// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { parseProse } from '../parse';
import { renderProseDom } from '../render';

const render = (markdown: string, options?: Parameters<typeof renderProseDom>[1]): HTMLElement => {
  const container = document.createElement('div');
  container.append(renderProseDom(parseProse(markdown), options));
  return container;
};

describe('renderProseDom', () => {
  it('renders the semantic tree through DOM construction only', () => {
    const root = render('# Title\n\nHello **world**');
    expect(root.querySelector('h1')?.textContent).toBe('Title');
    expect(root.querySelector('strong')?.textContent).toBe('world');
  });

  it('renders text verbatim, including markup-lookalikes', () => {
    const root = render('<img src=x onerror=alert(1)>');
    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('onerror=alert(1)');
    expect(root.firstElementChild?.tagName).toBe('P');
  });

  it('sets link attributes via setAttribute with policy-passed destinations', () => {
    const root = render('[x](https://a.b?query=1&x=2)');
    const anchor = root.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('https://a.b?query=1&x=2');
    expect(anchor?.textContent).toBe('x');
  });

  it('renders tight list items without paragraph wrappers', () => {
    const root = render('- a\n- b');
    expect(root.querySelector('li > p')).toBeNull();
    expect(root.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders tables with thead and alignment attributes', () => {
    const root = render('| a | b |\n|:-:|--:|\n| 1 | 2 |');
    expect(root.querySelectorAll('thead th')).toHaveLength(2);
    expect(root.querySelector('tbody td')?.getAttribute('align')).toBe('center');
  });

  it('emits heading ids only when asked', () => {
    expect(render('# A').querySelector('h1')?.hasAttribute('id')).toBe(false);
    expect(render('# A', { headingIds: true }).querySelector('h1')?.getAttribute('id')).toBe('a');
  });

  it('hard-breaks render as br elements', () => {
    expect(render('a  \nb').querySelectorAll('br')).toHaveLength(1);
  });

  it('produces the same visible text as the input prose', () => {
    const markdown = '# t\n\nPara with `code`, [link](/l), and ~~strike~~.';
    expect(render(markdown).textContent).toBe('tPara with code, link, and strike.');
  });
});
