import {
  createContext,
  define,
  html,
  prop,
  bind,
  getHost,
  onCleanup,
  onMounted,
  provide,
  useEmit,
  useSlots,
} from '@vielzeug/ore';
import { computed, signal, watch, type Readable } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor } from '../../types';

import { createInteraction, createListControl, elementDirection, lifecycleSignal } from '../../headless';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { isStepNavigable } from './_is-step-navigable';
import componentStyles from './stepper.css?inline';

// ── Context ─────────────────────────────────────────────────────────────────
//
// ore-step derives all of its parent-relative state (current/completed/navigable/
// index/total/color/size/orientation) from this context instead of ore-stepper
// pushing 8 attributes onto every child on every change. Matches the
// provide()/inject() coordination already used by ore-tabs/ore-tab-item,
// ore-radio-group/ore-radio, and ore-list/ore-list-item — ore-stepper was
// previously the one outlier doing manual `querySelectorAll` + `setAttribute`
// fan-out, which meant every reactive change re-walked and re-wrote every step
// regardless of whether that step's own state actually changed.

/** Context provided by ore-stepper to its ore-step children. */
export type StepperContext = {
  clickable: Readable<boolean>;
  color: Readable<ThemeColor | undefined>;
  currentValue: Readable<string | undefined>;
  linear: Readable<boolean>;
  orientation: Readable<'horizontal' | 'vertical'>;
  size: Readable<ComponentSize | undefined>;
  /** Ordered `value`s of every sibling `ore-step`, used to derive index/total/completed. */
  stepValues: Readable<string[]>;
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
  /** Disables the whole stepper — no step is navigable regardless of `clickable` */
  disabled?: boolean;
  /** Accessible label for the nav landmark */
  label?: string;
  /**
   * Restricts navigation to completed steps and the current step — steps ahead of the
   * current one cannot be clicked or focused, even when `clickable` is set.
   */
  linear?: boolean;
  /** Layout orientation — 'horizontal' (default, desktop) or 'vertical' (compact/mobile-friendly) */
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
 * @attr {boolean} linear - Restrict navigation to completed + current steps only
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

    const getSteps = (): HTMLElement[] => Array.from(el.querySelectorAll(':scope > ore-step')) as HTMLElement[];

    const focusStep = (step: HTMLElement | undefined) => {
      step?.shadowRoot?.querySelector<HTMLElement>('button.control')?.focus();
    };

    // ────────────────────────────────────────────────────────────────
    // Selection State — mirrors ore-tabs' `selectedValue` signal + `ensureSelection()` pattern
    // ────────────────────────────────────────────────────────────────

    const currentValue = signal<string | undefined>(props.value.value);

    bind({ attr: { value: () => currentValue.value ?? null } });

    const setSelection = (value: string | undefined, shouldEmit = false) => {
      if (!value || value === currentValue.value) return;

      currentValue.value = value;

      if (shouldEmit) emit('change', { value });
    };

    const ensureSelection = () => {
      const steps = getSteps();

      if (steps.length === 0) return;

      const current = currentValue.value;
      const hasCurrent = current ? steps.some((s) => s.getAttribute('value') === current) : false;

      if (hasCurrent) return;

      const firstEnabled = steps.find((s) => !s.hasAttribute('disabled'))?.getAttribute('value') ?? undefined;

      if (firstEnabled) setSelection(firstEnabled);
    };

    watch(props.value, (value) => {
      currentValue.value = value;
      ensureSelection();
    });

    // ────────────────────────────────────────────────────────────────
    // Context provided to ore-step children
    // ────────────────────────────────────────────────────────────────

    const stepValues = computed(() => {
      void slots.elements().value;

      return getSteps().map((s) => s.getAttribute('value') ?? '');
    });

    provide(STEPPER_CTX, {
      clickable: computed(() => Boolean(props.clickable.value) && !props.disabled.value),
      color: props.color,
      currentValue,
      linear: computed(() => Boolean(props.linear.value)),
      orientation: computed(() => props.orientation.value ?? 'horizontal'),
      size: props.size,
      stepValues,
    });

    // Deferred to `onMounted()` (mirrors ore-tabs' `ensureSelection()` timing) rather than an
    // immediate `watch(stepValues, ...)` — `getSteps()` walks the *live* light DOM, and while the
    // browser is still parsing this element's `ore-step` children (synchronously upgrading each
    // one as its own tag is reached, which happens whenever `customElements.define()` already
    // ran before this markup was parsed — exactly what a sandboxed live-preview iframe does by
    // design), `stepValues` observes that child list mid-populate. Reading it eagerly here used
    // to call `ensureSelection()` — and therefore write `currentValue` — once per step as each
    // one was discovered, interleaved with that *same* step's own first render effect further
    // down the reactive graph. That reentrant write during a child's not-yet-finished initial
    // render corrupted its rendered output (the step's clickable/static control silently failed
    // to mount at all). Onmounted's callback runs on a microtask, strictly after the whole
    // synchronous parse (and thus every child) has completed, so `getSteps()` sees the final list.
    onMounted(() => ensureSelection());

    // ────────────────────────────────────────────────────────────────
    // Keyboard Navigation (roving tabindex over navigable steps)
    // ────────────────────────────────────────────────────────────────

    const getNavigableSteps = (): HTMLElement[] => {
      const steps = getSteps();
      const values = steps.map((s) => s.getAttribute('value') ?? '');
      const currentIndex = values.indexOf(currentValue.value ?? '');
      const clickable = Boolean(props.clickable.value) && !props.disabled.value;
      const linear = Boolean(props.linear.value);

      return steps.filter((step, index) =>
        isStepNavigable({
          disabled: step.hasAttribute('disabled'),
          index,
          linear,
          stepperClickable: clickable,
          stepperCurrentIndex: currentIndex,
        }),
      );
    };

    const listControl = createListControl({
      direction: () => elementDirection(el),
      getItems: getNavigableSteps,
      loop: false,
      onNavigate: (_action, index) => {
        const steps = getNavigableSteps();
        const nextStep = steps[index];

        // Select BEFORE focusing: changing `currentValue` re-renders each step's
        // control (the step's navigable/button node-slot depends on the current
        // index), which destroys the previously focused button. Ripple flushes
        // effects synchronously, so by the time focusStep() runs the replacement
        // button exists.
        const value = nextStep?.getAttribute('value');

        if (value) setSelection(value, true);

        focusStep(nextStep);
      },
      orientation: () => (props.orientation.value === 'vertical' ? 'vertical' : 'horizontal'),
      signal: lifecycleSignal(onCleanup),
    });

    const handleStepClick = (e: Event) => {
      const step = e
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'ore-step');

      if (!step || step.closest(STEPPER_TAG) !== el || !getNavigableSteps().includes(step)) return;

      const value = step.getAttribute('value');

      setSelection(value ?? undefined, true);
      // The click focused the step's old control; the selection re-render replaced
      // it — restore focus onto the new one (see onNavigate's ordering note).
      focusStep(step);
    };

    const activateFocusedStep = (): void => {
      const steps = getNavigableSteps();
      const focusedStep = steps.find(
        (step) => step === document.activeElement || step.shadowRoot?.activeElement === document.activeElement,
      );
      const value = focusedStep?.getAttribute('value');

      if (value) {
        setSelection(value, true);
        focusStep(focusedStep);
      }
    };

    const activationPress = createInteraction({ onPress: activateFocusedStep });

    const handleKeydown = (e: KeyboardEvent) => {
      const steps = getNavigableSteps();

      if (steps.length === 0) return;

      const path = e.composedPath();
      const stepFromEvent = path.find(
        (node): node is HTMLElement => node instanceof HTMLElement && node.localName === 'ore-step',
      );
      const focused = stepFromEvent ? steps.indexOf(stepFromEvent) : -1;

      if (focused >= 0) listControl.set(focused);

      if (listControl.handleKeydown(e)) return;

      activationPress.handleKeydown(e);
    };

    bind({
      on: {
        click: handleStepClick,
        keydown: handleKeydown,
      },
    });

    return html`
      <nav part="nav" :aria-label="${props.label}">
        <ol class="steps" role="list" part="list">
          <slot></slot>
        </ol>
      </nav>
    `;
  },
  styles: [componentStyles],
});
