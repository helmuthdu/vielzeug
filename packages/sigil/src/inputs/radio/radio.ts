import { computed, define, defineField, html, inject, onCleanup, prop } from '@vielzeug/craft';

import type { CheckableProps, ComponentSize, ThemeColor } from '../../types';

import { type CheckableChangePayload, lifecycleSignal, createCheckable, createListControl } from '../../headless';
import { CONTROL_SIZE_PRESET, disablableBundle, sizableBundle, themableBundle } from '../../shared';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledStateMixin,
  forcedColorsFormControlMixin,
  sizeVariantMixin,
} from '../../styles';
import { RADIO_GROUP_CTX } from '../radio-group/radio-group';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { renderHelperRegion } from '../shared/templates';
import componentStyles from './radio.css?inline';

/** Radio component properties */

export type SgRadioEvents = {
  change: CheckableChangePayload;
};

export type SgRadioProps = CheckableProps & {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Error message (marks field as invalid) */
  error?: string;
  /** Helper text displayed below the radio */
  helper?: string;
  /** Component size */
  size?: ComponentSize;
};

/**
 * A customizable radio button component for mutually exclusive selections.
 *
 * @element sg-radio
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disable radio interaction
 * @attr {string} value - Field value (required for radio groups)
 * @attr {string} name - Form field name (required for radio groups)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Radio size: 'sm' | 'md' | 'lg'
 * @attr {string} error - Error message (marks field as invalid)
 * @attr {string} helper - Helper text displayed below the radio
 *
 * @fires change - Emitted when radio is selected. detail: { checked: boolean, value: string, originalEvent?: Event }
 *
 * @slot - Radio button label text
 *
 * @cssprop --radio-size - Control size (width and height)
 * @cssprop --radio-bg - Unchecked background color
 * @cssprop --radio-border-color - Unchecked border color
 * @cssprop --radio-checked-bg - Selected indicator background color
 * @cssprop --radio-color - Selected indicator dot color
 * @cssprop --radio-font-size - Label font size
 * @part radio - The radio wrapper element
 * @part circle - The visual radio circle
 * @part label - The label element
 * @part helper-text - The helper/error text element
 *
 * @example
 * ```html
 * <sg-radio name="plan" value="free">Free</sg-radio>
 * <sg-radio name="plan" value="pro" checked color="primary">Pro</sg-radio>
 * <sg-radio name="plan" value="enterprise" disabled>Enterprise</sg-radio>
 * ```
 */
export const RADIO_TAG = 'sg-radio' as const;
define<SgRadioProps, SgRadioEvents>(RADIO_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    checked: prop.bool(false),
    error: prop.string(),
    helper: prop.string(),
    name: prop.string(),
    value: prop.string(),
  },
  setup(props, { bind, el, emit }) {
    const groupCtx = inject(RADIO_GROUP_CTX);
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    const effectiveName = computed(() => groupCtx?.name.value || props.name.value || '');
    const effectiveSize = computed(() => groupCtx?.size.value ?? fCtxProps.size.value);
    const effectiveColor = computed(() => groupCtx?.color.value ?? props.color.value);
    const checkedFromState = computed(() => {
      if (groupCtx) return groupCtx.value.value === props.value.value;

      return Boolean(props.checked.value);
    });

    const getRadioGroup = (): HTMLElement[] => {
      const radioName = effectiveName.value;

      if (!radioName) return [];

      return Array.from(document.querySelectorAll<HTMLElement>(`sg-radio[name="${radioName}"]`)).filter(
        (r) => !r.hasAttribute('disabled'),
      );
    };

    const selectRadio = (radio: HTMLElement, originalEvent?: Event): void => {
      if (groupCtx) {
        groupCtx.select(radio.getAttribute('value') ?? '', originalEvent);

        return;
      }

      radio.click();
    };

    let activeIndex = -1;

    const listControl = createListControl({
      getIndex: () => activeIndex,
      getItems: () => getRadioGroup(),
      keys: { next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] },
      loop: true,
      onNavigate: (_action, _index, event) => {
        const nextRadio = getRadioGroup()[activeIndex];

        if (nextRadio) selectRadio(nextRadio, event);
      },
      setIndex: (index) => {
        activeIndex = index;
        getRadioGroup()[index]?.focus();
      },
    });

    const activateSelf = (originalEvent?: Event): void => {
      if (checkable.checked.value) return;

      if (groupCtx) {
        groupCtx.select(props.value.value ?? '', originalEvent);

        return;
      }

      checkable.toggle(originalEvent ?? new Event('change'));
    };

    const checkable = createCheckable({
      checked: checkedFromState,
      disabled: computed(() => fCtxProps.disabled.value || Boolean(groupCtx?.disabled.value)),
      error: props.error,
      helper: props.helper,
      onToggle: (payload) => {
        emit('change', payload);
      },
      prefix: 'radio',
      signal: lifecycleSignal(onCleanup),
      validateOn: formCtx?.validateOn,
      value: props.value,
    });
    const { assistive, assistiveId, checked, disabled, labelId, toggle } = checkable;

    checkable.bindFormField(
      defineField<string | null>({
        disabled: checkable.disabled,
        toFormValue: (v) => v,
        value: checkable.checkableFormValue,
      }),
    );

    bind({
      attr: {
        ariaChecked: () => (checked.value ? 'true' : 'false'),
        ariaDescribedby: () => (assistive.value.errorText || assistive.value.helperText ? assistiveId : null),
        ariaDisabled: () => (disabled.value ? 'true' : null),
        ariaInvalid: () => (assistive.value.errorText ? 'true' : null),
        ariaLabelledby: labelId,
        checked,
        color: effectiveColor,
        disabled: () => (disabled.value ? true : undefined),
        name: () => effectiveName.value || undefined,
        role: 'radio',
        size: effectiveSize,
        tabindex: () => {
          if (disabled.value) return undefined;

          return checked.value ? 0 : -1;
        },
      },
      class: () => ({
        'is-checked': checked.value,
        'is-disabled': disabled.value,
      }),
      on: {
        click: (e: MouseEvent) => {
          if (disabled.value) return;

          if (groupCtx) {
            groupCtx.select(props.value.value ?? '', e);
          } else {
            if (!effectiveName.value) return;

            if (!checked.value) {
              const radioName = props.name.value;
              const allRadios = document.querySelectorAll<HTMLElement>(`sg-radio[name="${radioName}"]`);

              allRadios.forEach((radio) => {
                if (radio !== el) radio.removeAttribute('checked');
              });

              toggle(e);
            }
          }
        },
        keydown: (e: KeyboardEvent) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            activateSelf(e);

            return;
          }

          const radios = getRadioGroup();

          if (radios.length === 0) return;

          activeIndex = radios.indexOf(el);

          if (activeIndex === -1) return;

          listControl.handleKeydown(e);
        },
      },
    });

    return html`
      <div class="radio-wrapper" part="radio">
        <div class="circle" part="circle">
          <div class="dot" part="dot"></div>
        </div>
      </div>
      <span class="label" part="label" id="${labelId}"><slot></slot></span>
      ${renderHelperRegion(assistiveId, assistive)}
    `;
  },
  styles: [
    colorThemeMixin,
    forcedColorsFormControlMixin,
    disabledStateMixin,
    coarsePointerMixin,
    sizeVariantMixin(CONTROL_SIZE_PRESET),
    componentStyles,
  ],
});
