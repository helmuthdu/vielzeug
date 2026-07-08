import { computed, effect as rawEffect, isReactive, type Readable, untrack } from '@vielzeug/ripple';

import type { RegisterCleanup } from '../template';

import { invariant } from '../errors';
import { createDirectiveResult, type DirectiveResult, type HTMLResult, isHtmlResult } from '../types/bindings';
import { removeNodes, runAll } from '../utils/dom';

type MaybeReactive<T> = T | (() => T) | Readable<T>;

type WhenRenderable = HTMLResult | null | undefined | false;

const NO_PARENT_MSG = 'when() anchor comment has no parent node';

const mountBranch = (
  result: HTMLResult,
  parent: ParentNode,
  insertBefore: Node,
  registerCleanup: RegisterCleanup,
): Node[] => result.mount(parent, insertBefore, registerCleanup);

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
  if (typeof condition !== 'function' && !isReactive(condition)) {
    return createDirectiveResult((anchor, registerCleanup) => {
      const branch = condition ? truthy() : falsy ? falsy() : null;

      if (!branch || !isHtmlResult(branch)) return;

      const parent = anchor.parentNode;

      invariant(parent, NO_PARENT_MSG);

      const nodes = mountBranch(branch, parent, anchor, registerCleanup);

      registerCleanup(() => removeNodes(nodes));
    });
  }

  return createDirectiveResult((anchor, registerCleanup) => {
    const ownedComputed = typeof condition === 'function' ? computed(condition as () => boolean) : null;
    const conditionSignal = ownedComputed ?? (condition as Readable<boolean>);

    if (ownedComputed) registerCleanup(() => ownedComputed.dispose());

    const parent = anchor.parentNode;

    invariant(parent, NO_PARENT_MSG);

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
