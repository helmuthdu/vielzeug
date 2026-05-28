import { batch, computed, effect as rawEffect, isSignal, untrack, type ReadonlySignal } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from '../errors';
import {
  applyBindingsWithTargets,
  applyHtmlBinding,
  indexBindingTargets,
  parseHTML,
  type RegisterCleanup,
} from '../template-bindings';
import {
  createDirectiveResult,
  htmlResult,
  isHtmlResult,
  type DirectiveResult,
  type HtmlBinding,
  type HTMLResult,
} from '../types/bindings';
import { escapeHtml, removeNodes, runAll } from '../utils/dom';
import { createMarkerIdFactory, rekeyHtmlResult } from '../utils/id';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Signal, getter function, or plain array. */
type MaybeReactiveArray<T> = ReadonlySignal<T[]> | (() => T[]) | T[];

type ItemEntry = {
  cleanups: (() => void)[];
  nodes: Node[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toHtmlResult = (value: string | HTMLResult): HTMLResult =>
  isHtmlResult(value) ? value : htmlResult(escapeHtml(String(value)));

// ─── Keyed item lifecycle ─────────────────────────────────────────────────────

const createItem = <T>(
  item: T,
  index: number,
  render: (item: T, index: number) => string | HTMLResult,
  getNextId: () => string,
  parent: ParentNode,
  insertBefore: Node,
  registerCleanup: RegisterCleanup,
): ItemEntry => {
  const raw = render(item, index);
  const rekeyed = rekeyHtmlResult(isHtmlResult(raw) ? raw : htmlResult(escapeHtml(String(raw))), getNextId);

  const fragment = parseHTML(rekeyed.html);
  const itemNodes = Array.from(fragment.childNodes);

  // Move nodes to real DOM BEFORE applying html bindings
  for (const node of itemNodes) {
    parent.insertBefore(node, insertBefore);
  }

  const cleanups: (() => void)[] = [];
  const registerItemCleanup: RegisterCleanup = (fn) => cleanups.push(fn);

  if (rekeyed.bindings.length > 0) {
    const deferredHtmlBindings: HtmlBinding[] = [];

    applyBindingsWithTargets(rekeyed.bindings, registerItemCleanup, indexBindingTargets(itemNodes), {
      onHtml: (b) => deferredHtmlBindings.push(b),
    });

    for (const b of deferredHtmlBindings) {
      applyHtmlBinding(parent as unknown as Node, b, registerItemCleanup);
    }
  }

  registerCleanup(() => {
    runAll(cleanups);
    removeNodes(itemNodes);
  });

  return { cleanups, nodes: itemNodes };
};

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Renders a reactive list with keyed DOM diffing as a `DirectiveResult`.
 *
 * Performs minimal DOM mutations when the source changes: items are created, removed,
 * and reordered based on their stable keys. Use inside `html` tagged templates.
 *
 * Accepts a signal, getter function, or plain array as the source.
 *
 * @param source   - Signal, getter function, or plain array of items.
 * @param key      - Returns a stable unique key for each item (used for diff tracking).
 * @param render   - Returns the HTML template for each item.
 * @param fallback - Optional: rendered when the list is empty.
 *
 * @example
 * html`${each(items, (item) => item.id, (item) => html`<li>${item.name}</li>`)}`
 */
export function each<T>(
  source: MaybeReactiveArray<T>,
  key: (item: T, index: number) => string | number,
  render: (item: T, index: number) => string | HTMLResult,
  fallback?: () => string | HTMLResult,
): DirectiveResult {
  const normalized: ReadonlySignal<T[]> = Array.isArray(source)
    ? ({
        get value() {
          return source as T[];
        },
      } as ReadonlySignal<T[]>)
    : isSignal(source)
      ? source
      : computed(source as () => T[]);

  return createDirectiveResult((anchor, registerCleanup) => {
    const parent = anchor.parentNode!;
    const endMarker = document.createComment('each/end');

    parent.insertBefore(endMarker, anchor.nextSibling);

    // Shared ID factory across all items to prevent UID collisions
    const globalIdFactory = createMarkerIdFactory();

    let currentKeys: (string | number)[] = [];
    const keyedItems = new Map<string | number, ItemEntry>();

    // Fallback tracking: key sentinel for the fallback content
    const FALLBACK_KEY = '__each_fallback__';

    const removeItem = (k: string | number): void => {
      const entry = keyedItems.get(k);

      if (!entry) return;

      runAll(entry.cleanups);
      removeNodes(entry.nodes);
      keyedItems.delete(k);
    };

    const update = (newItems: T[]): void => {
      batch(() => {
        if (newItems.length === 0) {
          // Remove all existing items
          for (const k of currentKeys) {
            removeItem(k);
          }

          currentKeys = [];

          if (fallback) {
            const fallbackEntry = createItem(
              null,
              0,
              () => toHtmlResult(fallback()),
              globalIdFactory,
              parent,
              endMarker,
              (fn) => keyedItems.get(FALLBACK_KEY)?.cleanups.push(fn),
            );

            keyedItems.set(FALLBACK_KEY, fallbackEntry);
            currentKeys = [FALLBACK_KEY];
          }

          return;
        }

        // Remove fallback if present
        if (keyedItems.has(FALLBACK_KEY)) {
          removeItem(FALLBACK_KEY);
          currentKeys = currentKeys.filter((k) => k !== FALLBACK_KEY);
        }

        // Validate and collect new keys
        const newKeys: (string | number)[] = [];
        const seenKeys = new Set<string | number>();

        for (let i = 0; i < newItems.length; i++) {
          const k = key(newItems[i], i);

          if (seenKeys.has(k)) {
            throw new Error(CRAFTIT_ERRORS.eachDuplicateKey(String(k), i));
          }

          seenKeys.add(k);
          newKeys.push(k);
        }

        // Remove items no longer in the list
        for (const k of currentKeys) {
          if (!seenKeys.has(k)) {
            removeItem(k);
          }
        }

        // Create or update items
        for (let i = 0; i < newItems.length; i++) {
          const k = newKeys[i];

          if (keyedItems.has(k)) {
            // Re-render existing item and replace DOM
            const existing = keyedItems.get(k)!;
            const raw = render(newItems[i], i);
            const rekeyed = rekeyHtmlResult(
              isHtmlResult(raw) ? raw : htmlResult(escapeHtml(String(raw))),
              globalIdFactory,
            );

            // Insert a placeholder to mark insertion position before removing old nodes
            const placeholder = document.createComment('');

            parent.insertBefore(placeholder, existing.nodes[0]);

            // Remove old item
            runAll(existing.cleanups);
            removeNodes(existing.nodes);
            keyedItems.delete(k);

            // Create new item nodes at the placeholder position
            const fragment = parseHTML(rekeyed.html);
            const itemNodes = Array.from(fragment.childNodes);
            const cleanups: (() => void)[] = [];
            const registerItemCleanup: RegisterCleanup = (fn) => cleanups.push(fn);

            for (const node of itemNodes) {
              parent.insertBefore(node, placeholder);
            }

            placeholder.remove();

            if (rekeyed.bindings.length > 0) {
              const deferredHtmlBindings: HtmlBinding[] = [];

              applyBindingsWithTargets(rekeyed.bindings, registerItemCleanup, indexBindingTargets(itemNodes), {
                onHtml: (b) => deferredHtmlBindings.push(b),
              });

              for (const b of deferredHtmlBindings) {
                applyHtmlBinding(parent as unknown as Node, b, registerItemCleanup);
              }
            }

            keyedItems.set(k, { cleanups, nodes: itemNodes });
          } else {
            const cleanups: (() => void)[] = [];
            const registerItemCleanup: RegisterCleanup = (fn) => cleanups.push(fn);

            const raw = render(newItems[i], i);
            const rekeyed = rekeyHtmlResult(
              isHtmlResult(raw) ? raw : htmlResult(escapeHtml(String(raw))),
              globalIdFactory,
            );

            const fragment = parseHTML(rekeyed.html);
            const itemNodes = Array.from(fragment.childNodes);

            for (const node of itemNodes) {
              parent.insertBefore(node, endMarker);
            }

            if (rekeyed.bindings.length > 0) {
              const deferredHtmlBindings: HtmlBinding[] = [];

              applyBindingsWithTargets(rekeyed.bindings, registerItemCleanup, indexBindingTargets(itemNodes), {
                onHtml: (b) => deferredHtmlBindings.push(b),
              });

              for (const b of deferredHtmlBindings) {
                applyHtmlBinding(parent as unknown as Node, b, registerItemCleanup);
              }
            }

            keyedItems.set(k, { cleanups, nodes: itemNodes });
          }
        }

        // Reorder: walk newKeys in order, move nodes if they are out of place
        let refNode: Node = endMarker;

        for (let i = newKeys.length - 1; i >= 0; i--) {
          const entry = keyedItems.get(newKeys[i])!;
          const lastNode = entry.nodes[entry.nodes.length - 1];

          if (lastNode.nextSibling !== refNode) {
            // Move all nodes of this item immediately before refNode
            for (let j = entry.nodes.length - 1; j >= 0; j--) {
              parent.insertBefore(entry.nodes[j], refNode);
            }
          }

          refNode = entry.nodes[0];
        }

        currentKeys = newKeys;
      });
    };

    const stop = rawEffect(() => {
      const items = normalized.value;

      untrack(() => update(items));
    });

    registerCleanup(stop);
    registerCleanup(() => {
      for (const k of currentKeys) {
        removeItem(k);
      }

      endMarker.remove();
    });
  });
}
