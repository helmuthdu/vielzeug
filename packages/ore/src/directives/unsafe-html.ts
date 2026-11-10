import { computed, isReactive, type Readable, effect as rawEffect, type Signal } from '@vielzeug/ripple';

import { invariant } from '../errors';
import { createDirectiveResult, type DirectiveResult } from '../template/result';
import { createReplaceableSlot } from '../utils/dom';

const parseHtml = (html: string, parent: ParentNode, insertBefore: Node): Node[] => {
  const tpl = document.createElement('template');

  tpl.innerHTML = html;

  const nodes = Array.from(tpl.content.cloneNode(true).childNodes);

  for (const node of nodes) parent.insertBefore(node, insertBefore);

  return nodes;
};

/**
 * Renders HTML without escaping as a DirectiveResult.
 *
 * This is intentionally named `unsafeHtml`: sanitization is an application
 * boundary, not mutable process-wide framework configuration. Sanitize
 * untrusted content before passing it here.
 *
 * Supports static strings, signals, and getter functions `() => string`.
 * When reactive, the DOM is updated in-place whenever the value changes.
 */
export function unsafeHtml(value: (() => string) | string | Signal<string> | Readable<string>): DirectiveResult {
  const isFn = typeof value === 'function';
  const src: Readable<string> | null = isFn ? computed(value as () => string) : isReactive(value) ? value : null;

  return createDirectiveResult((anchor, registerCleanup) => {
    const initialParent = anchor.parentNode;

    invariant(initialParent, 'unsafeHtml() anchor comment has no parent node');

    const endMarker = document.createComment('unsafe-html/end');

    initialParent.insertBefore(endMarker, anchor.nextSibling);

    if (src) {
      const slot = createReplaceableSlot();

      const stop = rawEffect(() => {
        slot.clear();

        // Resolved live: an unsafeHtml() inside an each() item moves with the
        // item's range; the mount-time parent would be stale after a reorder.
        const parent = endMarker.parentNode;

        if (!parent) return;

        slot.setNodes(parseHtml(src.value, parent, endMarker));
      });

      registerCleanup(() => stop.dispose());
      registerCleanup(() => {
        slot.clear();
        endMarker.remove();
      });
    } else {
      parseHtml(value as string, initialParent, endMarker);

      registerCleanup(() => endMarker.remove());
    }
  });
}
