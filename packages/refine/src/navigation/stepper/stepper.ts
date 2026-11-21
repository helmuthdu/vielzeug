import { bind, createContext, define, getHost, html, onMounted, prop, provide, useEmit, useSlots } from '@vielzeug/ore';
import { computed, type Readable, signal, watch } from '@vielzeug/ripple';
import { warn } from '../../_dev';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import type { ComponentSize, ThemeColor } from '../../types';
import componentStyles from './stepper.css?inline';

/** Context provided by ore-stepper to its ore-step children. */
export type StepperContext = {
  clickable: Readable<boolean>;
  color: Readable<ThemeColor | undefined>;
  currentValue: Readable<string | undefined>;
  isReached: (step: HTMLElement) => boolean;
  orientation: Readable<'horizontal' | 'vertical'>;
  select: (value: string) => void;
  size: Readable<ComponentSize | undefined>;
  /** Ordered `value`s of every sibling `ore-step`, used to derive index/total/completed. */
  stepValues: Readable<string[]>;
  valid: Readable<boolean>;
};
/** Injection key for the stepper context. */
export const STEPPER_CTX = createContext<StepperContext>('StepperContext');

export type OreStepperEvents = {
  change: { value: string };
};

export type OreStepperProps = {
  /** When true, steps are clickable/keyboard-focusable for navigation. Default: display-only progress. */
  clickable?: boolean;
  /** Theme color for the current/completed step indicators */
  color?: ThemeColor;
  /** Disables the whole stepper: no step is navigable regardless of `clickable` */
  disabled?: boolean;
  /** Accessible label for the nav landmark */
  label?: string;
  /**
   * Restricts navigation to steps reached by a selection.
   */
  linear?: boolean;
  /** Layout orientation: 'horizontal' (default, desktop) or 'vertical' (compact/mobile-friendly) */
  orientation?: 'horizontal' | 'vertical';
  /** Component size */
  size?: ComponentSize;
  /** The `value` of the currently active `ore-step` */
  value?: string;
};

/**
 * Displays progress through a sequence of numbered steps. Manages step selection and provides
 * shared state (current value, clickability, theming) to its `ore-step` children via context.
 * Can be purely informational (progress display) or interactive navigation.
 *
 * @element ore-stepper
 * @element ore-step - Child element for each step (auto-discovered)
 *
 * @attr {string} value - The value of the currently active step
 * @attr {boolean} clickable - Allow clicking/focusing steps to navigate
 * @attr {boolean} linear - Restrict navigation to reached steps
 * @attr {boolean} disabled - Disables the whole stepper
 * @attr {string} orientation - 'horizontal' (default) | 'vertical'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} label - Accessible nav landmark label (default: 'Progress')
 *
 * @fires change - Emitted when the active step changes via click/keyboard. detail: { value: string }
 *
 * @slot - `ore-step` elements
 *
 * @cssprop --stepper-connector-color - Color of the connector line between steps
 * @cssprop --stepper-connector-size - Thickness of the connector line
 * @cssprop --stepper-gap - Gap between steps
 *
 * @part nav - Navigation landmark element
 * @part list - Ordered list container holding the slotted steps
 *
 * @example
 * ```html
 * <!-- Display-only progress -->
 * <ore-stepper value="shipping" color="primary">
 *   <ore-step value="cart">Cart</ore-step>
 *   <ore-step value="shipping">Shipping</ore-step>
 *   <ore-step value="payment">Payment</ore-step>
 * </ore-stepper>
 *
 * <!-- Clickable navigation, mobile-friendly vertical layout -->
 * <ore-stepper value="shipping" clickable linear orientation="vertical">
 *   <ore-step value="cart">Cart</ore-step>
 *   <ore-step value="shipping">Shipping</ore-step>
 *   <ore-step value="payment" disabled>Payment</ore-step>
 * </ore-stepper>
 * ```
 */
export const STEPPER_TAG = 'ore-stepper' as const;
define<OreStepperProps>(STEPPER_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    clickable: prop.bool(false),
    label: prop.string('Progress'),
    linear: prop.bool(false),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    value: prop.string(),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreStepperEvents>();
    const slots = useSlots();

    const getSteps = () => Array.from(el.querySelectorAll<HTMLElement>(':scope > ore-step'));

    const currentValue = signal<string | undefined>(props.value.value);
    const reached = signal<Set<HTMLElement>>(new Set());
    const revision = signal(0);
    const valid = signal(true);
    let hadSteps = false;

    bind({ attr: { value: () => currentValue.value ?? null } });

    const setSelection = (value: string | undefined, shouldEmit = false) => {
      if (value) {
        const steps = getSteps();
        const index = steps.findIndex((step) => step.getAttribute('value') === value);

        if (index >= 0 && (value !== currentValue.value || !reached.value.has(steps[index]))) {
          reached.value = new Set([...reached.value, ...steps.slice(0, index + 1)]);
        }
      }
      if (value === currentValue.value) return;

      currentValue.value = value;

      if (shouldEmit && value) emit('change', { value });
    };

    const ensureSelection = () => {
      const steps = getSteps();

      if (steps.length === 0) {
        valid.value = true;
        if (hadSteps) setSelection(undefined);
        reached.value = new Set();
        return;
      }
      hadSteps = true;
      const values = steps.map((step) => step.getAttribute('value'));
      const validValues = values.every((value) => Boolean(value?.trim())) && new Set(values).size === values.length;
      valid.value = validValues;
      if (!validValues) {
        warn('ore-stepper requires each step to have a unique, non-empty value.');
        return;
      }
      if ([...reached.value].some((step) => !steps.includes(step))) {
        reached.value = new Set([...reached.value].filter((step) => steps.includes(step)));
      }

      const current = currentValue.value;
      const hasCurrent = current ? steps.some((s) => s.getAttribute('value') === current) : false;

      if (hasCurrent) {
        setSelection(current);
        return;
      }

      const firstEnabled = steps
        .find((s) => !s.hasAttribute('disabled') && s.getAttribute('value'))
        ?.getAttribute('value');

      setSelection(firstEnabled ?? undefined);
    };

    watch(props.value, (value) => {
      setSelection(value);
      ensureSelection();
    });

    const stepValues = computed(() => {
      void slots.elements().value;
      void revision.value;

      return getSteps().map((s) => s.getAttribute('value') ?? '');
    });

    provide(STEPPER_CTX, {
      clickable: computed(() => Boolean(props.clickable.value) && !props.disabled.value),
      color: props.color,
      currentValue,
      isReached: (step) => !props.linear.value || reached.value.has(step),
      orientation: computed(() => props.orientation.value ?? 'horizontal'),
      select: (value) => setSelection(value, true),
      size: props.size,
      stepValues,
      valid,
    });

    onMounted(() => {
      ensureSelection();
      const observer = new MutationObserver((mutations) => {
        if (
          !mutations.some((mutation) =>
            mutation.type === 'childList' ? mutation.target === el : mutation.target.parentNode === el,
          )
        )
          return;
        revision.value++;
        ensureSelection();
      });
      observer.observe(el, {
        attributeFilter: ['value', 'disabled'],
        attributes: true,
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    });

    return html`
      <nav part="nav" aria-label="${props.label}">
        <ol class="steps" role="list" part="list">
          <slot></slot>
        </ol>
      </nav>
    `;
  },
  styles: [componentStyles],
});
