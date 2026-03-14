import {
  computed,
  createId,
  css,
  define,
  defineEmits,
  defineProps,
  defineSlots,
  handle,
  html,
  onMount,
  ref,
  watch,
} from '@vielzeug/craftit';

import type { AddEventListeners } from '../../types';

import { coarsePointerMixin, elevationMixin, forcedColorsMixin, reducedMotionMixin } from '../../styles';
import { closeIcon } from '../icons';

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';
type DrawerSize = 'sm' | 'lg' | 'full';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      --_backdrop: var(--drawer-backdrop, rgba(0, 0, 0, 0.5));
      --_panel-bg: var(--drawer-bg, var(--color-canvas));
      --_panel-shadow: var(--drawer-shadow, var(--shadow-xl));
      --_transition: var(--transition-normal);
      display: contents;
    }

    dialog {
      all: unset;
      display: flex;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      pointer-events: none;
      box-sizing: border-box;
    }

    dialog:not([open]) {
      display: none;
    }
    dialog[open] {
      pointer-events: auto;
    }

    dialog::backdrop {
      background: var(--_backdrop);
      opacity: 1;
      transition: var(
        --_motion-transition,
        opacity var(--_transition) ease,
        overlay var(--_transition) ease allow-discrete,
        display var(--_transition) ease allow-discrete
      );

      @starting-style {
        opacity: 0;
      }
    }

    dialog.closing::backdrop {
      opacity: 0;
    }

    .panel {
      position: absolute;
      display: flex;
      flex-direction: column;
      background: var(--_panel-bg);
      box-shadow: var(--_panel-shadow);
      overflow: hidden;
      box-sizing: border-box;
      /* Default: right drawer */
      transition: var(
        --_motion-transition,
        transform var(--_transition) ease,
        overlay var(--_transition) ease allow-discrete,
        display var(--_transition) ease allow-discrete
      );
    }

    dialog.closing .panel {
      transform: var(--_panel-exit-transform);
    }

    /* ========================
       Placement variants
       ======================== */

    /* left */
    :host([placement='left']) .panel {
      --_panel-exit-transform: translateX(-100%);
      inset-inline-start: 0;
      inset-block: 0;
      width: var(--drawer-size, 20rem);
      max-width: calc(100vw - var(--size-4));

      @starting-style {
        transform: translateX(-100%);
      }
    }

    /* right (default) */
    :host(:not([placement])) .panel,
    :host([placement='right']) .panel {
      --_panel-exit-transform: translateX(100%);
      inset-inline-end: 0;
      inset-block: 0;
      width: var(--drawer-size, 20rem);
      max-width: calc(100vw - var(--size-4));

      @starting-style {
        transform: translateX(100%);
      }
    }

    /* top */
    :host([placement='top']) .panel {
      --_panel-exit-transform: translateY(-100%);
      inset-block-start: 0;
      inset-inline: 0;
      height: var(--drawer-size, 16rem);
      max-height: calc(100dvh - var(--size-4));

      @starting-style {
        transform: translateY(-100%);
      }
    }

    /* bottom */
    :host([placement='bottom']) .panel {
      --_panel-exit-transform: translateY(100%);
      inset-block-end: 0;
      inset-inline: 0;
      height: var(--drawer-size, 16rem);
      max-height: calc(100dvh - var(--size-4));

      @starting-style {
        transform: translateY(100%);
      }
    }

    /*
     * RTL overrides for horizontal placements:
     * 'left' uses inset-inline-start (= physical right in RTL), so the out-of-view
     * position shifts to the opposite physical side.
     * 'right' uses inset-inline-end (= physical left in RTL), same logic applies.
     */
    :host(:dir(rtl)[placement='left']) .panel {
      --_panel-exit-transform: translateX(100%);

      @starting-style {
        transform: translateX(100%);
      }
    }

    :host(:dir(rtl)[placement='right']) .panel,
    :host(:dir(rtl):not([placement])) .panel {
      --_panel-exit-transform: translateX(-100%);

      @starting-style {
        transform: translateX(-100%);
      }
    }

    /* ========================
       Size utilities
       ======================== */

    :host([size='sm']) {
      --drawer-size: 14rem;
    }
    :host([size='lg']) {
      --drawer-size: 32rem;
    }
    :host([size='full']) {
      --drawer-size: 100%;
    }
    :host([size='full']) .panel {
      max-width: 100%;
      max-height: 100%;
    }

    /* ========================
       Header / Body / Footer slots
       ======================== */

    .header {
      display: flex;
      align-items: center;
      padding-block: var(--size-4);
      padding-inline: var(--size-4) var(--size-10);
      gap: var(--size-4);
      border-bottom: var(--border) solid var(--color-contrast-200);
      flex-shrink: 0;
    }

    .header-title {
      flex: 1;
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--size-4);
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--size-2);
      padding: var(--size-4);
      border-top: var(--border) solid var(--color-contrast-200);
      flex-shrink: 0;
    }

    /* Close button — absolute-positioned, independent of header slot presence */
    .close-btn {
      all: unset;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--rounded-sm);
      padding: var(--size-1);
      color: var(--color-contrast-500);
      position: absolute;
      inset-block-start: var(--size-3);
      inset-inline-end: var(--size-3);
      z-index: 1;
      min-height: var(--_touch-target);
      min-width: var(--_touch-target);
    }

    .close-btn:hover {
      color: var(--color-contrast-800);
      background: var(--color-contrast-100);
    }
    .close-btn:focus-visible {
      outline: var(--focus-ring);
    }

    @media (max-width: 640px) {
      :host([placement='left']) .panel,
      :host(:not([placement])) .panel,
      :host([placement='right']) .panel {
        width: min(var(--drawer-size, 20rem), calc(100vw - var(--size-2)));
        max-width: calc(100vw - var(--size-2));
      }

      :host([placement='top']) .panel,
      :host([placement='bottom']) .panel {
        height: min(var(--drawer-size, 16rem), calc(100dvh - var(--size-2)));
        max-height: calc(100dvh - var(--size-2));
      }

      .header,
      .body,
      .footer {
        padding: var(--size-3);
      }
    }
  }
