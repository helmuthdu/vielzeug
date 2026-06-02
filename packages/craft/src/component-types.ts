/**
 * Public component definition types for craft web components.
 * These are the types consumers interact with when calling define().
 */

import type { CraftitError } from './errors';
import type { HostBindFn } from './host-bind';
import type { InferPropsSignals, PropsDef } from './props';
import type { ComponentSlots } from './slots';
import type { HTMLResult } from './types/bindings';
import type { CSSResult } from './utils/css';
import type { EmitFn } from './utils/emit';

/**
 * The context bag passed as the second argument to `setup()`.
 * Contains per-instance data: the host element, emit function, bind helper, and slot signals.
 * Import lifecycle functions (`effect`, `onMounted`, `onCleanup`, `inject`, etc.) directly
 * from `@vielzeug/craft` — they use the current component context automatically.
 */
export type SetupContextBag<
  Emits extends Record<string, unknown> = Record<string, unknown>,
  SlotNames extends string = string,
> = {
  /** Apply reactive or static bindings to the host element's attributes, classes, styles, and events. */
  bind: HostBindFn;
  /** The component's host element. */
  el: HTMLElement;
  /** Dispatch a typed custom event from the host element. */
  emit: EmitFn<Emits>;
  /** Reactive slot presence / element signals. */
  slots: ComponentSlots<SlotNames>;
};

export type ComponentDefinition<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  SlotNames extends string = string,
> = {
  formAssociated?: boolean;
  /**
   * Rendered while async `setup()` is still pending.
   * Only used when `setup` returns a `Promise`.
   */
  loading?: () => HTMLResult;
  /**
   * Error handler called when setup throws.
   * If a recovery HTMLResult is returned, it replaces the failed template.
   */
  onError?: (error: CraftitError, element: HTMLElement) => HTMLResult | void;
  props?: PropsDef<Props>;
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits, SlotNames>) => HTMLResult | Promise<HTMLResult>;
  /**
   * Shadow DOM configuration. `mode` defaults to `'open'`.
   * Set to `false` to opt out of shadow DOM entirely (light DOM rendering).
   */
  shadow?: Partial<ShadowRootInit> | false;
  slots?: readonly SlotNames[];
  styles?: (string | CSSStyleSheet | CSSResult)[];
};
