import {
  aria,
  computed,
  createId,
  define,
  defineEmits,
  defineField,
  defineProps,
  defineSlots,
  effect,
  guard,
  handle,
  html,
  inject,
  onMount,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import { coarsePointerMixin, formControlMixins, sizeVariantMixin } from '../../styles';
import { mountFormContextSync } from '../../utils/use-text-field';
import { FORM_CTX } from '../form/form';
import { RADIO_GROUP_CTX } from '../radio-group/radio-group';
import componentStyles from './radio.css?inline';

/** Radio component properties */

export type BitRadioEvents = {
  change: { checked: boolean; originalEvent: Event };
};

export type BitRadioProps = CheckableProps &
  ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Error message (marks field as invalid) */
    error?: string;
    /** Helper text displayed below the radio */
    helper?: string;
  };

/**
 * A customizable radio button component for mutually exclusive selections.
 *
 * @element bit-radio
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disable radio interaction
 * @attr {string} value - Field value
 * @attr {string} name - Form field name (required for radio groups)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Radio size: 'sm' | 'md' | 'lg'
 *
 * @fires change - Emitted when radio is selected
 *
 * @slot - Radio button label text
 *
 * @part radio - The radio wrapper element
 * @part circle - The visual radio circle
 * @part label - The label text element
 *
 * @cssprop --radio-size - Radio button dimensions
 * @cssprop --radio-bg - Background color (unchecked)
 * @cssprop --radio-checked-bg - Background color (checked)
 * @cssprop --radio-border-color - Border color
 * @cssprop --radio-color - Inner dot color
 * @cssprop --radio-font-size - Label font size
 *
 * @example
 * ```html
 * <bit-radio name="size" value="small">Small</bit-radio>
 * <bit-radio name="size" value="medium" checked>Medium</bit-radio>
 * <bit-radio name="size" value="large">Large</bit-radio>
 * ```
 */
