import { createPanGesture, type PanAxis, type PanGesture, type PanGestureEndDetail } from '@vielzeug/gesture';
import { type SpringHandle, spring } from '@vielzeug/necromancer';
import {
  createId,
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
} from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';
import { warn } from '../../_dev';
import { type DialogCloseReason, type OverlayOpenChangeDetail, parseDetents, parseOptionalBool } from '../../core';
import { getMotionMode } from '../../motion';
import { projectFling } from '../../shared/fling';

import { forcedColorsMixin, overlayMotionMixin, touchTargetMixin } from '../../styles';
import { useDialogControl } from '../shared/use-dialog';
import styles from './drawer.css?inline';

export { ICON_TAG } from '../../content/icon/icon';

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
const DRAWER_SIZES = ['sm', 'lg', 'full', 'content'] as const;
type DrawerSize = (typeof DRAWER_SIZES)[number];
const DRAWER_BACKDROPS = ['opaque', 'blur', 'transparent'] as const;
type DrawerBackdrop = (typeof DRAWER_BACKDROPS)[number];
type DrawerDragHandlePlacement = 'outside' | 'inset';
type DrawerSwipeConfig = {
  axis: PanAxis;
  /** Signed closing displacement for an unsnapped drag delta (negative opens past rest). */
  rawClosing: (distance: number) => number;
  /** Maps a pointer velocity along the axis to velocity toward closed. */
  closingVelocity: (velocity: number) => number;
  /** Transform placing the panel `closingDistance` px toward closed. */
  translateClosing: (closingDistance: number) => string;
};

const drawerSwipeConfig: Record<DrawerPlacement, DrawerSwipeConfig> = {
  bottom: {
    axis: 'y',
    closingVelocity: (velocity) => velocity,
    rawClosing: (distance) => distance,
    translateClosing: (closing) => `translateY(${closing}px)`,
  },
  left: {
    axis: 'x',
    closingVelocity: (velocity) => -velocity,
    rawClosing: (distance) => -distance,
    translateClosing: (closing) => `translateX(${-closing}px)`,
  },
  right: {
    axis: 'x',
    closingVelocity: (velocity) => velocity,
    rawClosing: (distance) => distance,
    translateClosing: (closing) => `translateX(${closing}px)`,
  },
  top: {
    axis: 'y',
    closingVelocity: (velocity) => -velocity,
    rawClosing: (distance) => -distance,
    translateClosing: (closing) => `translateY(${-closing}px)`,
  },
};

/** Element interface exposing the imperative API for `ore-drawer`. */
export interface DrawerElement extends HTMLElement, Omit<OreDrawerProps, 'title'> {
  /** Programmatically close the drawer with the exit animation. */
  hide(): void;
  /** Programmatically open the drawer. Equivalent to setting `open`. */
  show(): void;
}

/** Drawer component properties */

export type OreDrawerEvents = {
  'open-change': OverlayOpenChangeDetail;
};

export type OreDrawerProps = {
  /** Backdrop style: 'opaque' (default), 'blur', or 'transparent' */
  backdrop?: DrawerBackdrop;
  /**
   * Comma-separated drag snap points as fractions of the panel size, e.g.
   * `'0.5,0.75'`. A dragged panel released near one of these settles there
   * (0.5 = half-open). Requires a `bottom` or `top` placement; ignored
   * elsewhere. When unset the drawer is two-state: fully open or closed.
   */
  detents?: string;
  /** Initial uncontrolled open state. Ignored when `open` is set. */
  'default-open'?: boolean;
  /** Show the close (×) button in the header (default: true) */
  dismissible?: boolean;
  /** Drag handle position used for swipe-to-close gestures */
  'drag-handle-placement'?: DrawerDragHandlePlacement;
  /**
   * CSS selector for the element inside the drawer that should receive focus on open.
   * Defaults to native dialog focus management (first focusable element).
   * @example '#submit-btn' | 'input[name="email"]'
   */
  'initial-focus'?: string;
  /**
   * Invisible accessible label for the dialog (`aria-label`).
   * Use when the drawer has no visible title (e.g. image-only content).
   * When omitted, `aria-labelledby` points to the visible header title instead.
   */
  label?: string;
  /** Controlled open state */
  open?: boolean;
  /** When true, backdrop clicks do not close the drawer (default: false) */
  persistent?: boolean;
  /** Side from which the drawer slides in */
  placement?: DrawerPlacement;
  /**
   * When true (default), focus returns to the triggering element after the drawer closes.
   * Set to false to manage focus manually.
   */
  'return-focus'?: boolean;
  /** Drawer size preset. `content` fits top/bottom sheets to their content. */
  size?: DrawerSize;
  /**
   * Visible title text rendered inside the header.
   * Used as the dialog's accessible label via `aria-labelledby` when `label` is not set.
   */
  title?: string;
};

