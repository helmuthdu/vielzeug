import { computed, effect as rawEffect, isSignal, type Readable, type Signal } from '@vielzeug/ripple';

import { warn } from '../_warn';
import { createDirectiveResult, type DirectiveResult } from '../types/bindings';
import { removeNodes } from '../utils/dom';

type RawSanitizer = (html: string) => string;

let _sanitizer: RawSanitizer | null = null;
let _warned = false;

export const setRawSanitizer = (fn: RawSanitizer | null): void => {
  _sanitizer = fn;

  if (!fn) _warned = false;
};

/** @internal */
export const _resetRawSanitizer = (): void => {
  _sanitizer = null;
  _warned = false;
};

const sanitize = (value: string): string => {
  if (_sanitizer) return _sanitizer(value);

  if (value && !_warned) {
    _warned = true;
    warn(
      'raw() was called without a sanitizer registered. ' +
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
 * Supports static strings, signals, and getter functions `() => string`.
 * When reactive, the DOM is updated in-place whenever the value changes.
 */
export function raw(value: (() => string) | string | Signal<string> | Readable<string>): DirectiveResult {
  if (typeof value === 'function') {
    const c = computed(value);

    return createDirectiveResult((anchor, registerCleanup) => {
      registerCleanup(() => c.dispose());
      raw(c).mount(anchor, registerCleanup);
    });
  }

  return createDirectiveResult((anchor, registerCleanup) => {
    const parent = anchor.parentNode!;
    const endMarker = document.createComment('raw/end');

    parent.insertBefore(endMarker, anchor.nextSibling);

    if (isSignal(value)) {
      let currentNodes: Node[] = [];
      const src = value as Readable<string>;

      const stop = rawEffect(() => {
        removeNodes(currentNodes);
        currentNodes = parseRaw(sanitize(src.value), parent, endMarker);
      });

      registerCleanup(() => stop.dispose());
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
