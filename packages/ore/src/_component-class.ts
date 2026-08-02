import type { ComponentDefinition } from './component-types';

import { BaseElement } from './base-element';
import { OreApiError, ORE_ERRORS } from './errors';
import { normalizePropDefinition, type PropInputDefs, type PropsDef, validatePropDefs } from './props';
import { toKebab } from './utils/dom';

/**
 * Builds the element class without touching the browser registry. Keeping
 * declaration work separate from registration makes the latter the only
 * irreversible global side effect in the component-definition path.
 *
 * @internal
 */
export function createComponentClass<Props extends Record<string, unknown>>(
  tag: string,
  definition: ComponentDefinition<Props>,
): CustomElementConstructor {
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

  return ComponentClass;
}
