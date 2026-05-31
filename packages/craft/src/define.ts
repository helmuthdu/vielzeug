import type { ComponentDefinition } from './component-types';

import { BaseElement } from './base-element';
import { CRAFTIT_ERRORS } from './errors';
import {
  type InferPropsFromDefs,
  type InferPropsSignals,
  normalizePropDefinition,
  prop,
  type PropDef,
  type PropInputDefs,
  type PropsDef,
  validatePropDefs,
} from './props';
import { toKebab } from './utils/dom';

export { prop };
export type { InferPropsFromDefs, InferPropsSignals, PropDef, PropInputDefs, PropsDef };
export type { HostBindFn } from './host-bind';

const defineComponent = <
  Props extends Record<string, unknown>,
  Emits extends Record<string, unknown>,
  SlotNames extends string,
>(
  tag: string,
  definition: ComponentDefinition<Props, Emits, SlotNames>,
  normalizedPropDefs: PropsDef<Props> | undefined,
  observedAttrs: string[],
): string => {
  if (!tag) throw new Error(CRAFTIT_ERRORS.defineRequiresTag);

  if (customElements.get(tag)) throw new Error(CRAFTIT_ERRORS.defineDuplicate(tag));

  // Named class for DevTools and error messages
  const ComponentClass = class extends BaseElement {
    static override _definition = definition as unknown as ComponentDefinition<
      Record<never, never>,
      Record<string, never>,
      string
    >;
    static override _normalizedPropDefs = normalizedPropDefs as PropsDef<Record<never, never>> | undefined;
    static override formAssociated = definition.formAssociated ?? false;
    static override observedAttributes = observedAttrs;
  };

  Object.defineProperty(ComponentClass, 'name', { value: tag });
  customElements.define(tag, ComponentClass);

  return tag;
};

/**
 * Define and register a web component.
 *
 * The `setup` function runs once per instance on first connect and returns an
 * `HTMLResult`. All reactive behaviour is expressed through reactive directives
 * inside the template — not by re-evaluating setup itself.
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
  SlotNames extends string = string,
>(tag: string, definition: ComponentDefinition<Props, Emits, SlotNames>): string {
  const { props: propDefs } = definition;

  const normalizedPropDefs: PropsDef<Props> | undefined = (() => {
    if (!propDefs) return undefined;

    const errors = validatePropDefs(propDefs as Record<string, unknown>);

    if (errors.length > 0) throw new Error(CRAFTIT_ERRORS.validationFailed(tag, errors));

    const normalized: PropInputDefs = {};

    for (const [key, def] of Object.entries(propDefs)) {
      normalized[key] = normalizePropDefinition(def, key);
    }

    return normalized as PropsDef<Props>;
  })();

  const observedAttrs = normalizedPropDefs ? Object.keys(normalizedPropDefs).map(toKebab) : [];

  return defineComponent(tag, definition, normalizedPropDefs, observedAttrs);
}
