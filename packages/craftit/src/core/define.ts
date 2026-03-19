import { type CSSResult } from './css';
import { registerComponent } from './element';
import { createEmitFn, type EmitFn } from './emitter';
import { type HTMLResult } from './internal';
import { createProps, type InferPropsSignals, type PropDef, type PropOptions } from './props';
import { reflect, type ReflectConfig } from './reflect';
import { createSlots, type Slots } from './slots';

/**
 * Helper type to build a prop schema from a props interface type.
 * Each property maps to a PropOptions shape with a `default` value.
 */
export type BuildPropSchema<T> = {
  [K in keyof T]-?: PropDef<T[K]>;
};

/**
 * Unified setup context passed to `defineComponent` setup function.
 * Both Props and Events generics flow through to give full type safety.
 */
export type DefineComponentSetupContext<
  P extends Record<string, PropOptions<any>> = Record<string, never>,
  E extends Record<string, unknown> = Record<string, never>,
> = {
  /** Typed emit function — fully inferred from the Events generic */
  emit: EmitFn<E>;
  /** Host element */
  host: HTMLElement;
  /** Reactive props as signals — fully inferred from the Props generic */
  props: InferPropsSignals<P>;
  /** Reflect reactive attributes, events and classes to the host */
  reflect: (config: ReflectConfig) => void;
  /** Shadow root */
  shadow: ShadowRoot;
  /** Slots helper */
  slots: Slots<any>;
};

/**
 * Configuration object for `defineComponent()`.
 * Note: no `emits` field — declare events via the Events generic instead.
 */
export type DefineComponentOptions<
  PropsSchema extends Record<string, PropDef<any>> = Record<string, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
> = {
  /** Whether this element is form-associated */
  formAssociated?: boolean;
  /** Host element attributes */
  host?: Record<string, string | boolean | number>;
  /** Property definitions */
  props?: PropsSchema;
  /** Setup function — returns a template */
  setup: (ctx: DefineComponentSetupContext<PropsSchema, Emits>) => string | HTMLResult;
  /** Shadow root init options */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component styles */
  styles?: (string | CSSStyleSheet | CSSResult)[];
  /** Custom element tag name (must include a hyphen) */
  tag: string;
};

/**
 * Defines a custom element with a cohesive, type-safe API.
 *
 * Pass your Props and Events interfaces as generics — everything in `setup`
 * is fully typed with zero boilerplate.
 *
 * @example
 * ```ts
 * type MyProps = { checked?: boolean; disabled?: boolean };
 * type MyEvents = { change: { checked: boolean } };
 *
 * defineComponent<MyProps, MyEvents>({
 *   tag: 'my-checkbox',
 *   props: {
 *     checked: { default: false },
 *     disabled: { default: false },
 *   },
 *   setup({ props, emit, reflect }) {
 *     // props.checked → Signal<boolean | undefined>  ✅
 *     // emit('change', { checked: true })            ✅
 *   },
 * });
 * ```
 */
export function defineComponent<
  PropsType = Record<string, never>,
  EventsType extends Record<string, unknown> = Record<string, never>,
>(options: DefineComponentOptions<BuildPropSchema<PropsType>, EventsType>): string {
  const { formAssociated, host: hostOptions, props: propDefs, setup, shadow: shadowOptions, styles, tag } = options;

  return registerComponent(
    tag,
    (ctx) => {
      type Schema = BuildPropSchema<PropsType>;

      const props = propDefs ? createProps<Schema>(propDefs as any) : ({} as InferPropsSignals<Schema>);
      const emit = createEmitFn<EventsType>();
      const slots = createSlots<any>();

      return setup({
        emit,
        host: ctx.host,
        props: props as InferPropsSignals<Schema>,
        reflect: (config: ReflectConfig) => reflect(ctx.host, config),
        shadow: ctx.shadow,
        slots,
      });
    },
    { formAssociated, host: hostOptions, shadow: shadowOptions, styles },
  );
}