export const RADIO_TAG = define(
  'bit-radio',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<BitRadioEvents>();
    const props = defineProps<BitRadioProps>({
      checked: { default: false },
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '', omit: true },
      helper: { default: '' },
      name: { default: '' },
      size: { default: undefined },
      value: { default: '' },
    });

    const checkedSignal = signal(false);

    const groupCtx = inject(RADIO_GROUP_CTX);
    const formCtx = inject(FORM_CTX);

    mountFormContextSync(host, formCtx, props);

    defineField(
      {
        disabled: computed(() => props.disabled.value),
        toFormValue: (v: string | null) => v,
        value: computed(() => (checkedSignal.value ? props.value.value : null)),
      },
      {
        onReset: () => {
          checkedSignal.value = props.checked.value;
        },
      },
    );

    const labelRef = ref<HTMLSpanElement>();
    const helperRef = ref<HTMLDivElement>();
    const helperId = createId('radio-helper');

    // When inside a group, derive checked state from group context value.
    // When standalone, drive it from the checked prop/attribute.
    if (groupCtx) {
      watch(
        computed(() => groupCtx.value.value === props.value.value),
        (isChecked) => {
          checkedSignal.value = isChecked;
        },
        { immediate: true },
      );
    } else {
      watch(
        props.checked,
        (v) => {
          checkedSignal.value = v ?? false;
        },
        { immediate: true },
      );
    }

    // Mirror checkedSignal back to the host attribute so CSS, external queries,
    // and framework bindings can observe the checked state declaratively.
    watch(
      computed(() => checkedSignal.value),
      (isChecked) => {
        if (isChecked) host.setAttribute('checked', '');
        else host.removeAttribute('checked');
      },
      { immediate: true },
    );

    const getRadioGroup = (): HTMLElement[] => {
      const radioName = props.name.value;

      if (!radioName) return [];

      return Array.from(document.querySelectorAll<HTMLElement>(`bit-radio[name="${radioName}"]`)).filter(
        (r) => !r.hasAttribute('disabled'),
      );
    };

    const selectRadio = (target: HTMLElement, originalEvent: Event) => {
      const radios = getRadioGroup();

      if (radios.length === 0) return;

      radios.forEach((radio) => {
        if (radio === target) {
          if (!radio.hasAttribute('checked')) {
            radio.setAttribute('checked', '');

            // Sync local signal if this is our host
            if (radio === host) {
              checkedSignal.value = true;
              emit('change', { checked: true, originalEvent });
            } else {
              radio.dispatchEvent(
                new CustomEvent('change', {
                  bubbles: true,
                  composed: true,
                  detail: { checked: true, originalEvent },
                }),
              );
            }
          }
        } else if (radio.hasAttribute('checked')) {
          radio.removeAttribute('checked');
          radio.dispatchEvent(
            new CustomEvent('change', { bubbles: true, composed: true, detail: { checked: false, originalEvent } }),
          );
        }
      });
    };

    const handleClick = guard(
      () => !props.disabled.value && !host.hasAttribute('checked'),
      (e: Event) => {
        if (groupCtx) {
          groupCtx.select(props.value.value ?? '');
        } else {
          selectRadio(host, e);
        }
      },
    );

    const handleKeydown = guard(
      () => !props.disabled.value,
      (e: KeyboardEvent) => {
        const radios = getRadioGroup();

        if (radios.length === 0) return;

        const currentIndex = radios.indexOf(host);

        if (currentIndex === -1) return;

        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();

          if (!host.hasAttribute('checked')) {
            if (groupCtx) {
              groupCtx.select(props.value.value ?? '');
            } else {
              selectRadio(host, e);
            }
          }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();

          const nextIndex = (currentIndex + 1) % radios.length;
          const nextRadio = radios[nextIndex];

          nextRadio.focus();

          if (groupCtx) {
            groupCtx.select(nextRadio.getAttribute('value') ?? '');
          } else {
            selectRadio(nextRadio, e);
          }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();

          const prevIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
          const prevRadio = radios[prevIndex];

          prevRadio.focus();

          if (groupCtx) {
            groupCtx.select(prevRadio.getAttribute('value') ?? '');
          } else {
            selectRadio(prevRadio, e);
          }
        }
      },
    );

    handle(host, 'click', handleClick);
    handle(host, 'keydown', handleKeydown);

    // Pre-register the slot signal during setup so its onMount runs before ours,
    // ensuring slots.has('default').value returns the correct value inside onMount.
    slots.has('default');

    onMount(() => {
      host.setAttribute('role', 'radio');

      if (!props.disabled.value) host.setAttribute('tabindex', checkedSignal.value ? '0' : '-1');

      // labelRef.value is only populated after template render
      const label = labelRef.value;

      if (slots.has('default').value && label) {
        const labelId = createId('radio-label');

        label.id = labelId;
        aria({ labelledby: labelId });
      }

      effect(() => {
        const helperEl = helperRef.value;

        if (!helperEl) return;

        helperEl.id = helperId;
        helperEl.textContent = props.error.value || props.helper.value || '';
        helperEl.hidden = !props.error.value && !props.helper.value;

        if (props.error.value) helperEl.setAttribute('role', 'alert');
        else helperEl.removeAttribute('role');
      });
    });

    aria({
      checked: () => String(checkedSignal.value),
      describedby: () => (props.error.value || props.helper.value ? helperId : null),
      invalid: () => !!props.error.value,
    });

    watch(
      computed(() => ({ checked: checkedSignal.value, disabled: props.disabled.value })),
      ({ checked, disabled }) => {
        if (disabled) host.removeAttribute('tabindex');
        else host.setAttribute('tabindex', checked ? '0' : '-1');
      },
    );

    return {
      styles: [
        ...formControlMixins,
        coarsePointerMixin,
        sizeVariantMixin({
          lg: {
            fontSize: 'var(--text-base)',
            gap: 'var(--size-2-5)',
            size: 'var(--size-6)',
          },
          sm: {
            fontSize: 'var(--text-xs)',
            gap: 'var(--size-1-5)',
            size: 'var(--size-4)',
          },
        }),
        componentStyles,
      ],
      template: html` <div class="radio-wrapper" part="radio">
          <div class="circle" part="circle">
            <div class="dot" part="dot"></div>
          </div>
        </div>
        <span class="label" part="label" ref=${labelRef}><slot></slot></span>
        <div class="helper-text" part="helper-text" ref=${helperRef} aria-live="polite" hidden></div>`,
    };
  },
  { formAssociated: true },
);
