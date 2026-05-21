import type { ReadonlySignal } from '../index.js';

/**
 * Svelte readable store shape — compatible with Svelte's `$`-prefix auto-subscription.
 */
export type SvelteReadable<T> = {
  subscribe(run: (value: T) => void): () => void;
};

/**
 * Adapts any stateit {@link ReadonlySignal} to Svelte's readable store protocol.
 *
 * The subscriber is called **immediately** with the current value, then on each change.
 * This matches Svelte's contract for stores used with the `$`-prefix syntax.
 *
 * The method name `adapt` is consistent across all `@vielzeug/stateit/*` adapters,
 * making it trivial to swap frameworks without learning a new API.
 *
 * @example
 * ```svelte
 * <script>
 *   import { signal, computed } from '@vielzeug/stateit';
 *   import { adapt } from '@vielzeug/stateit/svelte';
 *
 *   const count = signal(0);
 *   const doubled = computed(() => count.value * 2);
 *
 *   const $count = adapt(count);
 *   const $doubled = adapt(doubled);
 * </script>
 *
 * <button on:click={() => count.value++}>{$count} × 2 = {$doubled}</button>
 * ```
 */
export const adapt = <T>(source: ReadonlySignal<T>): SvelteReadable<T> => ({
  subscribe(run) {
    run(source.value);

    const sub = source.subscribe(() => run(source.value));

    return () => sub();
  },
});
