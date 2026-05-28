/**
 * Unique ID generation and marker utilities for template binding.
 */

import type { Binding } from '../types/bindings';

let _idCounter = 0;

export const _resetIdCounter = (): void => {
  _idCounter = 0;
};

export const createId = (prefix?: string): string => `${prefix ? `${prefix}-` : 'cft-'}${++_idCounter}`;

/** Attribute name used to mark elements with their binding UID in compiled templates. */
export const CF_ID_ATTR = 'u';

const ATTR_ID_RE = new RegExp(`${CF_ID_ATTR}="([^"]+)"`, 'g');

export const createMarkerIdFactory = (): (() => string) => {
  let n = 0;

  return () => String(n++);
};

export const rekeyHtmlResult = (
  result: { bindings: Binding[]; html: string },
  getNextId: () => string,
): { bindings: Binding[]; html: string } => {
  const idMap = new Map<string, string>();
  const getMappedId = (id: string): string => {
    const mapped = idMap.get(id);

    if (mapped) return mapped;

    const next = getNextId();

    idMap.set(id, next);

    return next;
  };

  return {
    bindings: result.bindings.map((binding) => ({ ...binding, uid: getMappedId(binding.uid) }) as Binding),
    html: result.html
      .replace(ATTR_ID_RE, (_, id: string) => `${CF_ID_ATTR}="${getMappedId(id)}"`)
      .replace(/<!--(\d+)-->/g, (_, id: string) => `<!--${getMappedId(id)}-->`),
  };
};
