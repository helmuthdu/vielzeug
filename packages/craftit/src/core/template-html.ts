import { batch, untrack, effect as _effect, type CleanupFn } from '@vielzeug/stateit';

import { type Binding, type HtmlBinding } from './internal';
import { applyBindingsWithTargets } from './template-bindings';
import { type RegisterCleanup } from './template-bindings';
import {
  createNodes,
  findCommentMarker,
  indexBindingsInNodes,
  insertNodes,
  parseHTML,
  type BindingTargets,
} from './template-dom';
import { runAll } from './utilities';

/** Keyed reconciliation node — holds DOM nodes + lifecycle for one `each()` item. */
export type KeyedNode = {
  bindings: Binding[];
  cleanups: CleanupFn[];
  html: string;
  nodes: Node[];
  targets: BindingTargets;
};

const removeKeyed = (keyedNode: KeyedNode) => {
  runAll(keyedNode.cleanups);
  for (const n of keyedNode.nodes) (n as ChildNode).remove();
};

/** Apply bindings to keyed item nodes using pre-indexed targets. */
const applyKeyedItemBindings = (
  nodes: Node[],
  itemBindings: Binding[],
  targets = indexBindingsInNodes(nodes),
): CleanupFn[] => {
  const itemCleanups: CleanupFn[] = [];
  const itemRegisterCleanup: RegisterCleanup = (fn) => itemCleanups.push(fn);

  applyBindingsWithTargets(itemBindings, itemRegisterCleanup, targets);

  return itemCleanups;
};

/**
 * Sets up the reactive effect for an html-binding marker. Handles both non-keyed
 * (full replace) and keyed (`each()`) reconciliation.
 *
 * @param root         The root node containing the marker comment.
 * @param b            The HtmlBinding descriptor.
 * @param registerCleanup  Function that registers a cleanup tied to the outer container's lifetime.
 * @param keyedStates  Per-element map of `marker → (key → KeyedNode)` — caller owns this state.
 * @param applyBindingsInContainer  Function to apply bindings to container.
 */
export const applyHtmlBinding = (
  root: Node,
  b: HtmlBinding,
  registerCleanup: RegisterCleanup,
  keyedStates: Map<string, Map<string | number, KeyedNode>>,
  applyBindingsInContainer: (
    container: ParentNode,
    bindings: Binding[],
    registerCleanup: RegisterCleanup,
    opts?: { onHtml?: (b: HtmlBinding) => void },
  ) => void,
): void => {
  const found = findCommentMarker(root, b.uid);

  if (!found) return;

  const marker = document.createComment('html-binding');

  found.replaceWith(marker);

  let currentCleanups: CleanupFn[] = [];
  const registerInnerCleanup: RegisterCleanup = (fn) => currentCleanups.push(fn);
  const runCurrentCleanups = () => {
    runAll(currentCleanups);
    currentCleanups = [];
  };
  let lastHtml: string | null = null;
  let lastInsertedNodes: Node[] = [];

  // Use stateit.effect directly so cleanup is managed manually via registerCleanup, not autoCleanup.
  const stop = _effect(() => {
    batch(() => {
      const data = b.signal.value;

      if (!b.keyed && data.html === lastHtml) {
        return;
      }

      lastHtml = data.html;

      runCurrentCleanups();

      const { bindings, html, keys } = data;

      if (b.keyed && !keyedStates.has(b.uid)) keyedStates.set(b.uid, new Map());

      const keyedState = b.keyed ? keyedStates.get(b.uid)! : null;
      const container = (marker.parentElement || root) as ParentNode;

      let bindingsAlreadyApplied = false;

      untrack(() => {
        batch(() => {
          if (keyedState && keys?.length && data.items?.length === keys.length) {
            bindingsAlreadyApplied = true;

            // Transition from empty/fallback insertion back to keyed list items.
            if (keyedState.size === 0 && lastInsertedNodes.length > 0) {
              for (const n of lastInsertedNodes) (n as ChildNode).remove();
              lastInsertedNodes = [];
            }

            const newKeyedState = new Map<string | number, KeyedNode>();

            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              const itemData = data.items[i];
              const existing = keyedState.get(key);

              const prevNodes = i > 0 ? newKeyedState.get(keys[i - 1])?.nodes : null;
              const insertPoint = prevNodes?.length ? prevNodes[prevNodes.length - 1].nextSibling : marker.nextSibling;

              if (existing?.html === itemData.html) {
                // UPDATE: Same HTML — reuse nodes, reapply bindings
                if (existing.nodes[0]) insertNodes(marker, existing.nodes, insertPoint);

                runAll(existing.cleanups);

                const itemTargets = indexBindingsInNodes(existing.nodes);
                const itemCleanups = applyKeyedItemBindings(existing.nodes, itemData.bindings, itemTargets);

                newKeyedState.set(key, {
                  ...existing,
                  bindings: itemData.bindings,
                  cleanups: itemCleanups,
                  targets: itemTargets,
                });
              } else if (existing) {
                // REPLACE: Different HTML — create new nodes, remove old
                runAll(existing.cleanups);

                const newNodes = createNodes(itemData.html);
                const itemTargets = indexBindingsInNodes(newNodes);

                insertNodes(marker, newNodes, insertPoint);

                const itemCleanups = applyKeyedItemBindings(newNodes, itemData.bindings, itemTargets);

                newKeyedState.set(key, {
                  bindings: itemData.bindings,
                  cleanups: itemCleanups,
                  html: itemData.html,
                  nodes: newNodes,
                  targets: itemTargets,
                });
                for (const n of existing.nodes) (n as ChildNode).remove();
              } else {
                // CREATE: New item
                const newNodes = createNodes(itemData.html);
                const itemTargets = indexBindingsInNodes(newNodes);

                insertNodes(marker, newNodes, insertPoint);

                const itemCleanups = applyKeyedItemBindings(newNodes, itemData.bindings, itemTargets);

                newKeyedState.set(key, {
                  bindings: itemData.bindings,
                  cleanups: itemCleanups,
                  html: itemData.html,
                  nodes: newNodes,
                  targets: itemTargets,
                });
              }
            }

            // DELETE: Remove old items not in new state
            for (const [oldKey, oldNode] of keyedState) {
              if (!newKeyedState.has(oldKey)) removeKeyed(oldNode);
            }

            keyedStates.set(b.uid, newKeyedState);
          } else {
            // Non-keyed or empty list: replace previously inserted nodes.
            if (b.keyed && keyedState && keyedState.size > 0) {
              for (const [, kn] of keyedState) removeKeyed(kn);
            } else {
              for (const n of lastInsertedNodes) (n as ChildNode).remove();
            }

            const parsed = parseHTML(html);

            lastInsertedNodes = Array.from(parsed.childNodes);
            marker.after(parsed);

            if (b.keyed) keyedStates.set(b.uid, new Map());
          }
        });

        if (!bindingsAlreadyApplied) {
          applyBindingsInContainer(container, bindings, registerInnerCleanup, {
            onHtml: (binding) =>
              applyHtmlBinding(container, binding, registerInnerCleanup, keyedStates, applyBindingsInContainer),
          });
        }
      });
    });
  });

  registerCleanup(stop);
  registerCleanup(runCurrentCleanups);

  if (b.keyed) registerCleanup(() => keyedStates.delete(b.uid));
};
