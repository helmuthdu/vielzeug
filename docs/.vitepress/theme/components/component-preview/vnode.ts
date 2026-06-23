// vnode.ts
//
// Pure utilities for extracting raw HTML text from VitePress-rendered slot VNodes.
//
// VitePress processes fenced code blocks at build time into a VNode tree shaped as:
//   div.language-* > pre > code > [text nodes]
//
// These functions operate on plain objects and have no Vue runtime dependency,
// making them trivially unit-testable without mounting a component.

import type { VNode } from 'vue';

/** Recursively collect all text content from a VNode children value. */
export function collectText(node: unknown): string {
  if (typeof node === 'string') return node;

  if (Array.isArray(node)) return node.map(collectText).join('');

  if (node && typeof node === 'object' && 'children' in node) {
    return collectText((node as VNode).children);
  }

  return '';
}

/**
 * Extract text from within `pre > code` inside a VitePress language div.
 *
 * VitePress emits: div.language-* > [button.copy, span.lang, pre > code > ...]
 * We must target only `pre > code` to avoid picking up the language label
 * ("html", "ts", etc.) from the `span.lang` sibling.
 */
function extractCodeText(children: unknown): string {
  if (!Array.isArray(children)) return '';

  for (const child of children as VNode[]) {
    if (child.type === 'pre' && child.children) {
      for (const codeChild of child.children as VNode[]) {
        if (codeChild.type === 'code') return collectText(codeChild.children);
      }
    }
  }

  return '';
}

/**
 * Walk a slot VNode array and return the first VitePress code block found,
 * along with its extracted raw text content.
 *
 * Returns `null` if no code block is present in the slot.
 */
export function extractCodeFromSlot(vnodes: VNode[]): { text: string; vnode: VNode } | null {
  for (const vnode of vnodes) {
    if (vnode.type === 'div' && (vnode.props as Record<string, string> | null)?.class?.includes('language-')) {
      const text = extractCodeText(vnode.children);

      return text ? { text, vnode } : null;
    }

    if (Array.isArray(vnode.children)) {
      const found = extractCodeFromSlot(vnode.children as VNode[]);

      if (found) return found;
    }
  }

  return null;
}
