/**
 * Component authoring API — define custom elements, props, and registration.
 */

import { type ComponentHost, type ComponentSlots, createHost, createSlots } from './host';
import { type EmitFn, type HTMLResult, createEmitFn, toKebab } from './internal';
import {
  createProps,
  hasStructuredDefault,
  type InferPropsFromDefs,
  type InferPropsSignals,
  normalizePropDefinition,
  type PropDef,
  type PropInputDefs,
  type PropOptions,
  type PropsInput,
  type ResolveComponentProps,
} from './props';
import { type ComponentRegistrationOptions, registerComponent } from './registration';

export { createProps, type PropsInput };
export type { InferPropsFromDefs, InferPropsSignals, PropDef, PropInputDefs, PropOptions, ResolveComponentProps };
export { registerComponent, type ComponentRegistrationOptions };

/**
 * Unified setup context passed to component setup functions.
 */
export type ComponentSetupContext<
  P extends Record<string, unknown> = Record<never, never>,
  E extends Record<string, unknown> = Record<string, never>,
  D extends PropInputDefs = PropsInput<P>,
> = {
  /** Emit custom events */
  emit: EmitFn<E>;
  /** Host element API (binding attributes, classes, and listeners) */
  host: ComponentHost;
  /** Component props (as signals) */
  props: InferPropsSignals<ResolveComponentProps<P, D>>;
  /** The component's ShadowRoot */
  shadowRoot: ShadowRoot;
  /** Reactive slot API */
  slots: ComponentSlots;
};

export type ComponentDefinition<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  PropDefs extends PropInputDefs = PropsInput<Props>,
> = {
  /** Enable form association for the custom element */
  formAssociated?: boolean;
  /** Component properties and their metadata */
  props?: PropDefs;
  /** Main setup function where component logic is defined */
  setup: (ctx: ComponentSetupContext<ResolveComponentProps<Props, PropDefs>, Emits, PropDefs>) => HTMLResult | string;
  /** Shadow DOM configuration (mode is always 'open') */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component-specific styles */
  styles?: (string | CSSStyleSheet | import('./internal').CSSResult)[];
};

const validatePropDefinitions = (tag: string, propDefs: PropInputDefs | undefined): void => {
  if (!propDefs) return;

  for (const [name, definition] of Object.entries(propDefs)) {
    if (typeof definition !== 'object' || definition === null || !('default' in definition)) continue;

    const descriptor = normalizePropDefinition(definition as PropDef<unknown>);

    if (descriptor.reflect === true && hasStructuredDefault(descriptor.default)) {
      throw new Error(
        `[craftit:E9] define('${tag}', ...): props.${name} cannot use reflect: true with object/array defaults`,
      );
    }
  }
};

export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  EventsType extends Record<string, unknown> = Record<string, never>,
  PropDefs extends PropInputDefs = PropsInput<Props>,
>(tag: string, definition: ComponentDefinition<Props, EventsType, PropDefs> & { props?: PropDefs }): string {
  const { formAssociated, props: propDefs, setup, shadow: shadowOptions, styles } = definition;

  validatePropDefinitions(tag, propDefs);

  const observedAttrs = propDefs ? Object.keys(propDefs).map(toKebab) : [];

  return registerComponent(
    tag,
    () => {
      const props = propDefs
        ? createProps(propDefs)
        : ({} as InferPropsSignals<ResolveComponentProps<Props, PropDefs>>);
      const emit = createEmitFn<EventsType>();
      const host = createHost();
      let slotsApi: ComponentSlots | undefined;
      const slots: ComponentSlots = {
        elements: (name?: string) => {
          if (!slotsApi) slotsApi = createSlots();

          return slotsApi.elements(name);
        },
        has: (name?: string) => {
          if (!slotsApi) slotsApi = createSlots();

          return slotsApi.has(name);
        },
      };

      return setup({
        emit: emit as EmitFn<EventsType>,
        host,
        props: props as InferPropsSignals<ResolveComponentProps<Props, PropDefs>>,
        shadowRoot: host.shadowRoot,
        slots,
      } as ComponentSetupContext<ResolveComponentProps<Props, PropDefs>, EventsType, PropDefs>);
    },
    {
      formAssociated,
      observedAttrs,
      shadow: shadowOptions,
      styles,
    } satisfies ComponentRegistrationOptions,
  );
}
