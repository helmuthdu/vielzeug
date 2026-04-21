/**
 * Component authoring API — define custom elements, props, and registration.
 */

import type { Signal } from '@vielzeug/stateit';

import { type ComponentHost, type ComponentSlots, createHost, createSlots } from './host';
import { type EmitFn, type HTMLResult, createEmitFn, toKebab } from './internal';
import {
  createProps,
  type InferPropsFromDefs,
  type InferPropsSignals,
  type PropDef,
  type PropInputDefs,
  type PropOptions,
  type PropsInput,
} from './props';
import { registerComponent } from './registration';
import { currentRuntime } from './runtime';

export { createProps, type PropsInput };
export type { InferPropsFromDefs, InferPropsSignals, PropDef, PropInputDefs, PropOptions };

// Deprecated use* functions removed — use SetupContext parameter instead

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
  PropDefs extends PropInputDefs = PropsInput<Props>,
> = {
  /** Enable form association for the custom element */
  formAssociated?: boolean;
  /** Component properties and their metadata */
  props?: PropDefs;
  /** Main setup function where component logic is defined. Props are the first positional parameter. */
  setup: (
    props: { readonly [K in keyof InferPropsFromDefs<PropDefs>]-?: Signal<InferPropsFromDefs<PropDefs>[K]> },
    ctx: SetupContextBag<Emits>,
  ) => HTMLResult | string;
  /** Shadow DOM configuration (mode is always 'open') */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component-specific styles */
  styles?: (string | CSSStyleSheet | import('./internal').CSSResult)[];
};

export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  EventsType extends Record<string, unknown> = Record<string, never>,
  PropDefs extends PropInputDefs = PropsInput<Props>,
>(tag: string, definition: ComponentDefinition<Props, EventsType, PropDefs> & { props?: PropDefs }): string {
  const { formAssociated, props: propDefs, setup, shadow: shadowOptions, styles } = definition;

  const observedAttrs = propDefs ? Object.keys(propDefs).map(toKebab) : [];

  return registerComponent(
    tag,
    () => {
      const props = propDefs ? createProps(propDefs) : ({} as InferPropsSignals<InferPropsFromDefs<PropDefs>>);
      const host = createHost();
      const emit = createEmitFn<EventsType>();
      const slots = createSlots();

      // Store on runtime for lifecycle hooks (onMount, onCleanup, effect, etc.)
      const runtime = currentRuntime();

      runtime.host = host;
      runtime.props = props as Record<string, Signal<unknown>>;
      runtime.slots = slots;

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
