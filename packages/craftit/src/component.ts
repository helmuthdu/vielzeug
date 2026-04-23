/**
 * Component authoring API — define custom elements, props, and registration.
 */

import { type ComponentHost, type ComponentSlots, createHost, createSlots } from './host';
import { type EmitFn, createEmitFn, toKebab } from './internal';
import {
  createProps,
  type InferPropsFromDefs,
  type InferPropsSignals,
  prop,
  type PropDef,
  type PropInputDefs,
  type PropOptions,
  type PropsInput,
  type PropsDef,
} from './props';
import { registerComponent, type ComponentInstance } from './registration';

export { createProps, type PropsDef, type PropsInput };
export { prop };
export type { InferPropsFromDefs, InferPropsSignals, PropDef, PropInputDefs, PropOptions };

/**
 * Setup context passed to the component setup function.
 * Contains emit function, host API, and slots API.
 * Props are passed as the first positional parameter.
 */
export type SetupContextBag<Emits extends Record<string, unknown> = Record<string, unknown>> = {
  emit: EmitFn<Emits>;
  host: ComponentHost;
  slots: ComponentSlots;
};

export type ComponentDefinition<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
> = {
  /** Enable form association for the custom element */
  formAssociated?: boolean;
  /** Component properties and their metadata */
  props?: PropsDef<Props>;
  /** Main setup function where component logic is defined. Props are the first positional parameter. Returns a ComponentInstance with render and optional mount. */
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits>) => ComponentInstance;
  /** Shadow DOM configuration (mode is always 'open') */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component-specific styles */
  styles?: (string | CSSStyleSheet | import('./internal').CSSResult)[];
};

export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
>(tag: string, definition: ComponentDefinition<Props, Emits>): string {
  const { formAssociated, props: propDefs, setup, shadow: shadowOptions, styles } = definition;

  const observedAttrs = propDefs ? Object.keys(propDefs).map(toKebab) : [];

  return registerComponent(
    tag,
    () => {
      const props = propDefs ? (createProps(propDefs) as InferPropsSignals<Props>) : ({} as InferPropsSignals<Props>);
      const host = createHost();
      const emit = createEmitFn<Emits>();

      let _slots: ComponentSlots | undefined;
      const slots: ComponentSlots = {
        elements: (name?: string) => (_slots ??= createSlots()).elements(name),
        has: (name?: string) => (_slots ??= createSlots()).has(name),
      };

      return setup(props as any, {
        emit,
        host,
        slots,
      });
    },
    {
      formAssociated,
      observedAttrs,
      shadow: shadowOptions,
      styles,
    },
  );
}
