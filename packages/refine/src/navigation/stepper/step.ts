import { bind, define, getHost, html, inject, prop, useSlots, watchEffect } from '@vielzeug/ore';
import { disablableBundle } from '../../shared';
import { colorThemeMixin, forcedColorsFocusMixin, touchTargetMixin } from '../../styles';
import { COMPONENT_SIZES, type ComponentSize, THEME_COLORS, type ThemeColor } from '../../types';
import stepStyles from './step.css?inline';
import { STEPPER_CTX } from './stepper';

export { ICON_TAG } from '../../content/icon/icon';
export type OreStepProps = {
  /**
   * Theme color. Inherited from the parent `ore-stepper` when nested inside one (overrides
   * this value); only takes effect on its own when `ore-step` is rendered standalone.
   */
  color?: ThemeColor;
  /** Disables this step: it cannot be navigated to and is skipped by keyboard navigation. */
  disabled?: boolean;
  /** Marks this step as failed/invalid. Overrides the completed/current indicator visuals. */
  error?: boolean;
  /**
   * Marks this step as optional. Renders a small "(optional)" hint next to the label.
   * Purely presentational: has no effect on navigation.
   */
  optional?: boolean;
  /** Orientation. Inherited from the parent `ore-stepper` when nested inside one. */
  orientation?: 'horizontal' | 'vertical';
  /** Component size. Inherited from the parent `ore-stepper` when nested inside one. */
  size?: ComponentSize;
  /** Unique identifier, matches `ore-stepper`'s `value` attribute. */
  value: string;
};

/**
 * A single step trigger. Must be placed as a direct child of `ore-stepper`, which provides
 * this step's current/completed/navigable/index/total state via context: those are derived,
 * read-only attributes on this element, not settable props.
 *
 * @element ore-step
 *
 * @attr {string} value - Unique identifier, matches the parent ore-stepper's `value` attribute
 * @attr {boolean} disabled - Prevents navigation to this step
 * @attr {boolean} error - Marks the step as failed/invalid
 * @attr {boolean} optional - Renders an "(optional)" hint next to the label
 * @attr {boolean} current - Read-only. Derived from position relative to the parent ore-stepper's `value`.
 * @attr {boolean} completed - Read-only. Derived from position relative to the parent ore-stepper's `value`.
 * @attr {boolean} navigable - Read-only. Derived from the parent ore-stepper's `clickable`/`linear`/`disabled`.
 * @attr {number} index - Read-only. This step's 1-based position among its siblings.
 * @attr {number} total - Read-only. Total sibling step count.
 * @attr {string} color - Inherited from ore-stepper: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Inherited from ore-stepper: 'sm' | 'md' | 'lg'
 * @attr {string} orientation - Inherited from ore-stepper: 'horizontal' | 'vertical'
 *
 * @slot - Step label
 * @slot description - Optional supporting text shown below the label
 * @slot icon - Custom icon replacing the step number/check/error indicator
 * @slot optional - Localized optional hint
 * @slot status - Caller-supplied status text
 *
 * @part control - Clickable (or static) root element for the step
 * @part indicator - Circular indicator holding the number/icon
 * @part content - Wrapper around the label and description
 * @part label - Step label element
 * @part description - Step description element
 * @part connector - Connector line segments (leading and trailing halves) either side of this step's indicator
 *
 * @cssprop --step-indicator-size - Indicator circle diameter (default 32 px; size tiers sm/md/lg set 24/32/40 px)
 * @cssprop --step-font-size - Step label font size
 * @cssprop --step-gap - Gap between the indicator and the label content
 *
 * @example
 * ```html
 * <ore-step value="details">Account details</ore-step>
 * <ore-step value="review" disabled>Review</ore-step>
 * ```
 */
