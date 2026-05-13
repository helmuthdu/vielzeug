import { batch, effect as _effect, untrack, type CleanupFn, type ReadonlySignal } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from '../errors';
import {
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

export interface EachOptions<T> {
  fallback?: () => string | HTMLResult;
  key: (item: T, index: number) => string | number;
  render: (item: T, index: number) => string | HTMLResult;
}

/**
 * Renders a list with keyed DOM reconciliation for reactive sources.
 * Use inside `html` tagged templates.
 *
 * `each()` expects a reactive signal source and a stable `key` function.
 *
 * For dynamic lists with click handlers, prefer event delegation on a parent node
 * (`@click` + `closest(...)`) over per-item handlers inside `each()`.
 *
 * @example
 * import { each } from '@vielzeug/craftit';
 *
 * // Reactive source (key required):
 * html`${each(items, { key: item => item.id, render: (item) => html`<li>${item.name}</li>` })}`
 *
 * // Full example:
 * html`${each(items, {
 *   fallback: () => html`<p>No items</p>`,
 *   key: item => item.id,
 *   render: (item) => html`<li>${item.name}</li>`,
 * })}`
 */
export function each<T>(source: ReadonlySignal<T[]>, options: EachOptions<T>): DirectiveResult;
export function each<T>(source: ReadonlySignal<T[]>, options: EachOptions<T>): DirectiveResult {
  const { fallback, key, render: renderItem } = options;

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
        const raw = source.value;

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

        const { keys, rendered } = renderKeyed(raw, renderItem, key);
        const nextKeyed = new Map<string | number, KeyedNode>();
        const ordered: Array<{ item: { bindings: Binding[]; html: string }; key: string | number; nodes: Node[] }> = [];

        for (let i = 0; i < keys.length; i++) {
          const nextKey = keys[i];
          const item = rendered[i];
          const existing = keyedNodes.get(nextKey);
          let nodes: Node[];
          const cleanups: CleanupFn[] = [];

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

  return { __craftitDirective: true, mount };
}
