import { BaseElement } from './base-element';
import type { ComponentDefinition } from './component-types';
import { ORE_ERRORS, OreApiError } from './errors';
import { normalizePropDefinition, type PropInputDefs, type PropsDef, validatePropDefs } from './props';
import { toKebab } from './utils/dom';

/**
 * Create and register a web component.
 *
 * The `setup` function runs for each connection and returns an `HTMLResult`.
 * Disconnecting disposes its state; reconnecting rebuilds it. All reactive
 * behaviour within a connection is expressed through directives inside the
 * template: not by re-evaluating setup itself.
 *
 * Everything besides `props`: lifecycle hooks, host bindings, context, slots,
 * emit: is a free function imported from `@vielzeug/ore` and called directly
 * from inside `setup()` (or from a composable it calls):
 *
 * ```ts
 * import { define, html, prop, onMounted, useEmit, useSlots } from '@vielzeug/ore';
 *
 * define<{ count?: number }>('my-counter', {
 *   props: { count: prop.number(0) },
 *   setup(props) {
 *     const emit = useEmit<{ increment: number }>();
 *     const slots = useSlots<'header' | 'footer'>();
 *
 *     onMounted(() => console.log('mounted'));
 *
 *     return html`<button @click=${() => emit('increment', props.count.value + 1)}>${props.count}</button>`;
 *   },
 * });
 * ```
 *
 * Returns the registered class, so callers keep a handle for `instanceof` or
 * subclassing without a follow-up `customElements.get(tag)` cast.
 */
export function define<Props extends Record<string, unknown> = Record<never, never>>(
  tag: string,
  definition: ComponentDefinition<Props>,
): CustomElementConstructor {
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

  const ComponentClass = class extends BaseElement {
    static override _definition = definition as unknown as ComponentDefinition;
    static override _normalizedPropDefs = normalizedPropDefs as PropsDef<Record<never, never>> | undefined;
    static override formAssociated = definition.formAssociated ?? false;
    static override observedAttributes = observedAttrs;
  };

  // Prop validation and class construction above are side-effect-free; registration
  // is intentionally the last, and only global side effect of define().
  Object.defineProperty(ComponentClass, 'name', { value: tag });
  customElements.define(tag, ComponentClass);

  return ComponentClass;
}
