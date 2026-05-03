import { batch, untrack, effect as _effect, type CleanupFn } from '@vielzeug/stateit';

import { removeNodes, runAll, type HtmlBinding } from './internal';
import { applyBindingsInContainer, findCommentMarker, parseHTML, type RegisterCleanup } from './template-bindings';

/**
 * Sets up the reactive effect for an html-binding marker using full fragment replacement.
 *
 * @param root         The root node containing the marker comment.
 * @param b            The HtmlBinding descriptor.
 * @param registerCleanup  Function that registers a cleanup tied to the outer container's lifetime.
 */
export const applyHtmlBinding = (root: Node, b: HtmlBinding, registerCleanup: RegisterCleanup): void => {
  const found = findCommentMarker(root, b.uid);

  if (!found) return;

  const marker = document.createComment('html-binding');

  found.replaceWith(marker);

  let currentCleanups: CleanupFn[] = [];
  const registerInnerCleanup: RegisterCleanup = (fn) => currentCleanups.push(fn);
  const runCurrentCleanups = () => {
    runAll(currentCleanups);
    currentCleanups = [];
  };
  let lastHtml: string | null = null;
  let lastInsertedNodes: Node[] = [];

  // Use stateit.effect directly so cleanup is managed manually via registerCleanup, not autoCleanup.
  const stop = _effect(() => {
    batch(() => {
      const data = b.signal.value;

      if (data.html === lastHtml) {
        return;
      }

      lastHtml = data.html;

      runCurrentCleanups();

      const { bindings, html } = data;
      const container = (marker.parentElement || root) as ParentNode;

      untrack(() => {
        batch(() => {
          removeNodes(lastInsertedNodes);

          const parsed = parseHTML(html);

          lastInsertedNodes = Array.from(parsed.childNodes);
          marker.after(parsed);
        });

        applyBindingsInContainer(container, bindings, registerInnerCleanup, {
          onHtml: (binding) => applyHtmlBinding(container, binding, registerInnerCleanup),
        });
      });
    });
  });

  registerCleanup(stop);
  registerCleanup(runCurrentCleanups);
};
