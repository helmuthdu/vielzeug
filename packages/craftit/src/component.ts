/**
 * Component authoring API — define custom elements, props, and registration.
 */

import { type ComponentHost, type ComponentSlots, createHost, createSlots } from './host';
import { type EmitFn, type HTMLResult, createEmitFn, toKebab } from './internal';
import {
  createProps,
  type ComponentProps,
  type InferPropsFromDefs,
  type InferPropsSignals,
  type PropDef,
  type PropInputDefs,
  type PropOptions,
  type PropsInput,
  type ResolveComponentProps,
} from './props';
import { type ComponentRegistrationOptions, registerComponent } from './registration';

export { createProps, type PropsInput };
export type {
  InferPropsFromDefs,
  InferPropsSignals,
  ComponentProps,
  PropDef,
  PropInputDefs,
  PropOptions,
  ResolveComponentProps,
};
export { registerComponent, type ComponentRegistrationOptions };

/**
 * Unified setup context passed to component setup functions.
 */
export type ComponentSetupContext<
  P extends Record<string, unknown> = Record<never, never>,
  E extends Record<string, unknown> = Record<string, never>,
  D extends PropInputDefs = PropsInput<P>,
> = {
  emit: EmitFn<E>;
  host: ComponentHost;
  props: ComponentProps<ResolveComponentProps<P, D>>;
  shadowRoot: ShadowRoot;
  slots: ComponentSlots;
};

/**
 * Configuration object for define().
 */
export type ComponentOptions<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  PropDefs extends PropInputDefs = PropsInput<Props>,
> = {
  formAssociated?: boolean;
  host?: Record<string, string | boolean | number>;
  props?: PropDefs;
  setup: (ctx: ComponentSetupContext<ResolveComponentProps<Props, PropDefs>, Emits, PropDefs>) => string | HTMLResult;
  shadow?: Omit<ShadowRootInit, 'mode'>;
  styles?: (string | CSSStyleSheet | import('./internal').CSSResult)[];
};

export type ComponentDefinition<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  PropDefs extends PropInputDefs = PropsInput<Props>,
> = ComponentOptions<Props, Emits, PropDefs>;

const defineInternal = <
  Props extends Record<string, unknown> = Record<never, never>,
  EventsType extends Record<string, unknown> = Record<string, never>,
  PropDefs extends PropInputDefs = PropsInput<Props>,
>(
  tag: string,
  definition: ComponentDefinition<Props, EventsType, PropDefs> & { props?: PropDefs },
): string => {
  const { formAssociated, host: hostOptions, props: propDefs, setup, shadow: shadowOptions, styles } = definition;

  const observedAttrs = propDefs ? Object.keys(propDefs).map(toKebab) : [];

  return registerComponent(
    tag,
    () => {
      const props = propDefs ? createProps(propDefs) : ({} as ComponentProps<ResolveComponentProps<Props, PropDefs>>);
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
        props: props as ComponentProps<ResolveComponentProps<Props, PropDefs>>,
        shadowRoot: host.shadowRoot,
        slots,
      } as ComponentSetupContext<ResolveComponentProps<Props, PropDefs>, EventsType, PropDefs>);
    },
    {
      formAssociated,
      host: hostOptions,
      observedAttrs,
      shadow: shadowOptions,
      styles,
    } satisfies ComponentRegistrationOptions,
  );
};

export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  EventsType extends Record<string, unknown> = Record<string, never>,
  const PropDefs extends PropInputDefs = PropsInput<Props>,
>(tag: string, definition: ComponentDefinition<Props, EventsType, PropDefs> & { props: PropDefs }): string;
export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  EventsType extends Record<string, unknown> = Record<string, never>,
  PropDefs extends PropInputDefs = PropsInput<Props>,
>(tag: string, definition: ComponentDefinition<Props, EventsType, PropDefs> & { props?: PropDefs }): string;
export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  EventsType extends Record<string, unknown> = Record<string, never>,
  PropDefs extends PropInputDefs = PropsInput<Props>,
>(tag: string, definition: ComponentDefinition<Props, EventsType, PropDefs> & { props?: PropDefs }): string {
  return defineInternal(tag, definition);
}
