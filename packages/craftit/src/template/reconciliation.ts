/**
 * Keyed List Reconciliation
 * Efficient list rendering with DOM node reuse
 */

import type { EachDirective } from './directives';
import type { TemplateResult } from './html';
import { effect } from '../core/signal';
import { renderTemplate } from './html';

/**
 * Keyed list state for reconciliation
 */
export interface KeyedListState {
  keyToNode: Map<string | number, {
    node: Node;
    data: any;
  }>;
  parent: Element | null;
  marker: Comment | null;
}

/**
 * Reconcile a keyed list
 * This implements a simple but effective reconciliation algorithm
 */
export function reconcileKeyedList<T>(
  marker: Comment,
  directive: EachDirective<T>,
  state: KeyedListState,
): void {
  const { items: itemsSource, keyFn, template, fallback } = directive;

  // Get current items
  const items = Array.isArray(itemsSource) ? itemsSource : itemsSource.value;

  // Get parent element
  if (!marker.parentElement) return;

  state.parent = marker.parentElement;
  state.marker = marker;

  // Handle empty list with fallback
  if (items.length === 0) {
    // Remove all existing nodes
    for (const [key, { node }] of state.keyToNode.entries()) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      state.keyToNode.delete(key);
    }

    // Render fallback if provided
    if (fallback && state.parent) {
      const fallbackContent = typeof fallback === 'function' ? fallback() : fallback;
      const fragment = createFragmentFromTemplate(fallbackContent);
      state.parent.insertBefore(fragment, marker.nextSibling);
    }

    return;
  }

  // Build new key map
  const newKeys = items.map((item, index) => ({
    key: keyFn(item, index),
    item,
    index,
  }));

  if (!state.parent) return;

  state.parent = parent;
  state.marker = marker;

  // Track which keys we've seen
  const newKeySet = new Set(newKeys.map(k => k.key));

  // Remove nodes for keys that no longer exist
  for (const [key, { node }] of state.keyToNode.entries()) {
    if (!newKeySet.has(key)) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      state.keyToNode.delete(key);
    }
  }

  // Process new list
  let previousNode: Node = marker;

  for (const { key, item, index } of newKeys) {
    const existing = state.keyToNode.get(key);

    if (existing) {
      // Reuse existing node - move if needed
      const { node } = existing;

      // Check if node needs to be moved
      if (node.previousSibling !== previousNode) {
        state.parent.insertBefore(node, previousNode.nextSibling);
      }

      // Update the node data (in case item changed)
      existing.data = item;
      previousNode = node;
    } else {
      // Create new node
      const content = template(item, index);
      const fragment = createFragmentFromTemplate(content);

      // Insert after previous node
      const nodes = Array.from(fragment.childNodes);
      state.parent.insertBefore(fragment, previousNode.nextSibling);

      // Store reference (use first node as anchor)
      if (nodes.length > 0) {
        state.keyToNode.set(key, {
          node: nodes[0],
          data: item,
        });
        previousNode = nodes[nodes.length - 1];
      }
    }
  }
}

/**
 * Create a DocumentFragment from a template result or string
 */
function createFragmentFromTemplate(content: TemplateResult | string): DocumentFragment {
  if (typeof content === 'string') {
    const template = document.createElement('template');
    template.innerHTML = content;
    return template.content;
  }

  // For TemplateResult, we need to render it
  const container = document.createElement('div');
  renderTemplate(content, container);

  const fragment = document.createDocumentFragment();
  while (container.firstChild) {
    fragment.appendChild(container.firstChild);
  }

  return fragment;
}

/**
 * Make keyed list reactive
 */
export function makeKeyedListReactive<T>(
  marker: Comment,
  directive: EachDirective<T>,
  state: KeyedListState,
): void {
  const { items: itemsSource } = directive;

  // If items is a signal, make it reactive
  if (typeof itemsSource === 'object' && 'value' in itemsSource) {
    effect(() => {
      reconcileKeyedList(marker, directive, state);
    });
  } else {
    // Static list - render once
    reconcileKeyedList(marker, directive, state);
  }
}


