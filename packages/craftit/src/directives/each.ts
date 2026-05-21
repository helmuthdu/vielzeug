import {
  batch,
  computed,
  effect as _effect,
  isSignal,
  untrack,
  type CleanupFn,
  type ReadonlySignal,
} from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from '../errors';
import {
  createDirectiveResult,
  createMarkerIdFactory,
  escapeHtml,
  extractResult,
  htmlResult,
  isHtmlResult,
  removeNodes,
  rekeyHtmlResult,
  runAll,
  type Binding,
  type DirectiveResult,
  type HTMLResult,
} from '../internal';
import { applyBindingsWithTargets, indexBindingTargets, parseHTML, type RegisterCleanup } from '../template-bindings';
import { applyHtmlBinding } from '../template-bindings';

const toResultEntry = (value: string | HTMLResult, getNextId: () => string): { bindings: Binding[]; html: string } =>
  isHtmlResult(value) ? rekeyHtmlResult(value, getNextId) : { bindings: [], html: escapeHtml(value) };

const toHtmlResult = (value: string | HTMLResult): HTMLResult =>
  isHtmlResult(value) ? value : htmlResult(escapeHtml(value));

/** Render loop used by the reactive path (keys + rendered metadata required for reconciliation). */
function renderKeyed<T>(
  items: T[],
  template: (item: T, index: number) => string | HTMLResult,
  keyFn: (item: T, index: number) => string | number,
): {
  bindings: Binding[];
  html: string;
  keys: (string | number)[];
  rendered: Array<{ bindings: Binding[]; html: string }>;
} {
  let html = '';
  const allBindings: Binding[] = [];
  const keys: (string | number)[] = [];
  const seenKeys = new Set<string | number>();
  const rendered: Array<{ bindings: Binding[]; html: string }> = [];
  const getNextId = createMarkerIdFactory();

  for (let i = 0; i < items.length; i++) {
    const nextKey = keyFn(items[i], i);

    if (seenKeys.has(nextKey)) {
      throw new Error(CRAFTIT_ERRORS.eachDuplicateKey(String(nextKey), i));
    }

    seenKeys.add(nextKey);
    keys.push(nextKey);

    const entry = toResultEntry(template(items[i], i), getNextId);

    html += entry.html;
    allBindings.push(...entry.bindings);
    rendered.push(entry);
  }

  return { bindings: allBindings, html, keys, rendered };
}

/** Signal, getter function, or plain array. */
type MaybeReactiveArray<T> = ReadonlySignal<T[]> | (() => T[]) | T[];

/**
 * Renders a list with keyed DOM reconciliation for reactive sources.
 * Use inside `html` tagged templates.
 *
 * **Note:** `each()` returns a `DirectiveResult` — a mountable directive that manages its own
 * DOM anchor. This is architecturally different from `when()` and `memo()`, which return
 * `ReadonlySignal` values. The distinction exists because keyed reconciliation requires
 * anchor-based in-place DOM patching to preserve element identity, focus, and scroll
 * state across list updates.
 *
 * Accepts a signal, getter function, or plain array as the source.
 * For dynamic lists with click handlers, prefer event delegation on a parent node
 * (`@click` + `closest(...)`) over per-item handlers inside `each()`.
 *
 * @param source - Signal, getter function, or plain array of items.
 * @param key    - Returns a stable unique key for each item.
 * @param render - Returns the HTML template for each item.
 * @param fallback - Optional: rendered when the list is empty.
 *
 * @example
 * ```ts
 * import { each } from '@vielzeug/craftit';
 *
 * // Signal source:
 * html`${each(items, (item) => item.id, (item) => html`<li>${item.name}</li>`)}`
 *
 * // Getter source:
 * html`${each(() => items.value.filter(i => i.active), (i) => i.id, (i) => html`<li>${i.name}</li>`)}`
 *
 * // With fallback:
 * html`${each(items,
 *   (item) => item.id,
 *   (item) => html`<li>${item.name}</li>`,
 *   () => html`<p>No items</p>`,
 * )}`
 * ```
 */
