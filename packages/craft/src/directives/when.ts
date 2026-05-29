import { computed, effect as rawEffect, isSignal, untrack, type ReadonlySignal } from '@vielzeug/ripple';

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

type MaybeReactive<T> = T | (() => T) | ReadonlySignal<T>;

type WhenRenderable = string | HTMLResult;

const resolve = <T>(value: MaybeReactive<T>): T => {
  if (typeof value === 'function') return (value as () => T)();

  if (isSignal(value)) return value.value;

  return value;
};

const toHtmlResult = (value: WhenRenderable): HTMLResult =>
  isHtmlResult(value) ? value : htmlResult(escapeHtml(String(value)));

const mountBranch = (
  result: HTMLResult,
  parent: ParentNode,
  insertBefore: Node,
  registerCleanup: RegisterCleanup,
): Node[] => {
  const rekeyed = rekeyHtmlResult(result, createMarkerIdFactory());
  const fragment = parseHTML(rekeyed.html);
  const nodes = Array.from(fragment.childNodes);

  for (const node of nodes) parent.insertBefore(node, insertBefore);

  if (rekeyed.bindings.length > 0) {
    const deferred: HtmlBinding[] = [];
    const targets = indexBindingTargets(nodes);

    applyBindingsWithTargets(rekeyed.bindings, registerCleanup, targets, {
      onHtml: (b) => deferred.push(b),
    });

    for (const b of deferred) {
      const comment = targets.comments.get(b.uid);
      const searchRoot = (comment?.parentElement ?? parent) as Node;

      applyHtmlBinding(searchRoot, b, registerCleanup);
    }
  }

  return nodes;
};

/**
 * Conditionally renders one of two branches as a `DirectiveResult`.
 *
 * The condition may be a boolean, signal, or getter function.
 * When the condition changes, the current branch is cleaned up and
 * the new branch is mounted in its place.
 *
 * @example
 * ```ts
 * html`${when(isLoggedIn, () => html`<p>Welcome</p>`, () => html`<p>Log in</p>`)}`
 * ```
 */
export function when(
  condition: MaybeReactive<boolean>,
  truthy: () => WhenRenderable,
  falsy?: () => WhenRenderable,
): DirectiveResult {
  const conditionSignal =
    typeof condition === 'function'
      ? computed(condition as () => boolean)
      : isSignal(condition)
        ? condition
        : ({
            get value() {
              return condition as boolean;
            },
          } as ReadonlySignal<boolean>);

  return createDirectiveResult((anchor, registerCleanup) => {
    const parent = anchor.parentNode!;
    const endMarker = document.createComment('when/end');

    parent.insertBefore(endMarker, anchor.nextSibling);

    let currentNodes: Node[] = [];
    let currentCleanups: (() => void)[] = [];

    const stop = rawEffect(() => {
      const next = conditionSignal.value;

      runAll(currentCleanups);
      removeNodes(currentNodes);
      currentCleanups = [];
      currentNodes = [];

      const branch = next ? truthy() : falsy ? falsy() : null;

      if (branch == null) return;

      const branchCleanups: (() => void)[] = [];

      currentNodes = untrack(() =>
        mountBranch(toHtmlResult(branch), parent, endMarker, (fn) => branchCleanups.push(fn)),
      );
      currentCleanups = branchCleanups;
    });

    registerCleanup(stop);
    registerCleanup(() => {
      runAll(currentCleanups);
      removeNodes(currentNodes);
      endMarker.remove();
    });
  });
}
