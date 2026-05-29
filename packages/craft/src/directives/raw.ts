import { effect as rawEffect, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/ripple';

import { createDirectiveResult, type DirectiveResult } from '../types/bindings';
import { removeNodes } from '../utils/dom';

type RawSanitizer = (html: string) => string;

let _sanitizer: RawSanitizer | null = null;

export const setRawSanitizer = (fn: RawSanitizer | null): void => {
  _sanitizer = fn;
};

/** @internal */
export const _resetRawSanitizer = (): void => {
  _sanitizer = null;
};

const sanitize = (value: string): string => {
  if (_sanitizer) return _sanitizer(value);

  if (value) {
    console.warn(
      '[craft] raw() was called without a sanitizer registered. ' +
        'Passing user-supplied HTML directly to raw() is an XSS risk. ' +
        'Register a sanitizer with setRawSanitizer() — e.g. setRawSanitizer(DOMPURIFY.sanitize).',
    );
  }

  return value;
};

const parseRaw = (html: string, parent: ParentNode, insertBefore: Node): Node[] => {
  const tpl = document.createElement('template');

  tpl.innerHTML = html;

  const nodes = Array.from(tpl.content.cloneNode(true).childNodes);

  for (const node of nodes) parent.insertBefore(node, insertBefore);

  return nodes;
};

/**
 * Renders a trusted HTML string without escaping as a DirectiveResult.
 * Only use with content you control — passing user-supplied strings
 * directly is an XSS risk. Register a sanitizer with setRawSanitizer()
 * to add a runtime safety net.
 *
 * Supports static strings and signals.
 * When reactive, the DOM is updated in-place whenever the value changes.
 */
export function raw(value: string | Signal<string> | ReadonlySignal<string>): DirectiveResult {
  return createDirectiveResult((anchor, registerCleanup) => {
    const parent = anchor.parentNode!;
    const endMarker = document.createComment('raw/end');

    parent.insertBefore(endMarker, anchor.nextSibling);

    if (isSignal(value)) {
      let currentNodes: Node[] = [];
      const src = value as ReadonlySignal<string>;

      const stop = rawEffect(() => {
        removeNodes(currentNodes);
        currentNodes = parseRaw(sanitize(src.value), parent, endMarker);
      });

      registerCleanup(stop);
      registerCleanup(() => {
        removeNodes(currentNodes);
        endMarker.remove();
      });
    } else {
      parseRaw(sanitize(value), parent, endMarker);

      registerCleanup(() => endMarker.remove());
    }
  });
}
