import { computed, isReactive, onCleanup, type Readable, effect as rawEffect, untrack } from '@vielzeug/ripple';

import { invariant } from '../errors';
import { createDirectiveResult, type DirectiveResult, type HTMLResult, isHtmlResult } from '../template/result';
import { createReplaceableSlot, type MaybeReactive, removeNodes } from '../utils/dom';

type WhenRenderable = HTMLResult | null | undefined | false;

const NO_PARENT_MSG = 'when() anchor comment has no parent node';

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
    return createDirectiveResult((anchor) => {
      const branch = condition ? truthy() : falsy ? falsy() : null;

      if (!branch || !isHtmlResult(branch)) return;

      const parent = anchor.parentNode;

      invariant(parent, NO_PARENT_MSG);

      const nodes = branch.mount(parent, anchor);

      onCleanup(() => removeNodes(nodes));
    });
  }

  return createDirectiveResult((anchor) => {
    const ownedComputed = typeof condition === 'function' ? computed(condition as () => boolean) : null;
    const conditionSignal = ownedComputed ?? (condition as Readable<boolean>);

    const initialParent = anchor.parentNode;

    invariant(initialParent, NO_PARENT_MSG);

    const endMarker = document.createComment('when/end');

    initialParent.insertBefore(endMarker, anchor.nextSibling);

    const slot = createReplaceableSlot();

    const sub = rawEffect(() => {
      const next = conditionSignal.value;
      const branch = next ? truthy() : falsy ? falsy() : null;

      if (!branch || !isHtmlResult(branch)) {
        slot.clear();

        return;
      }

      // Resolved live: when a `when()` sits inside an each() item, a list
      // reorder moves the whole range (endMarker included) before this effect
      // next runs; the captured mount-time parent would be stale.
      const parent = endMarker.parentNode;

      if (!parent) {
        slot.clear();

        return;
      }

      untrack(() => {
        slot.render(() => {
          slot.setNodes(branch.mount(parent, endMarker));
        });
      });
    });

    onCleanup(() => {
      sub.dispose();
      slot.clear();
      endMarker.remove();
    });
  });
}
