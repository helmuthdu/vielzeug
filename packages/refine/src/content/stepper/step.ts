import { bind, define, getHost, html, inject, prop, useSlots, watchEffect } from '@vielzeug/ore';

import type { ComponentSize, ThemeColor } from '../../types';

import '../icon/icon';
import { disablableBundle } from '../../shared';
import { coarsePointerMixin, colorThemeMixin, forcedColorsFocusMixin } from '../../styles';
import { isStepNavigable } from './_is-step-navigable';
import stepStyles from './step.css?inline';
import { STEPPER_CTX } from './stepper';

export type OreStepProps = {
  /**
   * Theme color. Inherited from the parent `ore-stepper` when nested inside one (overrides
   * this value); only takes effect on its own when `ore-step` is rendered standalone.
   */
  color?: ThemeColor;
  /** Disables this step — it cannot be navigated to and is skipped by keyboard navigation. */
  disabled?: boolean;
  /** Marks this step as failed/invalid. Overrides the completed/current indicator visuals. */
  error?: boolean;
  /**
   * Marks this step as optional. Renders a small "(optional)" hint next to the label.
   * Purely presentational — has no effect on navigation.
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
 * this step's current/completed/navigable/index/total state via context — those are derived,
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
 *
 * @part control - Clickable (or static) root element for the step
 * @part indicator - Circular indicator holding the number/icon
 * @part content - Wrapper around the label and description
 * @part label - Step label element
 * @part description - Step description element
 * @part connector - Connector line segments (leading and trailing halves) either side of this step's indicator
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
    color: prop.string<ThemeColor>(),
    error: prop.bool(false),
    optional: prop.bool(false),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    size: prop.string<ComponentSize>(),
    value: prop.string(''),
  },
  setup(props) {
    const el = getHost();
    const slots = useSlots();
    const stepperCtx = inject(STEPPER_CTX);

    // ────────────────────────────────────────────────────────────────
    // State derived from the parent ore-stepper's context — see stepper.ts's
    // module doc comment for why this replaced parent-side attribute fan-out.
    // ────────────────────────────────────────────────────────────────

    // Plain functions, not `computed()` — every one of these ultimately reads
    // `stepperCtx.stepValues`/`stepperCtx.currentValue`, which are themselves `computed()`s
    // owned by the parent `ore-stepper`. Wrapping a *child* `computed()` around a *parent*
    // `computed()` (a computed-to-computed dependency crossing a `provide()`/`inject()`
    // boundary) is exactly the shape that surfaced two related bugs: a step's `completed`/
    // `current` attributes going permanently stale after a few rapid selections, and — worse —
    // a step's entire clickable/static control silently failing to render at all when its
    // `ore-step` tag upgrades before its siblings exist in the light DOM yet (true whenever
    // `ore-step`/`ore-stepper` are already `customElements.define()`d before this markup is
    // parsed, e.g. every sandboxed live-preview iframe). Reading straight through to the
    // parent's computeds on every call — no intermediate computed layer of our own to go
    // stale — made both disappear. Cheap enough to not need memoizing (a couple of `indexOf`/
    // comparisons over an already-memoized parent computed).
    const stepIndex = (): number => (stepperCtx ? stepperCtx.stepValues.value.indexOf(props.value.value) : -1);
    const totalSteps = (): number => stepperCtx?.stepValues.value.length ?? 0;
    const currentIndex = (): number =>
      stepperCtx ? stepperCtx.stepValues.value.indexOf(stepperCtx.currentValue.value ?? '') : -1;
    // 1-based, always-sane values for on-screen text (the step number badge, the sr-only
    // "Step X of Y" label) — falls back to "1 of 1" when rendered standalone with no parent
    // `ore-stepper` to derive a real position from. Kept separate from the `index`/`total`
    // *attributes* below, which correctly reflect nothing at all in that same standalone case.
    const displayIndex = (): number => {
      const index = stepIndex();

      return index >= 0 ? index + 1 : 1;
    };
    const displayTotal = (): number => totalSteps() || 1;

    const isCurrent = (): boolean => {
      const index = stepIndex();
      const current = currentIndex();

      return index >= 0 && index === current;
    };
    // Purely positional — intentionally NOT gated on `props.error.value`. This also drives the
    // `completed` *attribute* below, which `step.css` uses to color both connector segments
    // either side of the indicator (`:host([completed]) .connector`); every *consumer* of this
    // (the icon choice, the sr-only state label) already checks `error` first and short-circuits
    // before it matters, so folding `!error` in here too would only end up suppressing
    // `[completed]` on an error step that's before the current one — breaking the connector
    // color chain right at that step instead of just swapping its icon.
    const isCompleted = (): boolean => {
      const index = stepIndex();
      const current = currentIndex();

      return index >= 0 && current >= 0 && index < current;
    };
    const isNavigable = (): boolean => {
      const index = stepIndex();
      const current = currentIndex();

      return (
        !!stepperCtx &&
        isStepNavigable({
          disabled: props.disabled.value === true,
          index,
          linear: stepperCtx.linear.value,
          stepperClickable: stepperCtx.clickable.value,
          stepperCurrentIndex: current,
        })
      );
    };
    const isDisabled = () => Boolean(props.disabled.value);

    // Purely derived, read-only state — no matching `prop.*` declaration, so `bind()` is the
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
    // rendered standalone) *and* stepper-inherited values — mirrors ore-tab-item's handling of
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

    const stateLabel = (): string | undefined => {
      if (props.error.value) return 'error';

      if (isCompleted()) return 'completed';

      if (isCurrent()) return 'current step';

      return undefined;
    };

    const positionLabel = () => `Step ${displayIndex()} of ${displayTotal()}`;
    const srLabel = () => {
      const state = stateLabel();

      return state ? `${positionLabel()}, ${state}` : positionLabel();
    };

    const handleClick = (event: MouseEvent) => {
      event.stopPropagation();

      if (!isNavigable()) {
        event.preventDefault();

        return;
      }

      el.dispatchEvent(new CustomEvent('click', { bubbles: true, detail: { value: props.value.value } }));
    };

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
        <span class="sr-only">${srLabel}</span>
        <span class="label" part="label">
          <span class="label-text"><slot></slot></span>
          ${() =>
            props.optional.value
              ? html`
                  <span class="optional-hint">(optional)</span>
                `
              : ''}
        </span>
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
                  tabindex="${() => (isCurrent() ? '0' : '-1')}"
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
  styles: [colorThemeMixin, coarsePointerMixin, forcedColorsFocusMixin('button.control'), stepStyles],
});
