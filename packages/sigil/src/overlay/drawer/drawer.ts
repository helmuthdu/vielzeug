import { define, onEvent, html, prop, ref, onMounted } from '@vielzeug/craft';

import type { OverlayCloseDetail, OverlayOpenDetail, SwipeAxis } from '../../headless';

import { createStableId, createSwipeControl } from '../../headless';
import '../../content/icon/icon';
import { coarsePointerMixin, elevationMixin, forcedColorsMixin, reducedMotionMixin } from '../../styles';
import { useDialogControl } from '../shared/use-dialog';
import styles from './drawer.css?inline';

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
type DrawerSize = 'sm' | 'lg' | 'full';
type DrawerBackdrop = 'opaque' | 'blur' | 'transparent';
type DrawerDragHandlePlacement = 'outside' | 'inset';
type DrawerSwipeConfig = {
  axis: SwipeAxis;
  closingDistance: (distance: number) => number;
  translate: (distance: number) => string;
};

const drawerSwipeConfig: Record<DrawerPlacement, DrawerSwipeConfig> = {
  bottom: {
    axis: 'y',
    closingDistance: (distance) => Math.max(0, distance),
    translate: (distance) => `translateY(${distance}px)`,
  },
  left: {
    axis: 'x',
    closingDistance: (distance) => Math.max(0, -distance),
    translate: (distance) => `translateX(${distance}px)`,
  },
  right: {
    axis: 'x',
    closingDistance: (distance) => Math.max(0, distance),
    translate: (distance) => `translateX(${distance}px)`,
  },
  top: {
    axis: 'y',
    closingDistance: (distance) => Math.max(0, -distance),
    translate: (distance) => `translateY(${distance}px)`,
  },
};

/** Element interface exposing the imperative API for `bit-drawer`. */
export interface DrawerElement extends HTMLElement, Omit<BitDrawerProps, 'title'> {
  /** Programmatically open the drawer. Equivalent to setting `open`. */
  show(): void;
  /** Programmatically close the drawer with the exit animation. */
  hide(): void;
}

/** Drawer component properties */

export type BitDrawerEvents = {
  close: OverlayCloseDetail & { placement: DrawerPlacement };
  open: OverlayOpenDetail & { placement: DrawerPlacement };
};

