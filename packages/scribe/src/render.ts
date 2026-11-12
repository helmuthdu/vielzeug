import { escapeHtml } from './_policy';
import { collectOutline, createSlugger, inlineText, type ProseSlugger } from './_text';
import type {
  ProseBlock,
  ProseDoc,
  ProseInline,
  ProseOutlineEntry,
  ProseOutlineOptions,
  ProseRenderOptions,
} from './types';

function titleAttr(title: string | undefined): string {
  return title === undefined ? '' : ` title="${escapeHtml(title)}"`;
}

function inlineHtml(nodes: readonly ProseInline[]): string {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += escapeHtml(node.text);
        break;
      case 'codeSpan':
        out += `<code>${escapeHtml(node.text)}</code>`;
        break;
      case 'strong':
        out += `<strong>${inlineHtml(node.children)}</strong>`;
        break;
      case 'emphasis':
        out += `<em>${inlineHtml(node.children)}</em>`;
        break;
      case 'strikethrough':
        out += `<del>${inlineHtml(node.children)}</del>`;
        break;
      case 'link':
        out += `<a href="${escapeHtml(node.href)}"${titleAttr(node.title)}>${inlineHtml(node.children)}</a>`;
        break;
      case 'image':
        out += `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}"${titleAttr(node.title)}>`;
        break;
      case 'softBreak':
        out += '\n';
        break;
      case 'hardBreak':
        out += '<br />\n';
        break;
    }
  }
  return out;
}

function headingAttrs(children: readonly ProseInline[], slugger: ProseSlugger, emitIds: boolean): string {
  return emitIds ? ` id="${slugger.slug(inlineText(children))}"` : '';
}

function blocksHtml(
  blocks: readonly ProseBlock[],
  slugger: ProseSlugger,
  emitIds: boolean,
  unwrapParagraphs: boolean,
): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph': {
        const inner = inlineHtml(block.children);
        parts.push(unwrapParagraphs ? inner : `<p>${inner}</p>`);
        break;
      }
      case 'heading': {
        const level = block.level;
        parts.push(
          `<h${level}${headingAttrs(block.children, slugger, emitIds)}>${inlineHtml(block.children)}</h${level}>`,
        );
        break;
      }
      case 'codeBlock': {
        const cls = block.language === undefined ? '' : ` class="language-${escapeHtml(block.language)}"`;
        parts.push(`<pre><code${cls}>${escapeHtml(block.text)}\n</code></pre>`);
        break;
      }
      case 'blockquote':
        parts.push(`<blockquote>\n${blocksHtml(block.children, slugger, emitIds, false)}\n</blockquote>`);
        break;
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const startAttr = block.ordered && block.start !== 1 ? ` start="${block.start}"` : '';
        const items = block.items
          .map((item) => `<li>${blocksHtml(item.children, slugger, emitIds, block.tight)}</li>`)
          .join('\n');
        parts.push(`<${tag}${startAttr}>\n${items}\n</${tag}>`);
        break;
      }
      case 'thematicBreak':
        parts.push('<hr />');
        break;
      case 'table': {
        const cellAttrs = (index: number): string => {
          const alignment = block.alignments[index];
          return alignment === undefined || alignment === 'left' ? '' : ` align="${alignment}"`;
        };
        const headerRow = `<tr>${block.header
          .map((cell, index) => `<th${cellAttrs(index)}>${inlineHtml(cell)}</th>`)
          .join('')}</tr>`;
        const bodyRows = block.rows
          .map(
            (row) => `<tr>${row.map((cell, index) => `<td${cellAttrs(index)}>${inlineHtml(cell)}</td>`).join('')}</tr>`,
          )
          .join('\n');
        parts.push(
          `<table>\n<thead>\n${headerRow}\n</thead>\n<tbody>\n${bodyRows.length === 0 ? '' : `${bodyRows}\n`}</tbody>\n</table>`,
        );
        break;
      }
    }
  }
  return parts.join('\n');
}

/**
 * Render a parsed document to an HTML string. Every dynamic value is escaped; the only tags
 * emitted are the fixed set the renderer itself writes. Pair with a Content-Security-Policy
 * that disallows inline handlers for defense in depth — the string itself carries none.
 *
 * Requires a browser (or DOM) environment for {@link renderProseDom}; Node can use this
 * string renderer directly.
 */
export function renderProseHtml(prose: ProseDoc, options: ProseRenderOptions = {}): string {
  return blocksHtml(prose.blocks, createSlugger(), options.headingIds === true, false);
}

function inlineDom(doc: Document, nodes: readonly ProseInline[]): (Element | Text)[] {
  const out: (Element | Text)[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out.push(doc.createTextNode(node.text));
        break;
      case 'codeSpan': {
        const code = doc.createElement('code');
        code.append(doc.createTextNode(node.text));
        out.push(code);
        break;
      }
      case 'strong':
      case 'emphasis':
      case 'strikethrough': {
        const element = doc.createElement(
          node.type === 'strikethrough' ? 'del' : node.type === 'strong' ? 'strong' : 'em',
        );
        element.append(...inlineDom(doc, node.children));
        out.push(element);
        break;
      }
      case 'link': {
        const anchor = doc.createElement('a');
        anchor.setAttribute('href', node.href);
        if (node.title !== undefined) anchor.setAttribute('title', node.title);
        anchor.append(...inlineDom(doc, node.children));
        out.push(anchor);
        break;
      }
      case 'image': {
        const image = doc.createElement('img');
        image.setAttribute('src', node.src);
        image.setAttribute('alt', node.alt);
        if (node.title !== undefined) image.setAttribute('title', node.title);
        out.push(image);
        break;
      }
      case 'softBreak':
        out.push(doc.createTextNode('\n'));
        break;
      case 'hardBreak':
        out.push(doc.createElement('br'));
        break;
    }
  }
  return out;
}

