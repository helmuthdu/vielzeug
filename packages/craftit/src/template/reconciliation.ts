/**
 * Keyed List Reconciliation
 * Efficient list rendering with DOM node reuse
 */

import { effect } from '../core/signal';
import { isSignal } from '../core/types';
import { createFragment } from './_common';
import type { EachDirective } from './directives';

/**
 * Keyed list state for reconciliation
 * Tracks all nodes for each key to properly handle multi-node templates
 */
export interface KeyedListState {
  keyToNode: Map<
    string | number,
    {
      nodes: Node[]; // Track all nodes for proper multi-node template support
    }
  >;
  parent: Element | null;
  marker: Comment | null;
  fallbackNodes?: Node[]; // Track fallback nodes for cleanup
}

/**
 * Reconcile a keyed list
 * This implements a simple but effective reconciliation algorithm
 * Properly handles multi-node templates by tracking all nodes per key
 */
export function reconcileKeyedList<T>(marker: Comment, directive: EachDirective<T>, state: KeyedListState): void {
  const { items: itemsSource, keyFn, template, fallback } = directive;

  // Get current items with proper signal detection
  const items = Array.isArray(itemsSource)
    ? itemsSource
    : isSignal(itemsSource)
      ? itemsSource.value
      : (() => {
          throw new Error('[craftit] Invalid itemsSource for html.each - must be array or signal');
        })();

  // Ensure items is an array
  if (!Array.isArray(items)) {
    throw new Error('[craftit] html.each items must be an array');
  }

  // Get parent element
  if (!marker.parentElement) return;

  state.parent = marker.parentElement;
  state.marker = marker;

  // Clean up any previous fallback nodes
  if (state.fallbackNodes) {
    for (const node of state.fallbackNodes) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    state.fallbackNodes = undefined;
  }

  // Handle empty list with fallback
  if (items.length === 0) {
    // Remove all existing nodes (all nodes for each key)
    for (const [key, entry] of state.keyToNode.entries()) {
      for (const node of entry.nodes) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
      state.keyToNode.delete(key);
    }

    // Render fallback if provided
    if (fallback && state.parent) {
      const fallbackContent = typeof fallback === 'function' ? fallback() : fallback;
      const fragment = createFragment(fallbackContent);

      // Track fallback nodes
      state.fallbackNodes = Array.from(fragment.childNodes);
      state.parent.insertBefore(fragment, marker.nextSibling);
    }

    return;
  }

  // Build new key map
  const newKeys = items.map((item, index) => ({
    index,
    item,
    key: keyFn(item, index),
  }));

  if (!state.parent) return;

  // Track which keys we've seen
  const newKeySet = new Set(newKeys.map((k) => k.key));

  // Remove nodes for keys that no longer exist (remove all nodes for each key)
  for (const [key, entry] of state.keyToNode.entries()) {
    if (!newKeySet.has(key)) {
      for (const node of entry.nodes) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
      state.keyToNode.delete(key);
    }
  }

  // Process new list
  let previousNode: Node = marker;

  for (const { key, item, index } of newKeys) {
    const existing = state.keyToNode.get(key);

    if (existing) {
      // Reuse existing nodes - move if needed
      const { nodes } = existing;
      const firstNode = nodes[0];

      // Check if nodes need to be moved
      if (firstNode.previousSibling !== previousNode) {
        // Move all nodes for this key
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          fragment.appendChild(node);
        }
        if (state.parent) {
          state.parent.insertBefore(fragment, previousNode.nextSibling);
        }
      }

      // Update previousNode to last node of this item
      previousNode = nodes[nodes.length - 1];
    } else {
      // Create new nodes
      const content = template(item, index);
      const fragment = createFragment(content);

      // Insert after previous node
      const nodes = Array.from(fragment.childNodes);
      if (state.parent) {
        state.parent.insertBefore(fragment, previousNode.nextSibling);
      }

      // Store all nodes for this key
      if (nodes.length > 0) {
        state.keyToNode.set(key, { nodes });
        previousNode = nodes[nodes.length - 1];
      }
    }
  }
}

/**
 * Make keyed list reactive
 */
export function makeKeyedListReactive<T>(marker: Comment, directive: EachDirective<T>, state: KeyedListState): void {
  const { items: itemsSource } = directive;

  // If items is a signal, make it reactive
  if (isSignal(itemsSource)) {
    effect(() => {
      reconcileKeyedList(marker, directive, state);
    });
  } else {
    // Static list - render once
    reconcileKeyedList(marker, directive, state);
  }
}
