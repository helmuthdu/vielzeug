import { effect, type ReadonlySignal } from '@vielzeug/craftit';

export type LabelSyncProps = {
  label: ReadonlySignal<string | undefined>;
  'label-placement': ReadonlySignal<'inset' | 'outside' | undefined>;
};

/**
 * Reactively synchronises label text and visibility for components that manage
 * their own `labelInsetRef` / `labelOutsideRef` refs (e.g. select, combobox).
 * Call inside `onMount` once DOM refs are ready.
 */
export function mountLabelSyncStandalone(
  labelInsetRef: { value: HTMLElement | null | undefined },
  labelOutsideRef: { value: HTMLElement | null | undefined },
  props: LabelSyncProps,
): void {
  effect(() => {
    const placement = props['label-placement'].value ?? 'inset';
    const labelText = props.label.value ?? '';

    if (labelInsetRef.value) {
      labelInsetRef.value.textContent = labelText;
      labelInsetRef.value.hidden = !labelText || placement !== 'inset';
    }

    if (labelOutsideRef.value) {
      labelOutsideRef.value.textContent = labelText;
      labelOutsideRef.value.hidden = !labelText || placement !== 'outside';
    }
  });
}
