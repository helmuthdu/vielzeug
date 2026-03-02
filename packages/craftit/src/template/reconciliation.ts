/**
 * Keyed List Reconciliation
 * Efficient list rendering with DOM node reuse
 */

import { EffectScope, effect, untrack, type Signal } from '../core/signal';
import { isSignal } from '../core/types';
import { createFragment } from './_common';
import type { EachDirective } from './directives';

function trace(msg: string, data?: any) {
  const t = (window as any).CRAFTIT_TRACE;
  if (t) {
    t.push({ time: Date.now(), msg, data });
  }
}

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
  marker: Comment | null;
  fallbackNodes?: Node[]; // Track fallback nodes for cleanup
  itemScopes?: Map<string | number, EffectScope>; // Track scopes for cleanup
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

  console.log('[reconcileKeyedList] itemsSource is signal?', isSignal(itemsSource), 'items:', items);

  // Ensure state is properly initialized
  if (!state.keyToNode) {
    state.keyToNode = new Map();
  }
  if (!state.itemScopes) {
    state.itemScopes = new Map();
  }

  // Get parent element (always fresh to handle marker moves)
  const parent = marker.parentElement;
  console.log('[reconcileKeyedList] parent:', parent, 'marker:', marker, 'items.length:', items.length);
  if (!parent) {
    console.warn('[reconcileKeyedList] No parent element, returning early');
    return;
  }

  state.marker = marker;

  trace('reconcileKeyedList:start', {
    marker: marker.data,
    parentId: (parent as any).id || parent.tagName,
    itemCount: items.length,
  });

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
    if (!state.keyToNode) {
      console.error('[craftit] state.keyToNode is undefined in reconcileKeyedList (empty case)', { state, marker });
      return;
    }
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
    if (fallback) {
      const fallbackContent = typeof fallback === 'function' ? fallback() : fallback;
      const fragment = createFragment(fallbackContent);

      // Track fallback nodes
      state.fallbackNodes = Array.from(fragment.childNodes);
      parent.insertBefore(fragment, marker.nextSibling);
    }

    return;
  }

  // Build new key map
  const newKeys = items.map((item, index) => ({
    index,
    item,
    key: keyFn(item, index),
  }));

  // Track which keys we've seen
  const newKeySet = new Set(newKeys.map((k) => k.key));

  // Remove nodes for keys that no longer exist (remove all nodes for each key)
  const entriesToRemove = Array.from(state.keyToNode.entries());
  for (const [key, entry] of entriesToRemove) {
    if (!newKeySet.has(key)) {
      for (const node of entry.nodes) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
      state.keyToNode.delete(key);

      // Dispose of item scope
      const scope = state.itemScopes?.get(key);
      if (scope) {
        scope.dispose();
        state.itemScopes?.delete(key);
      }
    }
  }

  // Process new list
  let previousNode: Node = marker;

  for (const { key, item, index } of newKeys) {
    const existing = state.keyToNode.get(key);

    if (existing) {
      // Node exists - dispose old scope and re-render with new item data
      console.log('[reconcileKeyedList] REUSING key:', key, 'item:', item);
      const { nodes } = existing;

      // Dispose old scope to clean up stale effects and bindings
      const oldScope = state.itemScopes!.get(key);
      if (oldScope) {
        oldScope.dispose();
      }

      // Create fresh scope for re-render
      const newScope = new EffectScope();
      state.itemScopes!.set(key, newScope);

      // Render with new item data
      console.log('[reconcileKeyedList] REUSE: About to call template with item:', item, 'index:', index);
      const newContent = newScope.run(() => untrack(() => template(item, index)));
      console.log('[reconcileKeyedList] newContent:', newContent);
      console.log('[reconcileKeyedList] REUSE: newContent.values:', (newContent as any).values);

      let newFragment;
      try {
        newFragment = createFragment(newContent);
        console.log('[reconcileKeyedList] REUSE: createFragment succeeded');
      } catch (err) {
        console.error('[reconcileKeyedList] REUSE: createFragment failed:', err);
        throw err;
      }

      const newNodes = Array.from(newFragment.childNodes);
      console.log('[reconcileKeyedList] newNodes:', newNodes);
      if (newNodes[0] instanceof Element) {
        console.log('[reconcileKeyedList] REUSE First node HTML:', (newNodes[0] as Element).outerHTML);
      }

      // Remove old nodes
      for (const node of nodes) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }

      // Insert new nodes at the same position
      parent.insertBefore(newFragment, previousNode.nextSibling);

      // Update stored nodes
      state.keyToNode.set(key, { nodes: newNodes });
      previousNode = newNodes[newNodes.length - 1];
    } else {
      // Create new nodes
      console.log('[reconcileKeyedList] CREATING NEW key:', key, 'item:', item);
      // IMPORTANT: Use EffectScope to isolate item reactivity
      // This prevents item effects from being disposed when the parent list effect re-runs
      const scope = new EffectScope();
      state.itemScopes!.set(key, scope);

      console.log('[reconcileKeyedList] CREATE: About to call template with item:', item, 'index:', index);
      const content = scope.run(() => untrack(() => template(item, index)));
      console.log('[reconcileKeyedList] CREATE: content.values:', (content as any).values);
      const fragment = createFragment(content);

      // Insert after previous node
      const nodes = Array.from(fragment.childNodes);
      console.log('[reconcileKeyedList] NEW nodes created:', nodes);
      if (nodes[0] instanceof Element) {
        console.log('[reconcileKeyedList] First node HTML:', (nodes[0] as Element).outerHTML);
      }
      parent.insertBefore(fragment, previousNode.nextSibling);

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

  console.log('[makeKeyedListReactive] Called, isSignal:', isSignal(itemsSource), 'itemsSource:', itemsSource);

  // If items is a signal, make it reactive
  if (isSignal(itemsSource)) {
    let runCount = 0;

    // Schedule effect creation for next tick to escape any parent untrack() context
    // This ensures the effect can properly track the signal
    queueMicrotask(() => {
      effect(() => {
        runCount++;
        const items = (itemsSource as Signal<T[]>).value; // Explicitly read the signal
        console.log('[makeKeyedListReactive:effect] Run #' + runCount + ', Reconciling, items:', items);
        reconcileKeyedList(marker, directive, state);
      });
    });

    // But also render once immediately (synchronously) for initial render
    reconcileKeyedList(marker, directive, state);
  } else {
    // Static list - render once
    reconcileKeyedList(marker, directive, state);
  }
}
