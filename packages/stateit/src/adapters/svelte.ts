export * from '../index.js';

import type { ReadonlySignal } from '../index.js';

/**
 * Svelte readable store shape — compatible with Svelte's `$`-prefix auto-subscription.
 */
export type SvelteReadable<T> = {
  subscribe(run: (value: T) => void): () => void;
};

/**
 * Adapts any stateit {@link ReadonlySignal} to a Svelte readable store.
 *
 * The subscriber is called **immediately** with the current value, then on each change.
 * This matches Svelte's contract for stores used with the `$`-prefix syntax.
 *
 * Works with signals, computed signals, and stores — anything that implements
 * {@link ReadonlySignal}.
 *
 * @example
 * ```svelte
 * <script>
 *   import { signal, computed, useSignal } from '@vielzeug/stateit/svelte';
 *
 *   const count = signal(0);
 *   const doubled = computed(() => count.value * 2);
 *
 *   const $count = useSignal(count);
 *   const $doubled = useSignal(doubled);
 * </script>
 *
 * <button on:click={() => count.value++}>{$count} × 2 = {$doubled}</button>
 * ```
 */
export const useSignal = <T>(source: ReadonlySignal<T>): SvelteReadable<T> => ({
  subscribe(run) {
    run(source.value);

    const sub = source.subscribe(() => run(source.value));

    return () => sub();
  },
});
