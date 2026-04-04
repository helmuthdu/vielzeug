import type { OverlayCloseDetail, OverlayCloseReason, OverlayOpenDetail } from '@vielzeug/craftit/controls';

import { define, computed, createId, fire, handle, html, onMount, ref, signal, watch } from '@vielzeug/craftit';
import { createOverlayControl } from '@vielzeug/craftit/controls';

import '../../content/icon/icon';
import { type PropBundle } from '../../inputs/shared/bundles';
import { coarsePointerMixin, elevationMixin, forcedColorsMixin, reducedMotionMixin } from '../../styles';
import { lockBackground, unlockBackground, useOverlay } from '../../utils';
import styles from './drawer.css?inline';

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
type DrawerSize = 'sm' | 'lg' | 'full';
type DrawerBackdrop = 'opaque' | 'blur' | 'transparent';

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
 * @attr {string} backdrop - Backdrop style: 'opaque' (default) | 'blur' | 'transparent'
 * @attr {boolean} persistent - Prevent backdrop-click from closing (default: false)
 *
 * @slot header - Drawer header content
 * @slot - Main body content
 * @slot footer - Drawer footer content
 *
 * @fires open - When the drawer opens with detail: { placement, reason }
 * @fires close - When the drawer closes with detail: { placement, reason }
 *
 * @cssprop --drawer-backdrop - Backdrop background
 * @cssprop --drawer-bg - Panel background color
 * @cssprop --drawer-size - Panel width (horizontal) or height (vertical)
 * @cssprop --drawer-shadow - Panel box-shadow
 *
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

/** Event schema for bit-drawer. */

const drawerProps = {
  backdrop: undefined,
  dismissible: true,
  'initial-focus': undefined,
  label: undefined,
  open: false,
  persistent: false,
  placement: 'right',
  'return-focus': true,
  size: undefined,
  title: undefined,
} satisfies PropBundle<BitDrawerProps>;

export const DRAWER_TAG = define<BitDrawerProps, BitDrawerEvents>('bit-drawer', {
  props: drawerProps,
  setup({ emit, host, props, slots }) {
    const drawerLabelId = createId('drawer-label');
    const dialogRef = ref<HTMLDialogElement>();
    const panelRef = ref<HTMLDivElement>();
    const isOpen = signal(false);
    let closeReason: OverlayCloseReason = 'programmatic';

    // Header is visible when there is slot content, a title prop, or a close button
    const hasHeader = computed(() => slots.has('header').value || !!props.title.value || props.dismissible.value);
    const hasFooter = computed(() => slots.has('footer').value);

    // ────────────────────────────────────────────────────────────────
    // Overlay State Management
    // ────────────────────────────────────────────────────────────────

    const { applyInitialFocus, captureReturnFocus, restoreFocus } = useOverlay(
      host.el,
      dialogRef,
      () => panelRef.value,
      props,
    );

    const requestClose = (reason: Exclude<OverlayCloseReason, 'programmatic'>) => {
      const dialog = dialogRef.value;

      if (!dialog) return;

      const closeAllowed = fire.custom(host.el, 'close-request', {
        cancelable: true,
        detail: { placement: props.placement.value ?? 'right', reason },
      });

      if (!closeAllowed) return;

      closeReason = reason;

      overlay.close(reason, false);
    };

    const overlay = createOverlayControl({
      elements: {
        boundary: host.el,
        panel: panelRef.value,
      },
      isOpen,
      onOpen: (reason) => emit('open', { placement: props.placement.value ?? 'right', reason }),
      setOpen: (next, reason) => {
        const dialog = dialogRef.value;

        if (!dialog) return;

        if (next) {
          if (dialog.open) return;

          captureReturnFocus();
          dialog.showModal();
          lockBackground(host.el);
          applyInitialFocus();
          isOpen.value = true;

          return;
        }

        if (dialog.open) {
          closeReason = reason as OverlayCloseReason;
          dialog.close();

          return;
        }

        isOpen.value = false;
      },
    });

    // ────────────────────────────────────────────────────────────────
    // Lifecycle: Setup Drawer Integration
    // ────────────────────────────────────────────────────────────────

    onMount(() => {
      const dialog = dialogRef.value;

      if (!dialog) return;

      // Expose imperative API
      const el = host.el as DrawerElement;

      el.show = () => {
        overlay.open('programmatic');
      };

      el.hide = () => {
        overlay.close('programmatic', false);
      };

      // ────────────────────────────────────────────────────────────
      // Event Handlers: Native Close, Escape, Backdrop Click
      // ────────────────────────────────────────────────────────────

      const handleNativeClose = () => {
        unlockBackground();
        host.el.removeAttribute('open');
        isOpen.value = false;
        restoreFocus();
        emit('close', { placement: props.placement.value ?? 'right', reason: closeReason });
        closeReason = 'programmatic';
      };

      const handleCancel = (e: Event) => {
        e.preventDefault();

        if (props.persistent.value) return;

        requestClose('escape');
      };

      const handleBackdropClick = (e: MouseEvent) => {
        if (props.persistent.value) return;

        if (e.target !== dialog) return; // Click inside panel

        requestClose('outside-click');
      };

      // Sync open prop → native dialog
      watch(
        props.open,
        (isOpen) => {
          if (isOpen) {
            overlay.open('programmatic');

            return;
          }

          overlay.close('programmatic', false);
        },
        { immediate: true },
      );

      handle(dialog, 'close', handleNativeClose);
      handle(dialog, 'cancel', handleCancel);
      handle(dialog, 'click', handleBackdropClick);

      return () => {
        if (dialog.open) {
          unlockBackground();
          dialog.close();
        }
      };
    });

    return html`
      <dialog
        ref=${dialogRef}
        aria-modal="true"
        :aria-label="${() => props.label.value ?? null}"
        :aria-labelledby="${() => (!props.label.value ? drawerLabelId : null)}">
        <div class="panel" part="panel" ref=${panelRef}>
          <div class="header" part="header" ?hidden=${() => !hasHeader.value}>
            <span class="header-title" id="${drawerLabelId}">
              <slot name="header">${() => props.title.value ?? ''}</slot>
            </span>
            <button
              class="close-btn"
              part="close-btn"
              type="button"
              aria-label="Close"
              ?hidden=${() => !props.dismissible.value}
              @click="${() => {
                const dialog = dialogRef.value;

                if (!dialog) return;

                requestClose('trigger');
              }}">
              <bit-icon name="x" size="16" stroke-width="2.5" aria-hidden="true"></bit-icon>
            </button>
          </div>
          <div class="body" part="body">
            <slot></slot>
          </div>
          <div class="footer" part="footer" ?hidden=${() => !hasFooter.value}>
            <slot name="footer"></slot>
          </div>
        </div>
      </dialog>
    `;
  },
  styles: [elevationMixin, forcedColorsMixin, coarsePointerMixin, reducedMotionMixin, styles],
});
