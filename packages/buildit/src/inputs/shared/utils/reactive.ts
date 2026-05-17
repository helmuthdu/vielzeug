import { watch, type ReadonlySignal } from '@vielzeug/craftit';

export const syncSignalFromProp = <T>(source: ReadonlySignal<T>, target: { value: T }): void => {
  watch(
    source,
    (next) => {
      target.value = next;
    },
    { immediate: true },
  );
};
