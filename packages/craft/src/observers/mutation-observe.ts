import { type ReadonlySignal, signal, onCleanup } from '@vielzeug/ripple';

export type MutationObserverValue = {
  entries: MutationRecord[];
  latest: MutationRecord | null;
};

/**
 * Observes DOM mutations on an element and exposes the latest mutation batch.
 */
export const mutationObserver = (
  el: Element,
  options: MutationObserverInit = {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  },
): ReadonlySignal<MutationObserverValue> => {
  const value = signal<MutationObserverValue>({ entries: [], latest: null });
  const observer = new MutationObserver((entries) => {
    value.value = {
      entries,
      latest: entries.length > 0 ? entries[entries.length - 1] : null,
    };
  });

  observer.observe(el, options);
  onCleanup(() => observer.disconnect());

  return value;
};
