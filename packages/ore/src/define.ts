import type { ComponentDefinition } from './component-types';

import { BaseElement } from './base-element';
import { OreApiError, ORE_ERRORS } from './errors';
import {
  type InferProps,
  normalizePropDefinition,
  prop,
  type PropDef,
  type PropInputDefs,
  type PropsDef,
  validatePropDefs,
} from './props';
import { toKebab } from './utils/dom';

export { prop };
export type { InferProps, PropDef, PropInputDefs, PropsDef };
export type { HostBindFn } from './host-bind';

/**
 * Define and register a web component.
 *
 * The `setup` function runs once per instance on first connect and returns an
 * `HTMLResult`. All reactive behaviour is expressed through reactive directives
 * inside the template — not by re-evaluating setup itself.
 *
 * Pass a `SlotNames` type parameter to get typed `ctx.slots` access:
 * ```ts
 * define<Record<never, never>, Record<never, never>, 'header' | 'footer'>('my-card', {
 *   setup(_props, { slots }) {
 *     const hasHeader = slots.has('header'); // typed ✓
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * define('my-counter', {
 *   props: { count: prop.number(0) },
 *   setup(props) {
 *     return html`<button @click=${() => props.count.value++}>${props.count}</button>`;
 *   },
 * });
 * ```
 */
export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  const SlotNames extends string = string,
>(tag: string, definition: ComponentDefinition<Props, Emits, SlotNames>): void {
  if (!tag) throw new OreApiError(ORE_ERRORS.defineRequiresTag);

  if (customElements.get(tag)) throw new OreApiError(ORE_ERRORS.defineDuplicate(tag));

  const { props: propDefs } = definition;

  const normalizedPropDefs: PropsDef<Props> | undefined = (() => {
    if (!propDefs) return undefined;

    const errors = validatePropDefs(propDefs as Record<string, unknown>);

    if (errors.length > 0) throw new OreApiError(ORE_ERRORS.validationFailed(tag, errors));

    const normalized: PropInputDefs = {};

    for (const [key, def] of Object.entries(propDefs)) {
      normalized[key] = normalizePropDefinition(def, key);
    }

    return normalized as PropsDef<Props>;
  })();

  const observedAttrs = normalizedPropDefs ? Object.keys(normalizedPropDefs).map(toKebab) : [];

  // Named class for DevTools and error messages
  const ComponentClass = class extends BaseElement {
    static override _definition = definition as ComponentDefinition<any, any, any>;
    static override _normalizedPropDefs = normalizedPropDefs as PropsDef<Record<never, never>> | undefined;
    static override formAssociated = definition.formAssociated ?? false;
    static override observedAttributes = observedAttrs;
  };

  Object.defineProperty(ComponentClass, 'name', { value: tag });
  customElements.define(tag, ComponentClass);
}
