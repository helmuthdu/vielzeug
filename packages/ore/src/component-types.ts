/**
 * Public component definition types for ore web components.
 * These are the types consumers interact with when calling define().
 *
 * `setup()` takes only `props` — everything else (lifecycle hooks, bindings,
 * context, slots, emit) is a free function imported from `@vielzeug/ore`
 * (see `runtime.ts`, `host-bind.ts`, `aria.ts`, `context.ts`, `slots.ts`,
 * `utils/emit.ts`) and resolved through the implicit "current component"
 * context rather than threaded through a second `setup()` parameter. This
 * keeps `setup()` a plain function you can call composables from. Note:
 * ore's `watchEffect()` is intentionally not named `watch` — `@vielzeug/ripple`
 * already exports a `watch(source, callback)` with different semantics
 * (explicit source + old/new value pair), so reusing the name here would
 * silently shadow it whenever both are imported in the same file.
 */

import type { OreLifecycleError } from './errors';
import type { InferProps, PropsDef } from './props';
import type { HTMLResult } from './types/bindings';
import type { CSSResult } from './utils/css';

export type ComponentDefinition<Props extends Record<string, unknown> = Record<never, never>> = {
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
  onError?: (error: OreLifecycleError, element: HTMLElement) => HTMLResult | void;
  props?: PropsDef<Props>;
  setup: (props: InferProps<PropsDef<Props>>) => HTMLResult | null | Promise<HTMLResult | null>;
  /**
   * Shadow DOM configuration. `mode` defaults to `'open'`.
   * Set to `false` to opt out of shadow DOM entirely (light DOM rendering).
   */
  shadow?: Partial<ShadowRootInit> | false;
  styles?: (string | CSSStyleSheet | CSSResult)[];
};