export type BitDrawerProps = {
  /** Backdrop style — 'opaque' (default), 'blur', or 'transparent' */
  backdrop?: DrawerBackdrop;
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
  /** Drawer width/height preset */
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
 * @element bit-drawer
 *
 * @attr {boolean} open - Controlled open/close state
 * @attr {string} placement - 'left' | 'right' (default) | 'top' | 'bottom'
 * @attr {string} size - 'sm' | 'lg' | 'full'
 * @attr {string} title - Visible header title text
 * @attr {string} label - Invisible aria-label (for drawers without a visible title)
 * @attr {boolean} dismissible - Show the close (×) button (default: true)
 * @attr {string} drag-handle-placement - 'outside' (default) | 'inset'
 * @attr {string} backdrop - Backdrop style: 'opaque' (default) | 'blur' | 'transparent'
 * @attr {boolean} persistent - Prevent backdrop-click from closing (default: false)
 *
 * @fires open - When the drawer opens with detail: { placement, reason }
 * @fires close - When the drawer closes with detail: { placement, reason }
 *
 * @slot header - Drawer header content
 * @slot - Main body content
 * @slot footer - Drawer footer content
 *
 * @cssprop --drawer-backdrop - Backdrop background
 * @cssprop --drawer-bg - Panel background color
 * @cssprop --drawer-size - Panel width (horizontal) or height (vertical)
 * @cssprop --drawer-shadow - Panel box-shadow
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
 * <bit-drawer open title="Settings" placement="right">
 *   <p>Settings content here.</p>
 * </bit-drawer>
 *
 * <!-- With custom header slot -->
 * <bit-drawer open placement="right">
 *   <span slot="header">Settings</span>
 *   <p>Settings content here.</p>
 * </bit-drawer>
 * ```
 */

export const DRAWER_TAG = define<BitDrawerProps, BitDrawerEvents>('bit-drawer', {
  props: {
    backdrop: prop.string<DrawerBackdrop>(),
    dismissible: prop.bool(true),
    'drag-handle-placement': prop.oneOf(['outside', 'inset'] as const, 'outside'),
    'initial-focus': prop.string(),
    label: prop.string(),
    open: prop.bool(false),
    persistent: prop.bool(false),
    placement: prop.oneOf(['left', 'right', 'top', 'bottom'] as const, 'right'),
    'return-focus': prop.bool(true),
    size: prop.string<DrawerSize>(),
    title: prop.string(),
  },
  setup(props, { bind: _bind, el, emit, slots }) {
    const drawerLabelId = createStableId('drawer-label');
    const dialogRef = ref<HTMLDialogElement>();
    const panelRef = ref<HTMLDivElement>();

    // Drag-to-close state
    let isSwipeClosing = false;
    let swipeCloseTimer: ReturnType<typeof setTimeout> | undefined;

    const getHeaderText = () => props.label.value ?? props.title.value ?? '';
    const hasHeaderTitle = () => slots.has('header').value || !!getHeaderText();

    // Header is visible when there is slot content, a text label, or a close button.
    const hasHeader = () => hasHeaderTitle() || props.dismissible.value;
    const hasFooter = () => slots.has('footer').value;

    const getPlacement = (): DrawerPlacement => props.placement.value || 'right';

    const getSwipeConfig = (): DrawerSwipeConfig => drawerSwipeConfig[getPlacement()];

    const getSnapThreshold = (panel: HTMLElement, axis: SwipeAxis) => {
      const panelSize = axis === 'x' ? panel.offsetWidth : panel.offsetHeight;

      return Math.min(96, Math.max(36, panelSize * 0.18));
    };

    const shouldCommitSwipeClose = (distance: number, threshold: number) => {
      return getSwipeConfig().closingDistance(distance) >= threshold;
    };

    const finalizeSwipeClose = (panel: HTMLElement) => {
      if (!isSwipeClosing) return;

      if (swipeCloseTimer) {
        clearTimeout(swipeCloseTimer);
        swipeCloseTimer = undefined;
      }

      const dialog = dialogRef.value;

      if (!dialog) {
        isSwipeClosing = false;

        return;
      }

      dialog.style.transition = 'none';
      panel.style.opacity = '0';
      panel.style.visibility = 'hidden';
      void dialog.offsetWidth;

      requestClose('swipe');
    };

    const startSwipeClose = (panel: HTMLElement, swipe: DrawerSwipeConfig, committedDistance: number) => {
      if (isSwipeClosing) return;

      isSwipeClosing = true;

      const panelSize = swipe.axis === 'x' ? panel.offsetWidth : panel.offsetHeight;
      // Preserve overshoot so closing continues from the dragged position instead of snapping back.
      const exitDistance =
        committedDistance >= 0 ? Math.max(committedDistance, panelSize) : Math.min(committedDistance, -panelSize);
      const exitTransform = swipe.translate(exitDistance);

      // Commit the current drag position first so the magnetic snap continues
      // from the finger instead of jumping back to rest.
      panel.style.transition = 'transform 180ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 180ms ease-out';
      void panel.offsetWidth;

      const onExitTransitionEnd = (ev: TransitionEvent) => {
        if (ev.target !== panel || ev.propertyName !== 'transform') return;

        panel.removeEventListener('transitionend', onExitTransitionEnd);
        finalizeSwipeClose(panel);
      };

      panel.addEventListener('transitionend', onExitTransitionEnd);

      const durationMs = parseFloat(getComputedStyle(panel).transitionDuration) * 1000;

      swipeCloseTimer = setTimeout(() => {
        panel.removeEventListener('transitionend', onExitTransitionEnd);
        finalizeSwipeClose(panel);
      }, durationMs + 50);

      panel.style.transform = exitTransform;
      panel.style.opacity = '0.2';
    };

    const resetPanelDragStyles = (panel: HTMLElement) => {
      if (swipeCloseTimer) {
        clearTimeout(swipeCloseTimer);
        swipeCloseTimer = undefined;
      }

      // Re-enable transitions so the snap-back or exit animates.
      panel.style.transition = '';
      panel.style.transform = '';
      panel.style.opacity = '';
      panel.style.visibility = '';
      isSwipeClosing = false;
    };

    const swipe = createSwipeControl({
      axis: () => getSwipeConfig().axis,
      disabled: () => isSwipeClosing,
      onCancel: ({ distance, threshold }) => {
        const panel = panelRef.value;

        if (!panel) return;

        // If the release event crosses the threshold (without an intervening
        // move event), commit close instead of snapping back to rest first.
        if (shouldCommitSwipeClose(distance, threshold)) {
          startSwipeClose(panel, getSwipeConfig(), distance);

          return;
        }

        resetPanelDragStyles(panel);
      },
      onCommit: ({ distance }) => {
        const panel = panelRef.value;

        if (!panel) return;

        startSwipeClose(panel, getSwipeConfig(), distance);
      },
      onMove: ({ distance, threshold }) => {
        const panel = panelRef.value;

        if (!panel) return;

        const swipeConfig = getSwipeConfig();
        const closingDistance = swipeConfig.closingDistance(distance);
        const progress = Math.min(closingDistance / threshold, 1);

        // Kill CSS transitions so the panel tracks the finger instantly.
        panel.style.transition = 'none';
        panel.style.transform = swipeConfig.translate(distance);
        panel.style.opacity = String(1 - progress * 0.4);
      },
      shouldCommit: ({ distance, threshold }) => shouldCommitSwipeClose(distance, threshold),
      threshold: () => {
        const panel = panelRef.value;

        if (!panel) return 48;

        return getSnapThreshold(panel, getSwipeConfig().axis);
      },
    });

    // ────────────────────────────────────────────────────────────────
    // Overlay State Management
    // ────────────────────────────────────────────────────────────────

    const { overlay, requestClose, watchOpenProp } = useDialogControl({
      beforeOpen: (dialog) => {
        // Clear any inline drag styles from a previous swipe-close so the CSS
        // entry animation starts from the correct base state.
        const panel = panelRef.value;

        if (panel) resetPanelDragStyles(panel);

        void dialog;
      },
      closeRequestDetail: (_reason) => ({ placement: props.placement.value ?? 'right' }),
      dialogRef,
      getPanelEl: () => panelRef.value,
      host: el,
      initialFocus: props['initial-focus'],
      isPersistent: () => Boolean(props.persistent.value),
      onNativeClose: (reason) => {
        const panelEl = panelRef.value;

        // For swipe-close, keep the panel hidden and off-screen until the next
        // open cycle — resetting inline styles during native close can produce
        // a visible frame at the rest position on some browsers.
        if (panelEl && reason !== 'swipe') resetPanelDragStyles(panelEl);

        const dialog = dialogRef.value;

        if (dialog) dialog.style.transition = '';

        emit('close', { placement: props.placement.value ?? 'right', reason });
      },
      onOpen: (reason) => emit('open', { placement: props.placement.value ?? 'right', reason }),
      openProp: props.open,
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
        overlay.close('programmatic', false);
      };

      // ────────────────────────────────────────────────────────────
      // Event Handlers: Cancel, Backdrop Click
      // ────────────────────────────────────────────────────────────

      const handleCancel = (e: Event) => {
        e.preventDefault();

        if (props.persistent.value) return;

        requestClose('escape');
      };

      const handleBackdropClick = (e: MouseEvent) => {
        if (props.persistent.value) return;

        if (swipe.isActive() || isSwipeClosing) return;

        if (e.target !== dialog) return; // Click inside panel

        requestClose('outsideClick');
      };

      watchOpenProp();

      onEvent(dialog, 'cancel', handleCancel);
      onEvent(dialog, 'click', handleBackdropClick);

      // Drag-to-close handlers — scoped to the handle element only so interactions
      // with panel content don't accidentally start a drag.
      const panel = panelRef.value;
      const dragHandleEl = panel?.querySelector<HTMLElement>('[part="drag-handle"]');

      if (dragHandleEl) {
        onEvent(dragHandleEl, 'pointerdown', swipe.handlePointerDown);
        onEvent(dragHandleEl, 'pointermove', swipe.handlePointerMove);
        onEvent(dragHandleEl, 'pointerup', swipe.handlePointerUp);
        onEvent(dragHandleEl, 'pointercancel', swipe.handlePointerCancel);
      }

      return () => {
        overlay.cleanup();
      };
    });

    return html`
      <dialog
        ref=${dialogRef}
        aria-modal="true"
        :aria-label="${() => props.label.value ?? null}"
        :aria-labelledby="${() => (!props.label.value ? drawerLabelId : null)}">
        <div class="panel" part="panel" ref=${panelRef}>
          <div class="drag-handle" part="drag-handle" aria-label="Drag to close" role="button"></div>
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
              <bit-icon name="x" size="16" stroke-width="2.5" aria-hidden="true"></bit-icon>
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
  styles: [elevationMixin, forcedColorsMixin, coarsePointerMixin, reducedMotionMixin, styles],
});
