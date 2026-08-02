import type { ComponentDefinition } from './component-types';

import { createComponentClass } from './_component-class';
import { OreApiError, ORE_ERRORS } from './errors';
import { prop, type PropDef } from './props';

export { prop };
export type { PropDef };
export type { HostBindFn } from './host-bind';

/**
 * Define and register a web component.
 *
 * The `setup` function runs for each connection and returns an `HTMLResult`.
 * Disconnecting disposes its state; reconnecting rebuilds it. All reactive
 * behaviour within a connection is expressed through directives inside the
 * template — not by re-evaluating setup itself.
 *
 * Everything besides `props` — lifecycle hooks, host bindings, context, slots,
 * emit — is a free function imported from `@vielzeug/ore` and called directly
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
 */
export function define<Props extends Record<string, unknown> = Record<never, never>>(
  tag: string,
  definition: ComponentDefinition<Props>,
): void {
  if (!tag) throw new OreApiError(ORE_ERRORS.defineRequiresTag);

  if (customElements.get(tag)) throw new OreApiError(ORE_ERRORS.defineDuplicate(tag));

  const ComponentClass = createComponentClass(tag, definition);

  // Registration is intentionally the sole global side effect of define().
  Object.defineProperty(ComponentClass, 'name', { value: tag });
  customElements.define(tag, ComponentClass);
}