export const STEP_TAG = 'ore-step' as const;
define<OreStepProps>(STEP_TAG, {
  props: {
    ...disablableBundle,
    color: prop.oneOf(THEME_COLORS),
    error: prop.bool(false),
    optional: prop.bool(false),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    size: prop.oneOf(COMPONENT_SIZES),
    value: prop.string(''),
  },
  setup(props) {
    const el = getHost();
    const slots = useSlots();
    const stepperCtx = inject(STEPPER_CTX);

    const stepIndex = (): number => (stepperCtx ? stepperCtx.stepValues.value.indexOf(props.value.value) : -1);
    const totalSteps = (): number => stepperCtx?.stepValues.value.length ?? 0;
    const currentIndex = (): number =>
      stepperCtx ? stepperCtx.stepValues.value.indexOf(stepperCtx.currentValue.value ?? '') : -1;
    // Standalone steps display 1; derived attributes remain absent without a parent.
    const displayIndex = (): number => {
      const index = stepIndex();

      return index >= 0 ? index + 1 : 1;
    };
    const isCurrent = (): boolean => {
      const index = stepIndex();
      const current = currentIndex();

      return !!stepperCtx?.valid.value && index >= 0 && index === current;
    };
    // Completion remains positional even when an error overrides the indicator.
    const isCompleted = (): boolean => {
      const index = stepIndex();
      const current = currentIndex();

      return !!stepperCtx?.valid.value && index >= 0 && current >= 0 && index < current;
    };
    const isNavigable = (): boolean => {
      const index = stepIndex();
      return Boolean(
        stepperCtx &&
          stepperCtx.valid.value &&
          stepperCtx.clickable.value &&
          !props.disabled.value &&
          index >= 0 &&
          stepperCtx.isReached(el) &&
          props.value.value,
      );
    };
    const isDisabled = () => Boolean(props.disabled.value);

    // Purely derived, read-only state: no matching `prop.*` declaration, so `bind()` is the
    // sole writer and can safely reflect `undefined` (removes the attribute) when this step
    // isn't nested inside an `ore-stepper` at all.
    bind({
      attr: {
        completed: () => (isCompleted() ? true : undefined),
        current: () => (isCurrent() ? true : undefined),
        index: () => {
          const index = stepIndex();

          return index >= 0 ? String(index + 1) : undefined;
        },
        navigable: () => (isNavigable() ? true : undefined),
        total: () => (stepperCtx ? String(totalSteps()) : undefined),
      },
    });

    // `color`/`size`/`orientation` double as regular, independently-settable props (for a step
    // rendered standalone) *and* stepper-inherited values: mirrors ore-tab-item's handling of
    // its own `color`/`size`/`variant` inheritance from `ore-tabs`. Only forcibly overwrite the
    // attribute when a parent context actually exists, so the plain prop reflection is left
    // alone otherwise.
    if (stepperCtx) {
      watchEffect(() => {
        const color = stepperCtx.color.value;
        const size = stepperCtx.size.value;
        const orientation = stepperCtx.orientation.value;

        if (color !== undefined) el.setAttribute('color', color);

        if (size !== undefined) el.setAttribute('size', size);

        el.setAttribute('orientation', orientation);
      });
    }

    const handleClick = () => stepperCtx?.select(props.value.value);

    const indicatorTemplate = () => html`
      <span class="indicator" part="indicator" aria-hidden="true">
        <span class="icon-slot" ?hidden="${() => !slots.has('icon').value}"><slot name="icon"></slot></span>
        ${() =>
          slots.has('icon').value
            ? ''
            : props.error.value
              ? html`
                  <ore-icon name="x" size="14" stroke-width="3"></ore-icon>
                `
              : isCompleted()
                ? html`
                    <ore-icon name="check" size="14" stroke-width="3"></ore-icon>
                  `
                : html`
                    <span class="number">${displayIndex}</span>
                  `}
      </span>
    `;

    const contentTemplate = () => html`
      <span class="content" part="content">
        <span class="label" part="label">
          <span class="label-text"><slot></slot></span>
          ${() =>
            props.optional.value
              ? html`
                  <span class="optional-hint"><slot name="optional">(optional)</slot></span>
                `
              : ''}
        </span>
        <slot name="status"></slot>
        <span class="description" part="description" ?hidden="${() => !slots.has('description').value}">
          <slot name="description"></slot>
        </span>
      </span>
    `;

    return html`
      <li class="step" role="listitem">
        <span class="connector connector-leading" part="connector" aria-hidden="true"></span>
        <span class="connector connector-trailing" part="connector" aria-hidden="true"></span>
        ${() =>
          isNavigable()
            ? html`
                <button
                  type="button"
                  class="control"
                  part="control"
                  aria-current="${() => (isCurrent() ? 'step' : null)}"
                  aria-disabled="${isDisabled}"
                  @click="${handleClick}">
                  ${indicatorTemplate()}${contentTemplate()}
                </button>
              `
            : html`
                <div class="control" part="control" aria-current="${() => (isCurrent() ? 'step' : null)}">
                  ${indicatorTemplate()}${contentTemplate()}
                </div>
              `}
      </li>
    `;
  },
  styles: [colorThemeMixin, touchTargetMixin, forcedColorsFocusMixin('button.control'), stepStyles],
});
