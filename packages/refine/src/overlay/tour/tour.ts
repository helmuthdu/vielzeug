import { autoUpdate, type Placement, type ReferenceElement, type VirtualReference } from '@vielzeug/orbit';
import {
  define,
  getHost,
  html,
  onCleanup,
  onEvent,
  onMounted,
  prop,
  ref,
  useEmit,
  useSlots,
  when,
} from '@vielzeug/ore';
import { computed, fromSubscribable, type Readable, signal, watch } from '@vielzeug/ripple';
import { createMediaQuery, SentinelUnavailableError } from '@vielzeug/sentinel';

import {
  createDropdownPositioner,
  type DialogCloseReason,
  elementDirection,
  type OverlayOpenChangeDetail,
  parseOptionalBool,
} from '../../core';
import { reducedMotionMixin } from '../../styles';
import { useDialogControl } from '../shared/use-dialog';
import type { SpotlightRect } from '../spotlight/spotlight';

import componentStyles from './tour.css?inline';

// The child components this card renders. The bare-import form is not enough:
// the per-entry library build drops side-effect-only imports between entry
// modules, so these re-export the tags as bindings: the bundler keeps the
// module link, and importing `@vielzeug/refine/tour` registers
// ore-button, ore-icon, ore-progress and ore-spotlight on its own.

export { ICON_TAG } from '../../content/icon/icon';
export { PROGRESS_TAG } from '../../feedback/progress/progress';
export { BUTTON_TAG } from '../../inputs/button/button';
export { SPOTLIGHT_TAG } from '../spotlight/spotlight';

// ── Types ─────────────────────────────────────────────────────────────────────

export const TOUR_PRESENTATIONS = ['auto', 'bottom-sheet', 'modal', 'popover'] as const;
export type TourPresentation = (typeof TOUR_PRESENTATIONS)[number];

/**
 * What the card anchors to: a real element, an Orbit virtual reference, or a
 * plain viewport-space rectangle (the shape `@vielzeug/beacon` publishes).
 */
export type TourAnchor = ReferenceElement | SpotlightRect;

/** All rendered labels, each with an English default: pass translated strings for other locales. */
export type OreTourLabels = Partial<{
  back: string;
  close: string;
  finish: string;
  next: string;
  skip: string;
  /** Progress text; `{current}` and `{total}` are replaced with the 1-based numbers. */
  stepOf: string;
}>;

export type OreTourEvents = {
  /** The Back action was requested. */
  back: undefined;
  /**
   * The card asked to be closed (close button, Escape, or backdrop click).
   * In popover mode the card never closes itself: set `open` to false (or
   * dismiss the tour) in response. In dialog presentations the dialog has
   * already closed by the time this fires: sync `open` to false.
   */
  dismiss: { reason: DialogCloseReason };
  /** The advance button was pressed on the final step. */
  finish: undefined;
  /** The Next action was requested. */
  next: undefined;
  /** The open state changed. */
  'open-change': OverlayOpenChangeDetail;
  /** The Skip action was requested. */
  skip: undefined;
};

/**
 * The step snapshot {@link OreTourElement.bind} renders. `@vielzeug/beacon`'s
 * `BeaconCurrentStep` satisfies this shape, and so does any app-owned state
 * with the same fields: the card never imports the engine, it consumes the
 * structure.
 */
export type TourStepSnapshot = {
  /** Anchor side; `'auto'` maps to the card's default placement. */
  readonly placement?: string;
  /** Card presentation; unknown values fall back to `'auto'`. */
  readonly presentation?: string;
  /** Anchor rect in viewport space, or `null` to center/dock the card. */
  readonly rect?: SpotlightRect | null;
  /** The step to render; `null` means the card should be closed. */
  readonly step?: { readonly description?: string; readonly title?: string } | null;
  readonly stepIndex: number;
  readonly totalSteps: number;
};