export function each<T>(
  source: MaybeReactiveArray<T>,
  key: (item: T, index: number) => string | number,
  render: (item: T, index: number) => string | HTMLResult,
  fallback?: () => string | HTMLResult,
): DirectiveResult {
  // Normalize to a ReadonlySignal regardless of input shape.
  const normalized: ReadonlySignal<T[]> = Array.isArray(source)
    ? ({
        get value() {
          return source as T[];
        },
      } as ReadonlySignal<T[]>)
    : isSignal(source)
      ? source
      : computed(source as () => T[]);

  const mount = (anchor: Comment, registerCleanup: RegisterCleanup): void => {
    type KeyedNode = {
      cleanups: CleanupFn[];
      html: string;
      nodes: Node[];
    };

    let keyedNodes = new Map<string | number, KeyedNode>();
    let fallbackNodes: Node[] = [];
    let fallbackCleanups: CleanupFn[] = [];

    const clearFallback = (): void => {
      removeNodes(fallbackNodes);
      fallbackNodes = [];
      runAll(fallbackCleanups);
      fallbackCleanups = [];
    };

    const clearKeyed = (): void => {
      for (const [, node] of keyedNodes) {
        removeNodes(node.nodes);
        runAll(node.cleanups);
      }

      keyedNodes.clear();
    };

    const stop = _effect(() => {
      const parent = anchor.parentNode;

      if (!parent) return;

      batch(() => {
        const raw = normalized.value;

        if (!raw.length) {
          clearKeyed();
          clearFallback();

          if (!fallback) return;

          const fallbackResult = extractResult(toHtmlResult(fallback()));
          const parsed = parseHTML(fallbackResult.html);

          fallbackNodes = Array.from(parsed.childNodes);
          anchor.after(parsed);

          const addFallbackCleanup: RegisterCleanup = (fn) => fallbackCleanups.push(fn);

          applyBindingsWithTargets(fallbackResult.bindings, addFallbackCleanup, indexBindingTargets(fallbackNodes), {
            onHtml: (binding) => applyHtmlBinding(parent as unknown as Node, binding, addFallbackCleanup),
          });

          return;
        }

        clearFallback();

        const { keys, rendered } = renderKeyed(raw, render, key);
        const nextKeyed = new Map<string | number, KeyedNode>();
        const ordered: Array<{ item: { bindings: Binding[]; html: string }; key: string | number; nodes: Node[] }> = [];

        for (let i = 0; i < keys.length; i++) {
          const nextKey = keys[i];
          const item = rendered[i];
          const existing = keyedNodes.get(nextKey);
          let nodes: Node[];
          const cleanups: CleanupFn[] = [];

          // R4 fix: always re-apply bindings even when HTML is equal.
          // Reusing nodes (skip innerHTML re-parse) only when HTML is identical,
          // but bindings are always re-applied so reactive handlers stay fresh.
          if (existing && existing.html === item.html) {
            nodes = existing.nodes;
            runAll(existing.cleanups);
          } else {
            if (existing) {
              removeNodes(existing.nodes);
              runAll(existing.cleanups);
            }

            const parsed = parseHTML(item.html);

            nodes = Array.from(parsed.childNodes);
          }

          ordered.push({ item, key: nextKey, nodes });
          nextKeyed.set(nextKey, { cleanups, html: item.html, nodes });
        }

        for (const [oldKey, oldNode] of keyedNodes) {
          if (!nextKeyed.has(oldKey)) {
            removeNodes(oldNode.nodes);
            runAll(oldNode.cleanups);
          }
        }

        let cursor: Node = anchor;

        for (const entry of ordered) {
          for (const node of entry.nodes) {
            parent.insertBefore(node, cursor.nextSibling);
            cursor = node;
          }

          const targetNode = nextKeyed.get(entry.key);

          if (!targetNode) continue;

          const addItemCleanup: RegisterCleanup = (fn) => targetNode.cleanups.push(fn);

          untrack(() => {
            applyBindingsWithTargets(entry.item.bindings, addItemCleanup, indexBindingTargets(entry.nodes), {
              onHtml: (binding) => applyHtmlBinding(parent as unknown as Node, binding, addItemCleanup),
            });
          });
        }

        keyedNodes = nextKeyed;
      });
    });

    registerCleanup(stop);
    registerCleanup(() => {
      clearFallback();
      clearKeyed();
    });
  };

  return createDirectiveResult(mount);
}
