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

import {
  batch,
  computed,
  effect as rawEffect,
  isSignal,
  signal,
  untrack,
  type ReadonlySignal,
  type Signal,
} from '@vielzeug/ripple';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Signal, getter function, or plain array. */
type MaybeReactiveArray<T> = ReadonlySignal<T[]> | (() => T[]) | T[];

type ItemEntry<T> = {
  cleanups: (() => void)[];
  data: Signal<T>;
  index: Signal<number>;
  nodes: Node[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toHtmlResult = (value: string | HTMLResult): HTMLResult =>
  isHtmlResult(value) ? value : htmlResult(escapeHtml(String(value)));

// ─── Keyed item lifecycle ─────────────────────────────────────────────────────

/**
 * Create a keyed item: mount its nodes and wire up bindings.
 * Returns an ItemEntry containing the reactive signals and cleanup list.
 * Cleanup runs via removeItem() — not via the outer registerCleanup.
 */
const createItem = <T>(
  item: T,
  index: number,
  render: (item: ReadonlySignal<T>, index: ReadonlySignal<number>) => string | HTMLResult,
  getNextId: () => string,
  parent: ParentNode,
  insertBefore: Node,
): ItemEntry<T> => {
  const dataSignal: Signal<T> = signal(item);
  const indexSignal: Signal<number> = signal(index);

  const raw = render(dataSignal, indexSignal);
  const rekeyed = rekeyHtmlResult(isHtmlResult(raw) ? raw : htmlResult(escapeHtml(String(raw))), getNextId);

  const fragment = parseHTML(rekeyed.html);
  const itemNodes = Array.from(fragment.childNodes);

  // Move nodes to real DOM first so DirectiveBindings get the correct parentNode
  for (const node of itemNodes) {
    parent.insertBefore(node, insertBefore);
  }

  const cleanups: (() => void)[] = [];
  const registerItemCleanup: RegisterCleanup = (fn) => cleanups.push(fn);

  if (rekeyed.bindings.length > 0) {
    const deferredHtmlBindings: HtmlBinding[] = [];
    const targets = indexBindingTargets(itemNodes);

    applyBindingsWithTargets(rekeyed.bindings, registerItemCleanup, targets, {
      onHtml: (b) => deferredHtmlBindings.push(b),
    });

    for (const b of deferredHtmlBindings) {
      // Use the comment's own parentElement as search root to avoid a UID collision:
      // the each() anchor comment in the parent has the same uid as the item's first binding.
      const comment = targets.comments.get(b.uid);
      const searchRoot = (comment?.parentElement ?? parent) as Node;

      applyHtmlBinding(searchRoot, b, registerItemCleanup);
    }
  }

  return { cleanups, data: dataSignal, index: indexSignal, nodes: itemNodes };
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
 * @param key      - Returns a stable unique key for each item.
 * @param render   - Called once per new key. Receives reactive signals so bindings
 *                   inside the template update in-place without DOM teardown.
 *                   Use `${item}` for primitive items (TextBinding), or
 *                   `${() => item.value.prop}` for object properties.
 *                   For structural changes within an item, use `when()` inside
 *                   the render function.
 * @param fallback - Optional: rendered when the list is empty.
 *
 * @example
 * ```ts
 * html`${each(
 *   items,
 *   (item) => item.id,
 *   (item) => html`<li>${item} — ${() => item.value.label}</li>`,
 * )}`
 * ```
 */
export function each<T>(
  source: MaybeReactiveArray<T>,
  key: (item: T, index: number) => string | number,
  render: (item: ReadonlySignal<T>, index: ReadonlySignal<number>) => string | HTMLResult,
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
    const keyedItems = new Map<string | number, ItemEntry<T>>();

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
            const entry = untrack(() =>
              createItem(null as unknown as T, 0, () => toHtmlResult(fallback()), globalIdFactory, parent, endMarker),
            );

            keyedItems.set(FALLBACK_KEY, entry);
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

        // Update existing or create new items
        for (let i = 0; i < newItems.length; i++) {
          const k = newKeys[i];

          if (keyedItems.has(k)) {
            // Existing key: update the reactive signals in-place.
            // Bindings inside the render template react automatically — no DOM teardown.
            const entry = keyedItems.get(k)!;

            entry.data.value = newItems[i];
            entry.index.value = i;
          } else {
            // New key: mount DOM nodes and set up bindings.
            // untrack() prevents computed() signals created inside createItem (e.g. html_signal,
            // attrSignal) from registering disposal cleanups on outerSub. Without this, outerSub's
            // teardown would dispose those computeds on re-run, breaking the reactive chain.
            const entry = untrack(() => createItem(newItems[i], i, render, globalIdFactory, parent, endMarker));

            keyedItems.set(k, entry);
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

    const stop = rawEffect(() => update(normalized.value));

    registerCleanup(stop);
    registerCleanup(() => {
      for (const k of currentKeys) {
        removeItem(k);
      }

      endMarker.remove();
      currentKeys = [];
    });
  });
}