/**
 * A panel that slides in from any edge of the screen, built on the native `<dialog>` element.
 *
 * @element ore-drawer
 *
 * @attr {boolean} open - Controlled open state
 * @attr {boolean} default-open - Initial uncontrolled open state
 * @attr {string} placement - 'left' | 'right' (default) | 'top' | 'bottom'
 * @attr {string} size - 'sm' | 'lg' | 'full' | 'content'
 * @attr {string} detents - Comma-separated drag snap points as fractions of panel size ('0.5,0.75'); bottom/top placement only
 * @attr {string} title - Visible header title text
 * @attr {string} label - Invisible aria-label (for drawers without a visible title)
 * @attr {boolean} dismissible - Show the close (×) button (default: true)
 * @attr {string} drag-handle-placement - 'outside' (default) | 'inset'
 * @attr {string} backdrop - Backdrop style: 'opaque' (default) | 'blur' | 'transparent'
 * @attr {boolean} persistent - Prevent backdrop-click from closing (default: false)
 *
 * @fires open-change - When the drawer state changes. detail: { open, reason }
 *
 * @slot header - Drawer header content
 * @slot - Main body content
 * @slot footer - Drawer footer content
 *
 * @cssprop --drawer-backdrop-bg - Backdrop veil color (default: var(--overlay-veil))
 * @cssprop --drawer-bg - Panel background color
 * @cssprop --drawer-size - Panel width (horizontal) or height (vertical)
 * @cssprop --drawer-shadow - Panel box-shadow
 * @cssprop --drawer-panel-blur - Panel backdrop blur amount
 *
 * @part drag-handle - Drawer drag handle.
 * @part panel - Panel container.
 * @part header - Header container.
 * @part close-btn - Close button.
 * @part body - Body content container.
 * @part footer - Footer container.
 * @example
 * ```html
 * <!-- With visible title -->
 * <ore-drawer open title="Settings" placement="right">
 *   <p>Settings content here.</p>
 * </ore-drawer>
 *
 * <!-- With custom header slot -->
 * <ore-drawer open placement="right">
 *   <span slot="header">Settings</span>
 *   <p>Settings content here.</p>
 * </ore-drawer>
 * ```
 */