`;

/** Element interface exposing the imperative API for `bit-drawer`. */
export interface DrawerElement extends HTMLElement, Omit<DrawerProps, 'title'> {
  /** Programmatically open the drawer. Equivalent to setting `open`. */
  show(): void;
  /** Programmatically close the drawer with the exit animation. */
  hide(): void;
}

/** Drawer component properties */
export interface DrawerProps {
  /** Controlled open state */
  open?: boolean;
  /** Side from which the drawer slides in */
  placement?: DrawerPlacement;
  /** Drawer width/height preset */
  size?: DrawerSize;
  /**
   * Visible title text rendered inside the header.
   * Used as the dialog's accessible label via `aria-labelledby` when `label` is not set.
   */
  title?: string;
  /**
   * Invisible accessible label for the dialog (`aria-label`).
   * Use when the drawer has no visible title (e.g. image-only content).
   * When omitted, `aria-labelledby` points to the visible header title instead.
   */
  label?: string;
  /** Show the close (×) button in the header (default: true) */
  dismissable?: boolean;
  /** When true, backdrop clicks do not close the drawer (default: false) */
  persistent?: boolean;
  /**
   * CSS selector for the element inside the drawer that should receive focus on open.
   * Defaults to native dialog focus management (first focusable element).
   * @example '#submit-btn' | 'input[name="email"]'
   */
  'initial-focus'?: string;
  /**
   * When true (default), focus returns to the triggering element after the drawer closes.
   * Set to false to manage focus manually.
   */
  'return-focus'?: boolean;
}

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
 * @attr {boolean} dismissable - Show the close (×) button (default: true)
 * @attr {boolean} persistent - Prevent backdrop-click from closing (default: false)
 *
 * @slot header - Drawer header content
 * @slot - Main body content
 * @slot footer - Drawer footer content
 *
 * @fires open - When the drawer opens
 * @fires close - When the drawer closes
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
export const TAG = define('bit-drawer', ({ host }) => {
  const slots = defineSlots<{ default: unknown; footer: unknown; header: unknown }>();
  const props = defineProps<DrawerProps>({
    dismissable: { default: true },
    'initial-focus': { default: undefined },
    label: { default: undefined },
    open: { default: false },
    persistent: { default: false },
    placement: { default: 'right' },
    'return-focus': { default: true },
    size: { default: undefined },
    title: { default: undefined },
  });

  const emit = defineEmits<{
    close: { placement: DrawerPlacement };
    open: { placement: DrawerPlacement };
  }>();

  const drawerLabelId = createId('drawer-label');
  const dialogRef = ref<HTMLDialogElement>();
  const panelRef = ref<HTMLDivElement>();
  // Captures the element that had focus when the drawer opened, so we can restore after close.
  // On page load, document.activeElement is <body>; restoring to it is harmless.
  let returnFocusEl: HTMLElement | null = null;
  let isClosing = false;

  // Header is visible when there is slot content or a title prop.
  // The close button is independently positioned — always in the top-end corner of the panel.
  const hasHeader = computed(() => slots.has('header').value || !!props.title.value);
  const hasFooter = computed(() => slots.has('footer').value);

  const applyInitialFocus = () => {
    const selector = props['initial-focus'].value;

    if (selector) {
      const target = host.querySelector<HTMLElement>(selector);

      if (target) requestAnimationFrame(() => target.focus());
    }
  };

  /**
   * Dispatches a cancellable `close-request` event. If not prevented, triggers the close animation.
   * Consumers can call `e.preventDefault()` to block closing (e.g. when there are unsaved changes).
   */
  const requestClose = (trigger: 'backdrop' | 'button' | 'escape') => {
    const allowed = host.dispatchEvent(
      new CustomEvent('close-request', {
        bubbles: true,
        cancelable: true,
        detail: { placement: props.placement.value ?? 'right', trigger },
      }),
    );

    if (allowed) closeWithAnimation();
  };

  const openDrawer = () => {
    const dialog = dialogRef.value;

    if (!dialog || dialog.open) return;

    returnFocusEl = document.activeElement as HTMLElement;
    dialog.showModal();
    applyInitialFocus();
    emit('open', { placement: props.placement.value ?? 'right' });
  };

  const closeWithAnimation = () => {
    const dialog = dialogRef.value;

    if (!dialog?.open || isClosing) return;

    isClosing = true;
    dialog.classList.add('closing');

    const panel = panelRef.value;
    const finish = () => {
      dialog.classList.remove('closing');
      isClosing = false;
      dialog.close();
    };

    if (panel && Number.parseFloat(getComputedStyle(panel).transitionDuration) > 0) {
      panel.addEventListener('transitionend', finish, { once: true });
    } else {
      finish();
    }
  };

  onMount(() => {
    const dialog = dialogRef.value;

    if (!dialog) return;

    // Expose imperative API on the element instance.
    const el = host as DrawerElement;

    el.show = openDrawer;
    el.hide = closeWithAnimation;

    // Fires after every close (animation or programmatic). Syncs state and returns focus.
    const handleNativeClose = () => {
      host.removeAttribute('open');

      if (props['return-focus'].value !== false && returnFocusEl) {
        returnFocusEl.focus();
        returnFocusEl = null;
      }

      emit('close', { placement: props.placement.value ?? 'right' });
    };

    // Intercept Escape so the exit animation runs before dialog.close().
    const handleCancel = (e: Event) => {
      e.preventDefault();

      if (!props.persistent.value) requestClose('escape');
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (!props.persistent.value && e.target === dialog) requestClose('backdrop');
    };

    // { immediate: true } handles both the initial state and future changes.
    // Initial mount with open=false: closeWithAnimation() is a no-op since the dialog isn't open yet.
    watch(
      props.open,
      (isOpen) => {
        if (isOpen) openDrawer();
        else closeWithAnimation();
      },
      { immediate: true },
    );

    handle(dialog, 'close', handleNativeClose);
    handle(dialog, 'cancel', handleCancel);
    handle(dialog, 'click', handleBackdropClick);

    return () => {
      // Release the top-layer slot if the element is removed while open.
      if (dialog.open) dialog.close();
    };
  });

  return {
    styles: [elevationMixin, forcedColorsMixin, coarsePointerMixin, reducedMotionMixin, styles],
    template: html`
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
          </div>
          <button
            class="close-btn"
            part="close-btn"
            type="button"
            aria-label="Close"
            ?hidden=${() => !props.dismissable.value}
            @click="${() => requestClose('button')}">
            ${closeIcon}
          </button>
          <div class="body" part="body">
            <slot></slot>
          </div>
          <div class="footer" part="footer" ?hidden=${() => !hasFooter.value}>
            <slot name="footer"></slot>
          </div>
        </div>
      </dialog>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-drawer': DrawerElement &
      AddEventListeners<{
        close: CustomEvent<{ placement: DrawerPlacement }>;
        'close-request': CustomEvent<{ placement: DrawerPlacement; trigger: 'backdrop' | 'button' | 'escape' }>;
        open: CustomEvent<{ placement: DrawerPlacement }>;
      }>;
  }
}