/**
 * The controller shape {@link OreTourElement.bind} drives: a live snapshot plus
 * the actions the card's buttons request. A `@vielzeug/beacon` tour handle
 * satisfies it in full; a coachmark handle satisfies it through `current` and
 * `dismiss` (its missing step actions fall back to `dismiss`).
 */
export type TourController = {
  back?(): void;
  readonly current: Readable<TourStepSnapshot>;
  dismiss(): void;
  finish?(): void;
  next?(): void;
  skip?(): void;
};

/** The typed surface of an `ore-tour` element: every prop as a property, plus {@link OreTourElement.bind}. */
export interface OreTourElement extends HTMLElement {
  anchor: TourAnchor | null;
  /**
   * Renders a controller's snapshot into the card and routes the card's
   * actions back into it: one call replaces the prop-writing/event-listening
   * bridge. Returns an unsubscribe; the binding also releases when the card
   * disconnects. Binding a second controller replaces the first.
   */
  bind(controller: TourController): () => void;
  description: string | undefined;
  dismissible: boolean;
  'initial-focus': string | undefined;
  labels: Partial<OreTourLabels> | undefined;
  offset: number;
  open: boolean | undefined;
  persistent: boolean;
  placement: Placement;
  presentation: TourPresentation;
  'return-focus': boolean;
  spotlight: boolean;
  'step-index': number;
  /** Card title; the empty string means "no title" (ore writes '' for an unset prop). */
  title: string;
  'total-steps': number;
}

export type OreTourProps = {
  /** What the card anchors to in popover mode: an element, a virtual reference, or a viewport-space rect. Omit to dock the card at the bottom center. */
  anchor?: TourAnchor | null;
  /** Body text; the default slot replaces it with custom content. */
  description?: string;
  /** Show a close (×) button in the header. Defaults to true. */
  dismissible?: boolean;
  /** CSS selector for the element inside the card that should receive focus when it opens (dialog presentations only). */
  'initial-focus'?: string;
  /** All rendered labels, each with an English default. */
  labels?: OreTourLabels;
  /** Gap in px between anchor and card in popover mode. Defaults to 8. */
  offset?: number;
  /** Controlled open state. The card never opens or closes itself: react to `next`/`back`/`skip`/`finish`/`dismiss` and drive this prop. */
  open?: boolean;
  /** When true, Escape and backdrop clicks do not request dismissal. */
  persistent?: boolean;
  /** Preferred placement in popover mode (Orbit placement). Defaults to 'bottom'. */
  placement?: Placement;
  /** How the card presents. 'auto' picks bottom-sheet on narrow viewports and popover otherwise. */
  presentation?: TourPresentation;
  /** When true (default), focus returns to the previously focused element after the card closes. */
  'return-focus'?: boolean;
  /** Dim the page around `anchor` with an `ore-spotlight` cutout. Defaults to false. */
  spotlight?: boolean;
  /** Zero-based index of the current step. With `total-steps` it drives the progress bar and the Back/Finish buttons. */
  'step-index'?: number;
  /** Card title. */
  title?: string;
  /** Total number of steps; 0 (default) hides the progress bar and the step text. */
  'total-steps'?: number;
};

const DEFAULT_LABELS = {
  back: 'Back',
  close: 'Close tour',
  finish: 'Finish',
  next: 'Next',
  skip: 'Skip',
  stepOf: 'Step {current} of {total}',
};

/** Below this viewport width, `presentation="auto"` resolves to a bottom sheet. */
const NARROW_QUERY = '(max-width: 640px)';

function toReference(anchor: TourAnchor | null | undefined): ReferenceElement | null {
  if (!anchor) return null;
  if (anchor instanceof Element) return anchor;
  if (typeof (anchor as VirtualReference).getBoundingClientRect === 'function') return anchor as VirtualReference;
  const rect = anchor as SpotlightRect;
  // A zero-size rect would position the card against an invisible point.
  if (!(rect.width > 0) || !(rect.height > 0)) return null;

  return { getBoundingClientRect: () => rect };
}