export const DRAWER_TAG = 'ore-drawer' as const;
define<OreDrawerProps>(DRAWER_TAG, {
  props: {
    backdrop: prop.oneOf(DRAWER_BACKDROPS),
    'default-open': prop.bool(false),
    detents: prop.string(),
    dismissible: prop.bool(true),
    'drag-handle-placement': prop.oneOf(['outside', 'inset'] as const, 'outside'),
    'initial-focus': prop.string(),
    label: prop.string(),
    open: { default: undefined as boolean | undefined, parse: parseOptionalBool },
    persistent: prop.bool(false),
    placement: prop.oneOf(['left', 'right', 'top', 'bottom'] as const, 'right'),
    'return-focus': prop.bool(true),
    size: prop.oneOf(DRAWER_SIZES),
    title: prop.string(),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreDrawerEvents>();
    const slots = useSlots();

    const drawerLabelId = createId('drawer-label');
    const dialogRef = ref<HTMLDialogElement>();
    const panelRef = ref<HTMLDivElement>();

    // Drag-to-close state
    const isSwipeClosing = signal(false);
    let swipe: PanGesture | undefined;
    let springHandle: SpringHandle | undefined;
    // Current panel position along the closing axis (0 = fully open, panelSize
    // = closed). Tracks the visual position every frame so a grab mid-spring or
    // a drag from a detent continues from where the panel actually is.
    let panelClosing = 0;
    // Position the current drag gesture started from, so the panel tracks the
    // finger relative to its resting spot, not the fully-open origin.
    let dragBaseClosing = 0;
    let detentsWarned = false;

    const getHeaderText = () => props.label.value ?? props.title.value ?? '';
    const hasHeaderTitle = () => slots.has('header').value || !!getHeaderText();

    // Header is visible when there is slot content, a text label, or a close button.
    const hasHeader = () => hasHeaderTitle() || props.dismissible.value;
    const hasFooter = () => slots.has('footer').value;

    const getPlacement = (): DrawerPlacement => props.placement.value || 'right';

    const getSwipeConfig = (): DrawerSwipeConfig => drawerSwipeConfig[getPlacement()];

    // Detents are the sheet pattern: a dragged panel can rest partway open.
    // They only make sense where the panel slides along its own long axis
    // (bottom/top); a side drawer half off-screen is not a usable stop.
    const getDetentFractions = (): readonly number[] => {
      const fractions = parseDetents(props.detents.value ?? null) ?? [];

      if (fractions.length === 0) return fractions;

      const placement = getPlacement();

      if (placement !== 'bottom' && placement !== 'top') {
        if (!detentsWarned) {
          detentsWarned = true;
          warn(`detents are only supported on bottom or top drawers, not "${placement}". Ignored.`);
        }

        return [];
      }

      return fractions;
    };

    /** Panel size along the swipe axis. */
    const getPanelSize = (panel: HTMLElement): number =>
      getSwipeConfig().axis === 'x' ? panel.offsetWidth : panel.offsetHeight;

    /**
     * Resting positions along the closing axis: 0 (fully open), each detent
     * (a fraction of the panel still on-screen), and the full panel size
     * (closed).
     */
    const getRestPositions = (panel: HTMLElement): number[] => {
      const panelSize = getPanelSize(panel);

      return [0, ...getDetentFractions().map((fraction) => panelSize * (1 - fraction)), panelSize];
    };

    /**
     * How far a two-state panel must be dragged (or flung) before the release
     * commits to closing. Biased toward closed: a sheet should dismiss with a
     * short decisive drag, the way a real bottom sheet does, not only after
     * crossing half its height.
     */
    const getCommitLine = (panel: HTMLElement): number => {
      const panelSize = getPanelSize(panel);

      return Math.min(96, Math.max(36, panelSize * 0.18));
    };

    /**
     * Where a released panel settles: the nearest rest position to the
     * fling-projected position (see `shared/fling`). With detents the stops
     * compete on distance; the two-state open/closed pair uses the commit line
     * instead of the midpoint.
     */
    const projectRestPosition = (
      closing: number,
      velocityClosing: number,
      restPositions: readonly number[],
      commitLine: number,
    ): number => {
      const projected = projectFling(Math.max(0, closing), velocityClosing);

      if (restPositions.length === 2) return projected >= commitLine ? restPositions[1] : restPositions[0];

      return restPositions.reduce((nearest, position) =>
        Math.abs(projected - position) < Math.abs(projected - nearest) ? position : nearest,
      );
    };

    const applyDragPosition = (panel: HTMLElement, closing: number, panelSize: number): void => {
      // The panel fades out only as it travels below its lowest resting point toward dismissal.
      // With detents that point is the most-closed detent, so every rest position (fully open and
      // each detent) stays fully opaque — a sheet you can read at any stop. Without detents the
      // only rest below open is closed, so the fade keeps its original “last stretch” shape from
      // 60% closed. Clamped to [0, 1] so a drag that overshoots the closed edge can't drive the
      // opacity negative.
      const fractions = getDetentFractions();
      const fadeStart = fractions.length > 0 ? panelSize * (1 - Math.min(...fractions)) : panelSize * 0.6;

      const fade = Math.min(Math.max((closing - fadeStart) / (panelSize - fadeStart), 0), 1);

      panelClosing = closing;
      panel.style.transition = 'none';
      panel.style.transform = getSwipeConfig().translateClosing(closing);
      panel.style.opacity = String(1 - fade * 0.8);
    };

    const finalizeDragClose = (panel: HTMLElement, reason: DialogCloseReason) => {
      if (!isSwipeClosing.value) return;

      const dialog = dialogRef.value;

      if (!dialog) {
        isSwipeClosing.value = false;

        return;
      }

      dialog.style.transition = 'none';
      panel.style.opacity = '0';
      panel.style.visibility = 'hidden';
      void dialog.offsetWidth;

      if (reason === 'swipe') {
        // The gesture itself never closes the dialog: it asks, so a consumer
        // can preventDefault() the close-request and keep the drawer open.
        requestClose(reason);
      } else {
        // Escape/backdrop/trigger: the close-request already fired and was
        // allowed before performClose ran. Complete it directly; the close
        // reason was already recorded by the overlay controller.
        dialog.close();
      }

      if (dialog.open) {
        // The close was prevented (a consumer cancelled the swipe close-request), so the drawer
        // stays open: undo the exit state the settle spring applied. `settlePanel` added `.closing`
        // to fade the backdrop in sync with the panel; leaving it here would keep the veil faded
        // and hide the panel via `.closing .panel`. Drop it alongside the inline drag styles.
        dialog.classList.remove('closing');
        dialog.style.transition = '';
        resetPanelDragStyles(panel);
      }
    };

    /**
     * Animate the panel from its dragged position to a rest position on a
     * physical spring seeded with the finger's release velocity: a fling
     * continues from the momentum, a slow release settles without overshoot.
     * Under reduced motion the spring jumps to the target in one step.
     */
    const settlePanel = (
      panel: HTMLElement,
      fromClosing: number,
      toClosing: number,
      velocityClosing: number,
      closeReason: DialogCloseReason = 'swipe',
    ) => {
      const panelSize = getPanelSize(panel);
      const closing = toClosing >= panelSize;

      if (closing) {
        isSwipeClosing.value = true;

        // Drive the backdrop fade from the same moment the panel starts springing closed. The
        // CSS exit (`dialog.closing::backdrop { opacity: 0 }`) is what the close-button path uses;
        // without it here the veil would sit at full opacity for the whole spring and only vanish
        // when `dialog.close()` runs, so the panel slides away leaving a lingering dark veil. The
        // panel's own inline transform/opacity/`transition: none` from `applyDragPosition` still
        // win over `.closing .panel`, so this only affects the backdrop.
        dialogRef.value?.classList.add('closing');
      }

      // Detaching the previous flight is what keeps a settle-to-detent spring from writing
      // panel.style.transform every frame alongside this one: the `springHandle !== handle` guard
      // below only protects the completion callback, not the per-frame update.
      springHandle?.dispose();

      const handle = spring(fromClosing, toClosing, (value) => applyDragPosition(panel, value, panelSize), {
        motion: getMotionMode(),
        velocity: velocityClosing,
      });
      springHandle = handle;

      void handle.result.then((outcome) => {
        // A disposed spring means something else took over (a reopen, a new
        // drag, component teardown): that owner owns the panel now.
        if (outcome.status !== 'finished' || springHandle !== handle) return;

        springHandle = undefined;

        if (closing) {
          finalizeDragClose(panel, closeReason);
        } else if (toClosing <= 0) {
          // Fully open again: drop the inline styles so the panel returns to
          // its pure CSS state (and a later close animates from there).
          resetPanelDragStyles(panel);
        } else {
          applyDragPosition(panel, toClosing, panelSize);
          // Re-enable the CSS transition so a later close animates from here.
          panel.style.transition = '';
        }
      });
    };

    const handleSwipeEnd = ({ distance, reason, velocity }: PanGestureEndDetail): void => {
      const panel = panelRef.value;

      // A close already committed (Escape/backdrop mid-drag): it owns the panel.
      if (!panel || isSwipeClosing.value) return;

      const swipeConfig = getSwipeConfig();
      const from = Math.max(0, dragBaseClosing + swipeConfig.rawClosing(distance));

      // A platform cancel is not a dismissal: the user never released, so the
      // panel returns to where the drag began (its detent or fully open) with
      // no momentum. A release projects the fling forward onto the rest
      // positions (fully open, detents, closed).
      if (reason !== 'release') {
        settlePanel(panel, from, dragBaseClosing, 0);

        return;
      }

      const velocityClosing = swipeConfig.closingVelocity(velocity);
      const rest = projectRestPosition(from, velocityClosing, getRestPositions(panel), getCommitLine(panel));

      settlePanel(panel, from, rest, velocityClosing);
    };

    const resetPanelDragStyles = (panel: HTMLElement) => {
      springHandle?.dispose();
      springHandle = undefined;

      // Re-enable transitions so the snap-back or exit animates.
      panel.style.transition = '';
      panel.style.transform = '';
      panel.style.opacity = '';
      panel.style.visibility = '';
      panelClosing = 0;
      isSwipeClosing.value = false;
    };

    // ────────────────────────────────────────────────────────────────
    // Overlay State Management
    // ────────────────────────────────────────────────────────────────

    const { closeWithAnimation, mount, overlay, requestClose } = useDialogControl({
      beforeOpen: () => {
        // Clear any inline drag styles from a previous swipe-close so the CSS
        // entry animation starts from the correct base state.
        const panel = panelRef.value;

        if (panel) resetPanelDragStyles(panel);
      },
      closeRequestDetail: (_reason) => ({ placement: props.placement.value ?? 'right' }),
      defaultOpen: props['default-open'],
      dialogRef,
      getPanelEl: () => panelRef.value,
      host: el,
      initialFocus: props['initial-focus'],
      isPersistent: () => Boolean(props.persistent.value),
      onCleanup,
      onEvent,
      onNativeClose: (reason) => {
        const panelEl = panelRef.value;

        // For swipe-close, keep the panel hidden and off-screen until the next
        // open cycle: resetting inline styles during native close can produce
        // a visible frame at the rest position on some browsers.
        if (panelEl && reason !== 'swipe') resetPanelDragStyles(panelEl);

        const dialog = dialogRef.value;

        if (dialog) dialog.style.transition = '';

        emit('open-change', { open: false, reason });
      },
      onOpen: (reason) => emit('open-change', { open: true, reason }),
      openProp: props.open,
      performClose: (dialog, reason) => {
        // A committed spring close (swipe, or a detent panel closed by
        // Escape/backdrop/programmatic hide) has already moved the panel
        // off-screen: the native close completes it with no CSS exit.
        if (isSwipeClosing.value) {
          dialog.close();

          return;
        }

        const panel = panelRef.value;

        // A panel resting at a detent carries an inline transform the CSS exit
        // cannot override: spring it the rest of the way closed first.
        if (panel && panelClosing > 0) {
          isSwipeClosing.value = true;
          settlePanel(panel, panelClosing, getPanelSize(panel), 0, reason);

          return;
        }

        closeWithAnimation();
      },
      returnFocus: props['return-focus'],
    });

    const handleCloseButtonClick = () => {
      requestClose('trigger');
    };

    // ────────────────────────────────────────────────────────────────
    // Lifecycle: Setup Drawer Integration
    // ────────────────────────────────────────────────────────────────

    onMounted(() => {
      const dialog = dialogRef.value;

      if (!dialog) return;

      // Expose imperative API
      const drawerEl = el as DrawerElement;

      drawerEl.show = () => {
        overlay.open('programmatic');
      };

      drawerEl.hide = () => {
        overlay.close('programmatic');
      };

      // ────────────────────────────────────────────────────────────
      // Event Handlers: Backdrop Click
      // ────────────────────────────────────────────────────────────
      // `mount()` registers the open-prop watcher and the shared native
      // `close`/`cancel` handling (Escape). Drawer registers only its own
      // backdrop-click handler on top, since swipe-to-dismiss adds guards the
      // shared `handleBackdropClick` doesn't know about.

      const handleBackdropClick = (e: MouseEvent) => {
        if (props.persistent.value) return;

        if (swipe?.active || isSwipeClosing.value) return;

        if (e.target !== dialog) return; // Click inside panel

        requestClose('outsideClick');
      };

      mount();

      onEvent(dialog, 'click', handleBackdropClick);

      // Drag-to-close handlers: scoped to the handle element only so interactions
      // with panel content don't accidentally start a drag.
      const panel = panelRef.value;
      const dragHandleEl = panel?.querySelector<HTMLElement>('[part="drag-handle"]');

      if (dragHandleEl) {
        swipe = createPanGesture(dragHandleEl, {
          axis: () => getSwipeConfig().axis,
          disabled: () => isSwipeClosing.value,
          onEnd: handleSwipeEnd,
          onMove: ({ distance }) => {
            const currentPanel = panelRef.value;

            if (!currentPanel) return;

            // Dragging is direct manipulation: the panel tracks the finger
            // exactly (overshoot past the closed edge included, the way a
            // real sheet pulls past its dismissal point). Spring motion only
            // starts at release.
            applyDragPosition(
              currentPanel,
              Math.max(0, dragBaseClosing + getSwipeConfig().rawClosing(distance)),
              getPanelSize(currentPanel),
            );
          },
          onStart: () => {
            // Grab the panel wherever it currently is: mid-spring or resting
            // at a detent. The drag then tracks the finger relative to here.
            springHandle?.dispose();
            springHandle = undefined;
            dragBaseClosing = panelClosing;
          },
        });
      }

      return () => {
        swipe?.dispose();
        swipe = undefined;
        // Stop any in-flight settle spring before the controller tears the dialog down: the spring
        // is not tied to the mount signal, so without this it keeps requesting frames and writing
        // styles on the detached panel until it happens to rest.
        springHandle?.dispose();
        springHandle = undefined;
        overlay.dispose();
      };
    });

    return html`
      <dialog
        ref=${dialogRef}
        aria-modal="true"
        aria-label="${() => props.label.value ?? null}"
        aria-labelledby="${() => (!props.label.value ? drawerLabelId : null)}">
        <div class="panel" part="panel" ref=${panelRef}>
          <div class="drag-handle" part="drag-handle" aria-hidden="true"></div>
          <div class="header" part="header" ?hidden=${() => !hasHeader()}>
            <span class="header-title" id="${drawerLabelId}" ?hidden=${() => !hasHeaderTitle()}>
              <slot name="header">${() => getHeaderText()}</slot>
            </span>
            <button
              class="close-btn"
              part="close-btn"
              type="button"
              aria-label="Close"
              ?hidden=${() => !props.dismissible.value}
              @click=${handleCloseButtonClick}>
              <ore-icon name="x" size="16" stroke-width="2.5" aria-hidden="true"></ore-icon>
            </button>
          </div>
          <div class="body" part="body">
            <slot></slot>
          </div>
          <div class="footer" part="footer" ?hidden=${() => !hasFooter()}>
            <slot name="footer"></slot>
          </div>
        </div>
      </dialog>
    `;
  },
  styles: [forcedColorsMixin, touchTargetMixin, overlayMotionMixin('panel'), styles],
});
