import { computed, effect as rawEffect, isSignal, type ReadonlySignal, signal, untrack } from '@vielzeug/ripple';

import type { RegisterCleanup } from '../template-bindings';

import { createDirectiveResult, type DirectiveResult, type HTMLResult, isHtmlResult } from '../types/bindings';
import { removeNodes, runAll } from '../utils/dom';

type MaybeReactive<T> = T | (() => T) | ReadonlySignal<T>;

type WhenRenderable = HTMLResult | null | undefined | false;

const mountBranch = (
  result: HTMLResult,
  parent: ParentNode,
  insertBefore: Node,
  registerCleanup: RegisterCleanup,
): Node[] => {
  const nodes = Array.from(result.fragment.childNodes);

  parent.insertBefore(result.fragment, insertBefore);
  result.apply(registerCleanup);

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
        : signal(condition as boolean);

  return createDirectiveResult((anchor, registerCleanup) => {
    const parent = anchor.parentNode!;
    const endMarker = document.createComment('when/end');

    parent.insertBefore(endMarker, anchor.nextSibling);

    let currentNodes: Node[] = [];
    let currentCleanups: (() => void)[] = [];

    const sub = rawEffect(() => {
      const next = conditionSignal.value;

      runAll(currentCleanups);
      removeNodes(currentNodes);
      currentCleanups = [];
      currentNodes = [];

      const branch = next ? truthy() : falsy ? falsy() : null;

      if (!branch || !isHtmlResult(branch)) return;

      const branchCleanups: (() => void)[] = [];

      currentNodes = untrack(() => mountBranch(branch, parent, endMarker, (fn) => branchCleanups.push(fn)));
      currentCleanups = branchCleanups;
    });

    registerCleanup(() => sub.dispose());
    registerCleanup(() => {
      runAll(currentCleanups);
      removeNodes(currentNodes);
      endMarker.remove();
    });
  });
}