/**
 * The step card of a product tour: a compact dialog with title, body, progress,
 * and Skip / Back / Next actions (Skip leads the row, away from Next).
 *
 * The card is deliberately dumb: it owns no step logic and no persistence. It
 * renders the step the app hands it and emits `next` / `back` / `skip` /
 * `finish` / `dismiss`; a `@vielzeug/beacon` tour handle (or any state the app
 * already keeps) decides what happens. `bind(handle)` wires both directions in
 * one call, or the app drives the `open`, `title`, `description`,
 * `step-index`, and `anchor` props and listens to the events itself.
 *
 * Presentations: `popover` anchors the card to `anchor` with an Orbit
 * positioner in the Popover API top layer; `modal` and `bottom-sheet` render a
 * native `<dialog>` (centered panel or bottom-anchored sheet) with the
 * standard focus trap and background lock; `auto` picks bottom-sheet on narrow
 * viewports and popover otherwise.
 *
 * Keyboard: Escape requests dismissal (native in dialog presentations, keydown
 * in popover mode); ArrowLeft / ArrowRight emit `back` / `next` while open.
 *
 * @element ore-tour
 *
 * @method bind - Render a controller (e.g. a `@vielzeug/beacon` handle) into the
 *   card and route the card's actions back into it. Returns an unsubscribe.
 *
 * @attr {object} anchor - Anchor element, virtual reference, or viewport-space rect (popover mode)
 * @attr {string} description - Body text (replaced by the default slot)
 * @attr {boolean} dismissible - Show a close (×) button (default true)
 * @attr {string} initial-focus - Selector for the element to focus on open (dialog presentations)
 * @attr {number} offset - Anchor gap in px (popover mode, default 8)
 * @attr {boolean} open - Controlled open state
 * @attr {boolean} persistent - Escape/backdrop do not request dismissal
 * @attr {string} placement - Popover placement (default 'bottom')
 * @attr {string} presentation - 'auto' (default) | 'bottom-sheet' | 'modal' | 'popover'
 * @attr {boolean} return-focus - Restore focus after the card closes (default true)
 * @attr {boolean} spotlight - Dim the page around the anchor with an ore-spotlight cutout
 * @attr {number} step-index - Zero-based current step (default 0)
 * @attr {string} title - Card title
 * @attr {number} total-steps - Total steps; >0 shows the progress bar and step counter
 *
 * @fires back - Back was requested.
 * @fires dismiss - Close was requested. detail: { reason }
 * @fires finish - Advance was pressed on the final step.
 * @fires next - Next was requested.
 * @fires open-change - Open state changed. detail: { open, reason }
 * @fires skip - Skip was requested.
 *
 * @slot media - Full-bleed media above the copy: an img, picture, video, or svg
 * @slot - Body content (replaces `description`)
 * @slot footer - Custom footer actions (replaces Skip/Back/Next)
 *
 * @cssprop --tour-bg - Card background color
 * @cssprop --tour-border-color - Card border color
 * @cssprop --tour-max-width - Card max width (default 22rem)
 * @cssprop --tour-media-max-height - Media ceiling (default min(38dvh, 16rem); bottom-sheet min(26dvh, 12rem))
 * @cssprop --tour-panel-blur - Backdrop blur behind the translucent card (default var(--blur-md))
 * @cssprop --tour-radius - Card border radius
 * @cssprop --tour-shadow - Card drop shadow
 *
 * @part dialog - Native dialog root (dialog presentations).
 * @part overlay - Dialog backdrop element.
 * @part float - Popover-mode panel.
 * @part panel - Dialog-mode panel.
 * @part card - Card container inside either panel.
 * @part media - Full-bleed media region above the copy (hidden while the slot is empty).
 * @part header - Header container.
 * @part title - Title text element.
 * @part step-count - Visible "Step N of M" label beside the progress bar.
 * @part close - Close action control.
 * @part body - Body content container.
 * @part footer - Footer container.
 *
 * @example
 * ```html
 * <ore-tour open title="Welcome" description="Start here." step-index="0" total-steps="3"></ore-tour>
 * <script type="module">
 *   import '@vielzeug/refine/tour';
 *   const card = document.querySelector('ore-tour');
 *   card.anchor = document.querySelector('#save-button');
 *   card.addEventListener('next', () => console.log('advance'));
 * </script>
 * ```
 */
