import { createLocalSource, type LocalSourceState } from '@vielzeug/sourcerer';
import { getCurrentScope, onScopeDispose, shallowRef, type WatchSource, watch } from 'vue';

/**
 * Bridges a sourcerer `LocalSource` into Vue: the already-filtered+sorted items are paginated
 * synchronously. When `items` changes, the source's items are replaced. The component scope
 * owns the source's lifecycle.
 */
export function useLocalPagination<T>(items: WatchSource<readonly T[]>, pageSize = 10) {
  const initial = typeof items === 'function' ? items() : items.value;
  const source = createLocalSource<T>(initial as readonly T[], { pageSize });
  const state = shallowRef<LocalSourceState<T, undefined>>(source.state);

  const unsubscribe = source.subscribe(() => {
    state.value = source.state;
  });

  if (getCurrentScope()) {
    watch(items, (next) => source.setItems(next));
    onScopeDispose(() => {
      unsubscribe();
      source.dispose();
    });
  }

  return { source, state };
}