function blocksDom(
  doc: Document,
  blocks: readonly ProseBlock[],
  slugger: ProseSlugger,
  emitIds: boolean,
  unwrapParagraphs: boolean,
): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph': {
        if (unwrapParagraphs) {
          fragment.append(...inlineDom(doc, block.children));
        } else {
          const p = doc.createElement('p');
          p.append(...inlineDom(doc, block.children));
          fragment.append(p);
        }
        break;
      }
      case 'heading': {
        const heading = doc.createElement(`h${block.level}`);
        if (emitIds) heading.setAttribute('id', slugger.slug(inlineText(block.children)));
        heading.append(...inlineDom(doc, block.children));
        fragment.append(heading);
        break;
      }
      case 'codeBlock': {
        const pre = doc.createElement('pre');
        const code = doc.createElement('code');
        if (block.language !== undefined) code.classList.add(`language-${block.language}`);
        code.append(doc.createTextNode(block.text));
        pre.append(code);
        fragment.append(pre);
        break;
      }
      case 'blockquote': {
        const quote = doc.createElement('blockquote');
        quote.append(blocksDom(doc, block.children, slugger, emitIds, false));
        fragment.append(quote);
        break;
      }
      case 'list': {
        const list = doc.createElement(block.ordered ? 'ol' : 'ul');
        if (block.ordered && block.start !== 1) list.setAttribute('start', String(block.start));
        for (const item of block.items) {
          const li = doc.createElement('li');
          li.append(blocksDom(doc, item.children, slugger, emitIds, block.tight));
          list.append(li);
        }
        fragment.append(list);
        break;
      }
      case 'thematicBreak':
        fragment.append(doc.createElement('hr'));
        break;
      case 'table': {
        const table = doc.createElement('table');
        const thead = doc.createElement('thead');
        const headerRow = doc.createElement('tr');
        block.header.forEach((cell, index) => {
          const th = doc.createElement('th');
          const alignment = block.alignments[index];
          if (alignment !== undefined && alignment !== 'left') th.setAttribute('align', alignment);
          th.append(...inlineDom(doc, cell));
          headerRow.append(th);
        });
        thead.append(headerRow);
        const tbody = doc.createElement('tbody');
        for (const row of block.rows) {
          const tr = doc.createElement('tr');
          row.forEach((cell, index) => {
            const td = doc.createElement('td');
            const alignment = block.alignments[index];
            if (alignment !== undefined && alignment !== 'left') td.setAttribute('align', alignment);
            td.append(...inlineDom(doc, cell));
            tr.append(td);
          });
          tbody.append(tr);
        }
        table.append(thead, tbody);
        fragment.append(table);
        break;
      }
    }
  }
  return fragment;
}

/**
 * Render a parsed document to a `DocumentFragment`. Text reaches the DOM exclusively through
 * `createTextNode`, so document content can never execute: no `innerHTML`, no attribute is ever
 * sourced from Markdown beyond `href`/`src`/`alt`/`title`/slug `id`s, and those already passed
 * the parse-time protocol policy. Requires a DOM environment.
 */
export function renderProseDom(prose: ProseDoc, options: ProseRenderOptions = {}): DocumentFragment {
  return blocksDom(document, prose.blocks, createSlugger(), options.headingIds === true, false);
}

function blockText(block: ProseBlock): string {
  switch (block.type) {
    case 'paragraph':
      return inlineText(block.children);
    case 'heading':
      return inlineText(block.children);
    case 'codeBlock':
      return block.text;
    case 'blockquote':
      return block.children.map(blockText).join('\n\n');
    case 'list':
      return block.items
        .map((item, index) => {
          const marker = block.ordered ? `${block.start + index}. ` : '- ';
          return marker + item.children.map(blockText).join('\n\n');
        })
        .join('\n');
    case 'thematicBreak':
      return '';
    case 'table': {
      const rows = [block.header, ...block.rows].map((row) => row.map((cell) => inlineText(cell)).join(' | '));
      return rows.join('\n');
    }
  }
}

/**
 * Render the document as plain text: for notifications, search indexing, and previews.
 * Links keep their label text, images their alt text.
 */
export function proseToText(prose: ProseDoc): string {
  return prose.blocks
    .map(blockText)
    .filter((text) => text !== '')
    .join('\n\n');
}

/**
 * The document's headings with stable slug ids, traversed exactly as `renderProse*` does with
 * `headingIds` (including headings nested in blockquotes and lists), so outline ids always
 * match the rendered document. Use for tables of contents.
 */
export function proseOutline(prose: ProseDoc, options: ProseOutlineOptions = {}): readonly ProseOutlineEntry[] {
  return collectOutline(prose.blocks, createSlugger(), options.maxLevel ?? 6);
}
