import { computed, effect as rawEffect, isReactive, type Readable, type Signal } from '@vielzeug/ripple';

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
  if (typeof value === 'function') {
    const c = computed(value);

    return createDirectiveResult((anchor, registerCleanup) => {
      registerCleanup(() => c.dispose());
      unsafeHtml(c).mount(anchor, registerCleanup);
    });
  }

  return createDirectiveResult((anchor, registerCleanup) => {
    const parent = anchor.parentNode;

    invariant(parent, 'unsafeHtml() anchor comment has no parent node');

    const endMarker = document.createComment('unsafe-html/end');

    parent.insertBefore(endMarker, anchor.nextSibling);

    if (isReactive(value)) {
      const slot = createReplaceableSlot();
      const src = value as Readable<string>;

      const stop = rawEffect(() => {
        slot.clear();
        slot.setNodes(parseHtml(src.value, parent, endMarker));
      });

      registerCleanup(() => stop.dispose());
      registerCleanup(() => {
        slot.clear();
        endMarker.remove();
      });
    } else {
      parseHtml(value, parent, endMarker);

      registerCleanup(() => endMarker.remove());
    }
  });
}