export const TOUR_TAG = 'ore-tour' as const;
define<OreTourProps>(TOUR_TAG, {
  props: {
    anchor: prop.data<TourAnchor | null>(null),
    description: prop.string(),
    dismissible: prop.bool(true),
    'initial-focus': prop.string(),
    labels: prop.data<Partial<OreTourLabels>>({}),
    offset: prop.number(8),
    open: { default: undefined as boolean | undefined, parse: parseOptionalBool },
    persistent: prop.bool(false),
    placement: prop.oneOf(
      [
        'bottom',
        'bottom-end',
        'bottom-start',
        'left',
        'left-end',
        'left-start',
        'right',
        'right-end',
        'right-start',
        'top',
        'top-end',
        'top-start',
      ] as const,
      'bottom',
    ),
    presentation: prop.oneOf(TOUR_PRESENTATIONS, 'auto'),
    'return-focus': prop.bool(true),
    spotlight: prop.bool(false),
    'step-index': prop.number(0),
    title: prop.string(),
    'total-steps': prop.number(0),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreTourEvents>();
    const slots = useSlots();

    const dialogRef = ref<HTMLDialogElement>();
    const floatRef = ref<HTMLElement>();

    const isOpen = computed(() => props.open.value === true);

    // ── Presentation resolution ──────────────────────────────────────────────
    const narrow = signal(false);

    // Created during setup (not onMounted) so the first `auto` resolution, which
    // can happen while props are already set at parse time, sees the real
    // viewport state rather than the default.
    try {
      const mediaHandle = createMediaQuery(NARROW_QUERY);
      const syncMedia = (state: ReturnType<typeof mediaHandle.getSnapshot> | undefined): void => {
        if (state) narrow.value = state.matches;
      };

      syncMedia(mediaHandle.getSnapshot());

      const mediaWatch = watch(fromSubscribable(mediaHandle, { signal: mediaHandle.disposalSignal }), syncMedia);

      onCleanup(() => {
        mediaWatch.dispose();
        mediaHandle.dispose();
      });
    } catch (error) {
      if (!(error instanceof SentinelUnavailableError)) throw error;
    }

    // `auto` tracks the viewport while the card is closed and freezes on the
    // open edge: a resize that crosses the narrow threshold must not rebuild a
    // live card out from under the user (a modal popping mid-step is the worst
    // failure mode). An explicit `presentation` write always takes effect, even
    // mid-open.
    const latchedPresentation = signal<TourPresentation>('popover');
    let wasOpen = false;

    watch(
      () => [isOpen.value, narrow.value] as const,
      ([open, isNarrow]) => {
        if (!open || !wasOpen) {
          latchedPresentation.value = isNarrow ? 'bottom-sheet' : 'popover';
        }

        wasOpen = open;
      },
      { immediate: true },
    );

    const resolvedPresentation = computed<TourPresentation>(() => {
      const presentation = props.presentation.value ?? 'auto';

      return presentation === 'auto' ? latchedPresentation.value : presentation;
    });

    // Exactly one presentation is live at a time: the dialog owns the open
    // state while a dialog presentation is active, the popover panel otherwise.
    const dialogMode = computed(() => isOpen.value && resolvedPresentation.value !== 'popover');
    const popoverMode = computed(() => isOpen.value && resolvedPresentation.value === 'popover');

    // A presentation flip (welcome modal -> anchored popover, or an explicit
    // `presentation` write) closes the dialog while the tour stays open. The
    // popover takes focus immediately, but the dialog's focus-restore lands
    // after its exit animation (~200ms later) and would yank focus back to the
    // pre-modal element, stranding keyboard control on <body>. While a popover
    // presentation is live, the restore must not run.
    const returnFocus = computed(() => (popoverMode.value ? false : props['return-focus'].value));

    // ── Spotlight rect ────────────────────────────────────────────────────────
    const spotlightRect = signal<SpotlightRect | null>(null);

    const refreshSpotlight = (): void => {
      const anchor = props.anchor.value;

      if (!isOpen.value || !anchor) {
        spotlightRect.value = null;

        return;
      }

      // Element anchors measure live: the cutout follows the element wherever
      // the page has scrolled it, not just where a published rect last said.
      const rect =
        anchor instanceof Element
          ? anchor.getBoundingClientRect()
          : typeof (anchor as VirtualReference).getBoundingClientRect === 'function'
            ? (anchor as VirtualReference).getBoundingClientRect()
            : (anchor as SpotlightRect);

      spotlightRect.value = rect.width > 0 && rect.height > 0 ? rect : null;
    };

    // ── Popover presentation ─────────────────────────────────────────────────
    const positioner = createDropdownPositioner({
      // The anchor can be a plain rect (not an Element), so direction must be
      // resolved from the host rather than from the reference itself.
      getDir: () => elementDirection(el),
      getFloating: () => floatRef.value ?? null,
      getOffsetPx: () => props.offset.value ?? 8,
      getPlacement: () => props.placement.value ?? 'bottom',
      // The positioner only measures the reference (getBoundingClientRect) and, with
      // getDir supplied, never walks it as an Element: a VirtualReference/rect fits
      // every code path despite the narrower option signature.
      getReference: () => toReference(props.anchor.value) as HTMLElement | null,
      matchWidth: false,
      padding: 8,
      shiftMainAxis: true,
      useClippingAncestor: false,
    });

    let stopAutoUpdate: (() => void) | null = null;
    let popoverWasOpen = false;
    let restoreFocusTo: HTMLElement | null = null;

    const closePopover = (): void => {
      const panel = floatRef.value;

      if (panel) {
        delete panel.dataset.open;

        if ('hidePopover' in panel) {
          try {
            if (panel.matches(':popover-open')) panel.hidePopover();
          } catch {
            // Popover API restricted; data-open removal handles visibility.
          }
        }
      }

      stopAutoUpdate?.();
      stopAutoUpdate = null;
      restoreFocusTo?.focus();
      restoreFocusTo = null;
      emit('open-change', { open: false, reason: 'programmatic' });
    };

    const openPopover = (): boolean => {
      const panel = floatRef.value;

      if (!panel) return false;

      panel.dataset.open = '';
      panel.toggleAttribute('data-anchored', toReference(props.anchor.value) !== null);

      if ('showPopover' in panel) {
        try {
          if (!panel.matches(':popover-open')) panel.showPopover();
        } catch {
          // Popover API restricted (e.g. sandboxed iframe); data-open CSS fallback handles visibility.
        }
      }

      positioner.update();

      const reference = toReference(props.anchor.value);

      stopAutoUpdate = reference ? autoUpdate(reference, panel, () => positioner.update()) : null;

      restoreFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      panel.focus();
      emit('open-change', { open: true, reason: 'programmatic' });

      return true;
    };

    // One effect drives both presentations. Watching the refs as well matters:
    // a mode flip that happens before the panel elements exist (open set at
    // parse time) must re-run once they mount, not be lost.
    watch(
      () => [dialogMode.value, popoverMode.value, floatRef.value, dialogRef.value] as const,
      () => {
        const show = popoverMode.value;

        if (show && !popoverWasOpen) {
          // openPopover needs the mounted panel: if it isn't there yet, stay
          // un-latched so the ref arriving re-runs this effect and opens.
          popoverWasOpen = openPopover();
        } else if (!show && popoverWasOpen) {
          popoverWasOpen = false;
          closePopover();
        }

        refreshSpotlight();
      },
    );

    onCleanup(() => {
      stopAutoUpdate?.();
      stopAutoUpdate = null;
    });

    watch(
      () => props.anchor.value,
      () => {
        if (popoverWasOpen) positioner.update();

        refreshSpotlight();
      },
    );

    // Element anchors have no change signal: while the spotlight is up, scroll
    // and resize keep the cutout glued to the element. Immediate because the
    // anchor is usually set before this watcher exists; the stop function lives
    // outside the callback because the watcher can fire after setup is gone.
    let stopAnchorTracking: (() => void) | null = null;

    watch(
      () => isOpen.value && props.spotlight.value === true && props.anchor.value instanceof Element,
      (tracking) => {
        if (!tracking) {
          stopAnchorTracking?.();
          stopAnchorTracking = null;

          return;
        }

        if (stopAnchorTracking) return;

        const update = (): void => refreshSpotlight();

        window.addEventListener('scroll', update, { capture: true, passive: true });
        window.addEventListener('resize', update, { passive: true });

        stopAnchorTracking = () => {
          window.removeEventListener('scroll', update, { capture: true });
          window.removeEventListener('resize', update);
        };
      },
      { immediate: true },
    );

    onCleanup(() => {
      stopAnchorTracking?.();
      stopAnchorTracking = null;
    });

    // ── Dialog presentations (modal / bottom-sheet) ──────────────────────────
    const { closeWithAnimation, handleBackdropClick, overlay, requestClose, mount } = useDialogControl({
      defaultOpen: computed(() => false),
      dialogRef,
      getPanelEl: () => dialogRef.value?.querySelector<HTMLElement>('.panel'),
      host: el,
      initialFocus: props['initial-focus'],
      isPersistent: () => Boolean(props.persistent.value),
      onCleanup,
      onEvent,
      // The native dialog has already closed by this point: report the state
      // change and the dismissal request together so the app syncs `open`.
      onNativeClose: (reason) => {
        emit('open-change', { open: false, reason });
        // A programmatic close is not a dismissal: it fires when the resolved
        // presentation flips (e.g. `auto` switching bottom-sheet → popover on a
        // resize), which closes the dialog without the user asking. Only surface
        // `dismiss` for genuine user actions (close button, Escape, backdrop).
        if (reason !== 'programmatic') emit('dismiss', { reason });
        // Closing a modal dialog also makes the browser restore focus to the
        // element focused before showModal — to <body> when a tour
        // auto-started with nothing focused. That restore is queued as a task
        // and cannot be suppressed (`return-focus: false` only gates this
        // component's own restore). When the close was a flip into a popover,
        // focus the panel one task later — after the restore has landed. The
        // inside check is skipped here on purpose: at this instant focus is
        // still on the just-closed dialog, and the restore is about to move it
        // to the page; only a re-focus on the panel keeps the hosted arrow and
        // Escape keys alive for the rest of the tour.
        if (popoverMode.value) {
          setTimeout(() => {
            if (isOpen.value && popoverMode.value) floatRef.value?.focus();
          }, 0);
        }
      },
      onOpen: (reason) => emit('open-change', { open: true, reason }),
      // Controlled by the resolved presentation, not the raw prop: the card
      // never decides its own presentation.
      openProp: dialogMode,
      performClose: () => {
        closeWithAnimation();
      },
      returnFocus,
    });

    onMounted(() => {
      const dialog = dialogRef.value;

      if (!dialog) return;

      mount();
      onEvent(dialog, 'click', handleBackdropClick);

      return () => {
        overlay.dispose();
      };
    });

    // ── Keyboard ──────────────────────────────────────────────────────────────
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;

      const tag = target.tagName;

      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    onEvent(el, 'keydown', (e) => {
      if (!isOpen.value || isTypingTarget(e.target)) return;

      if (e.key === 'Escape' && popoverMode.value && !props.persistent.value) {
        emit('dismiss', { reason: 'escape' });
      } else if (e.key === 'ArrowRight') {
        emit('next');
      } else if (e.key === 'ArrowLeft') {
        emit('back');
      }
    });

    // ── Actions ───────────────────────────────────────────────────────────────
    const label = (key: keyof typeof DEFAULT_LABELS): string => props.labels.value?.[key] ?? DEFAULT_LABELS[key];

    const totalSteps = computed(() => Math.max(0, Math.floor(props['total-steps'].value ?? 0)));
    const stepIndex = computed(() => Math.max(0, Math.floor(props['step-index'].value ?? 0)));
    const isLastStep = computed(() => totalSteps.value > 0 && stepIndex.value >= totalSteps.value - 1);
    const showProgress = computed(() => totalSteps.value > 0);

    const stepText = computed(() =>
      showProgress.value
        ? label('stepOf')
            .replace('{current}', String(stepIndex.value + 1))
            .replace('{total}', String(totalSteps.value))
        : '',
    );

    const requestDismiss = (): void => {
      if (dialogMode.value) requestClose('trigger');
      else emit('dismiss', { reason: 'trigger' });
    };

    // ── Controller binding ───────────────────────────────────────────────────
    // One call replaces the prop-writing/event-listening bridge an app would
    // otherwise hand-roll around a beacon handle: the snapshot renders into the
    // props, and every action the card requests (buttons, arrow keys, Escape,
    // close) routes back into the controller. Missing actions (a coachmark has
    // no next/back) fall back to `dismiss`.
    let stopBinding: (() => void) | null = null;

    // Registered here (inside setup) rather than inside bind(): bind() runs from
    // app code, where there is no setup context and onCleanup() would throw.
    onCleanup(() => stopBinding?.());

    const bind = (controller: TourController): (() => void) => {
      stopBinding?.();

      const apply = (): void => {
        const current = controller.current.peek();
        const card = el as OreTourElement;

        card.open = current.step !== null;
        card.title = current.step?.title ?? '';
        card.description = current.step?.description ?? '';
        card['step-index'] = current.stepIndex;
        card['total-steps'] = current.totalSteps;
        card.presentation = TOUR_PRESENTATIONS.includes(current.presentation as TourPresentation)
          ? (current.presentation as TourPresentation)
          : 'auto';
        card.placement =
          current.placement && current.placement !== 'auto' ? (current.placement as Placement) : 'bottom';
        card.anchor = current.rect ?? null;
      };

      const unsubscribe = controller.current.subscribe(apply);

      const route = (action: 'back' | 'dismiss' | 'finish' | 'next' | 'skip') => (): void => {
        (controller[action] ?? controller.dismiss).call(controller);
      };

      const listeners: [keyof OreTourEvents, EventListener][] = [
        ['back', route('back')],
        ['dismiss', route('dismiss')],
        ['finish', route('finish')],
        ['next', route('next')],
        ['skip', route('skip')],
      ];

      for (const [type, listener] of listeners) el.addEventListener(type, listener);

      apply();

      stopBinding = () => {
        stopBinding = null;
        unsubscribe();
        for (const [type, listener] of listeners) el.removeEventListener(type, listener);
      };

      return stopBinding;
    };

    Object.defineProperty(el, 'bind', {
      configurable: true,
      enumerable: false,
      value: bind,
      writable: false,
    });

    // A step change can rebuild the card's content while the tour stays open;
    // if focus fell out of the card (back to <body>), keyboard control is
    // stranded: the arrow keys are hosted and the card's own Escape handling
    // never runs. Re-assert focus on the live panel once the template settles.
    const reassertPanelFocus = (): void => {
      if (!isOpen.value) return;

      const root = el.shadowRoot;
      const active = root?.activeElement ?? document.activeElement;

      // Focus is already inside the card when the shadow root holds it,
      // when the host itself is focused, or when a slotted light-DOM child
      // has it. Anything else (body, a page control) means keyboard
      // control is stranded outside the open card.
      const inside =
        active === el ||
        (active instanceof Element && (el.contains(active) === true || (root?.contains(active) ?? false)));

      if (inside) return;

      // The <dialog> element itself is focusable; the popover panel carries
      // tabindex="-1". Both are the shell the card lives in.
      const panel = dialogMode.value ? dialogRef.value : floatRef.value;

      panel?.focus();
    };

    watch(
      () => [props['step-index'].value, resolvedPresentation.value] as const,
      () => {
        if (!isOpen.value) return;

        queueMicrotask(reassertPanelFocus);
      },
    );

    const cardTemplate = () => html`
      <div class="card" part="card">
        <div class="media" part="media" ?hidden=${() => !slots.has('media').value}>
          <slot name="media"></slot>
        </div>
        <div class="content">
          <div class="header" part="header">
            ${when(
              showProgress,
              () => html`
                <div class="progress-row">
                  <ore-progress
                    class="progress"
                    color="primary"
                    max="${() => String(totalSteps.value)}"
                    segments="${() => String(totalSteps.value)}"
                    size="sm"
                    value="${() => String(stepIndex.value + 1)}"
                    value-text="${() => stepText.value}"></ore-progress>
                  <span class="step-count" part="step-count">${() => stepText.value}</span>
                </div>
              `,
            )}
            <h3 class="title" part="title">${() => props.title.value ?? ''}</h3>
            <button
              class="close"
              part="close"
              type="button"
              aria-label="${() => label('close')}"
              ?hidden=${() => !props.dismissible.value}
              @click=${requestDismiss}>
              <ore-icon aria-hidden="true" name="x" size="16" stroke-width="2.5"></ore-icon>
            </button>
          </div>
          <div class="body" part="body">
            <!-- The description is a sibling, not the slot's fallback: any light-DOM
                 child (a footer div, whitespace between tags) is assigned to the default
                 slot and would suppress fallback content, blanking the body. slots.has()
                 counts assigned elements only, so whitespace never hides the description. -->
            <slot></slot>
            ${() => (slots.has().value ? '' : (props.description.value ?? ''))}
          </div>
          <div class="footer" part="footer">
            <slot name="footer">
              <span class="action action--skip" data-hidden="${() => String(isLastStep.value)}">
                <ore-button size="sm" variant="ghost" @click="${() => emit('skip')}">${() => label('skip')}</ore-button>
              </span>
              <span class="action" data-hidden="${() => String(stepIndex.value === 0)}">
                <ore-button size="sm" variant="ghost" @click="${() => emit('back')}">${() => label('back')}</ore-button>
              </span>
              <ore-button
                color="primary"
                size="sm"
                @click="${() => (isLastStep.value ? emit('finish') : emit('next'))}">
                ${() => (isLastStep.value ? label('finish') : label('next'))}
              </ore-button>
            </slot>
          </div>
        </div>
      </div>
    `;

    // Only the live presentation renders the card. Both shells could hold it, but a
    // light-DOM child is assigned to the first matching `<slot>` in tree order, so two
    // copies would leave the other's header/footer empty. Keyed on the presentation
    // rather than `open` so a close animation still has its content to fade out.
    const dialogCard = when(
      () => resolvedPresentation.value !== 'popover',
      () => cardTemplate(),
    );
    const floatCard = when(
      () => resolvedPresentation.value === 'popover',
      () => cardTemplate(),
    );

    return html`
      <dialog
        class="dialog"
        part="dialog"
        ref=${dialogRef}
        aria-modal="true"
        aria-label="${() => props.title.value ?? ''}">
        <div class="overlay" part="overlay" aria-hidden="true"></div>
        <div class="panel" part="panel" data-presentation="${() => resolvedPresentation.value}">
          ${dialogCard}
        </div>
      </dialog>
      <div
        class="float"
        part="float"
        ref=${floatRef}
        role="dialog"
        aria-modal="false"
        popover="manual"
        tabindex="-1"
        aria-label="${() => props.title.value ?? ''}"
        aria-hidden="${() => String(!popoverMode.value)}">
        ${floatCard}
      </div>
      ${when(
        () => props.spotlight.value === true && spotlightRect.value !== null,
        () => html`<ore-spotlight rect=${spotlightRect}></ore-spotlight>`,
      )}
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});
