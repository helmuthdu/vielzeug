import {
  computed,
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

import type { AddEventListeners, BitDialogEvents, PaddingSize, RoundedSize } from '../../types';

import { coarsePointerMixin, elevationMixin, reducedMotionMixin, roundedVariantMixin } from '../../styles';
import { closeIcon } from '../icons';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_radius: var(--dialog-radius, var(--rounded-xl));
      --_padding: var(--dialog-padding, var(--size-4));
      --_gap: var(--dialog-gap, var(--size-4));
      --_max-width: var(--dialog-max-width, 32rem);
      --_elevation: var(--shadow-md);
      --_backdrop-filter: none;
      --_backdrop: var(--dialog-backdrop, rgba(0, 0, 0, 0.5));

      display: contents;
    }

    /* =====================
       Native <dialog> resets
       ===================== */

    dialog {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    /* all:unset removes the UA stylesheet's dialog:not([open]){display:none} — restore it */
    dialog:not([open]) {
      display: none;
    }

    dialog[open] {
      pointer-events: auto;
    }

    dialog::backdrop {
      background: var(--_backdrop);
      backdrop-filter: var(--_backdrop-filter);
      opacity: 1;
      transition: var(
        --_motion-transition,
        opacity var(--transition-normal) ease,
        overlay var(--transition-normal) ease allow-discrete,
        display var(--transition-normal) ease allow-discrete
      );

      @starting-style {
        opacity: 0;
      }
    }

    dialog.closing::backdrop {
      opacity: 0;
    }

    /* =====================
       Panel (the visible dialog box)
       ===================== */

    .panel {
      position: relative;
      display: flex;
      flex-direction: column;
      width: var(--_max-width);
      max-width: calc(100vw - var(--size-8));
      max-height: calc(100dvh - var(--size-8));
      background: var(--dialog-bg, var(--color-canvas));
      border-radius: var(--_radius);
      box-shadow: var(--dialog-shadow, var(--_elevation));
      border: var(--border) solid var(--dialog-border-color, var(--color-contrast-300));
      overflow: hidden;
      box-sizing: border-box;
      opacity: 1;
      transform: scale(1) translateY(0);
      transition: var(
        --_motion-transition,
        opacity var(--transition-normal) cubic-bezier(0.16, 1, 0.3, 1),
        transform var(--transition-normal) cubic-bezier(0.16, 1, 0.3, 1)
      );

      @starting-style {
        opacity: 0;
        transform: scale(0.96) translateY(var(--size-2));
      }
    }

    dialog.closing .panel {
      opacity: 0;
      transform: scale(0.96) translateY(var(--size-2));
    }

    /* =====================
       Sizes
       ===================== */

    .panel[data-size='sm'] {
      --_max-width: var(--dialog-max-width, 22rem);
    }

    .panel[data-size='md'] {
      --_max-width: var(--dialog-max-width, 32rem);
    }

    .panel[data-size='lg'] {
      --_max-width: var(--dialog-max-width, 48rem);
    }

    .panel[data-size='xl'] {
      --_max-width: var(--dialog-max-width, 64rem);
    }

    .panel[data-size='full'] {
      width: calc(100vw - var(--size-8));
      max-width: calc(100vw - var(--size-8));
      max-height: calc(100dvh - var(--size-8));
    }

    /* =====================
       Header
       ===================== */

    .header {
      display: flex;
      align-items: center;
      gap: var(--size-2);
      padding: var(--_padding);
      padding-bottom: 0;
      flex-shrink: 0;
    }

    .header[hidden] {
      display: none;
    }

    .title {
      flex: 1;
      font-weight: var(--font-semibold);
      font-size: var(--text-lg);
      line-height: var(--leading-tight);
      color: var(--color-contrast-900);
    }

    .close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--size-8);
      height: var(--size-8);
      min-height: var(--_touch-target);
      min-width: var(--_touch-target);
      margin-inline-start: auto;
      border: none;
      border-radius: var(--rounded-md);
      background: transparent;
      color: var(--color-contrast-500);
      cursor: pointer;
      padding: 0;
      transition: var(--_motion-transition, background var(--transition-fast), color var(--transition-fast));
    }

    .close:hover {
      background: var(--color-contrast-100);
      color: var(--color-contrast-900);
    }

    .close:focus-visible {
      outline: var(--border-2) solid var(--color-focus);
      outline-offset: var(--border-2);
    }

    .close[hidden] {
      display: none;
    }

    /* =====================
       Body
       ===================== */

    .body {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: var(--_padding);
      color: var(--color-contrast-700);
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
    }

    /* =====================
       Footer
       ===================== */

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--_gap);
      padding: var(--_padding);
      padding-top: 0;
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    .footer[hidden] {
      display: none;
    }

    /* =====================
       Dividers when header/footer present
       ===================== */

    .header:not([hidden]) + .body {
      padding-top: var(--size-4);
    }

    .body + .footer:not([hidden]) {
      padding-top: var(--size-4);
      border-top: var(--border) solid var(--color-contrast-100);
    }

    @media (max-width: 640px) {
      .panel,
      .panel[data-size='sm'],
      .panel[data-size='md'],
      .panel[data-size='lg'],
      .panel[data-size='xl'] {
        width: calc(100vw - var(--size-4));
        max-width: calc(100vw - var(--size-4));
        max-height: calc(100dvh - var(--size-4));
      }

      .header,
      .body,
      .footer {
        padding-inline: var(--size-3);
      }
    }
  }

  @layer buildit.config {
    :host([backdrop='blur']) {
      --_backdrop-filter: blur(var(--blur-xs));
    }
    :host([backdrop='transparent']) {
      --_backdrop: transparent;
    }
    /* Panel elevation / shadow scale */
    :host([elevation='none']) {
      --_elevation: var(--shadow-none);
    }
    :host([elevation='sm']) {
      --_elevation: var(--shadow-sm);
    }
    :host([elevation='md']) {
      --_elevation: var(--shadow-md);
    }
    :host([elevation='lg']) {
      --_elevation: var(--shadow-lg);
    }
    :host([elevation='xl']) {
      --_elevation: var(--shadow-xl);
    }
    :host([elevation='2xl']) {
      --_elevation: var(--shadow-2xl);
    }

    /* Padding scale */
    :host([padding='none']) {
      --_padding: var(--size-0);
    }
    :host([padding='sm']) {
      --_padding: var(--size-3);
    }
    :host([padding='md']) {
      --_padding: var(--size-4);
    }
    :host([padding='lg']) {
      --_padding: var(--size-6);
    }
    :host([padding='xl']) {
      --_padding: var(--size-8);
    }
  }
`;

type DialogBackdrop = 'opaque' | 'blur' | 'transparent';
type DialogElevation = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Dialog component properties */
export interface DialogProps {
  /** Controls the open state of the dialog */
  open?: boolean;
  /** Dialog title shown in the header (used as aria-label when no header slot) */
  label?: string;
  /** Dialog size */
  size?: DialogSize;
  /** Show a close (×) button in the header */
  dismissable?: boolean;
  /** When true, clicking the backdrop does not close the dialog */
  persistent?: boolean;
  /** Border radius */
  rounded?: RoundedSize | '';
  /** Backdrop style — 'blur' (default): dark overlay + blur; 'opaque': dark overlay only; 'transparent': no overlay */
  backdrop?: DialogBackdrop;
  /** Panel shadow elevation — defaults to 'xl' */
  elevation?: DialogElevation;
  /** Internal padding size */
  padding?: PaddingSize;
  /**
   * CSS selector for the element inside the dialog that should receive focus when the dialog opens.
   * Defaults to the first focusable element (browser default).
   * @example 'input[name="email"]' | '#confirm-btn'
   */
  'initial-focus'?: string;
  /**
   * When true (default), focus returns to the element that triggered the dialog after it closes.
   * Set to false if you want to manage focus manually.
   */
  'return-focus'?: boolean;
}

/**
 * A modal dialog that traps focus, blocks page interaction, and dismisses on
 * `Escape`. Built on the native `<dialog>` element for correct top-layer stacking
 * and browser-managed accessibility.
 *
 * @element bit-dialog
 *
 * @attr {boolean} open - Open/close the dialog
 * @attr {string} label - Dialog title (also used as aria-label)
 * @attr {string} size - Size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @attr {boolean} dismissable - Show a close (×) button in the header
 * @attr {boolean} persistent - Prevent backdrop-click from closing
 * @attr {string} rounded - Border radius size
 * @attr {string} backdrop - Backdrop style: 'opaque' (default) | 'blur' | 'transparent'
 * @attr {string} elevation - Panel shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 * @attr {string} padding - Padding: 'none' | 'sm' | 'md' | 'lg' | 'xl'
 *
 * @fires open - Fired when the dialog opens
 * @fires close - Fired when the dialog closes (any trigger)
 *
 * @slot - Dialog body content
 * @slot header - Custom header content (replaces the default title + close layout)
 * @slot footer - Action buttons or additional content at the bottom
 *
 * @cssprop --dialog-bg - Panel background color
 * @cssprop --dialog-border-color - Panel border color
 * @cssprop --dialog-radius - Panel border radius
 * @cssprop --dialog-shadow - Panel drop shadow
 * @cssprop --dialog-padding - Padding for header, body, and footer sections
 * @cssprop --dialog-gap - Gap between footer action buttons
 * @cssprop --dialog-backdrop - Backdrop overlay color
 * @cssprop --dialog-max-width - Maximum panel width (overridden by size prop)
 *
 * @example
 * ```html
 * <bit-dialog label="Confirm action" dismissable>
 *   <p>Are you sure you want to delete this item?</p>
 *   <div slot="footer">
 *     <bit-button variant="ghost" id="cancel">Cancel</bit-button>
 *     <bit-button color="error" id="confirm">Delete</bit-button>
 *   </div>
 * </bit-dialog>
 *
 * <script type="module">
 *   import '@vielzeug/buildit/dialog';
 *   const dialog = document.querySelector('bit-dialog');
 *   document.querySelector('#open-btn').addEventListener('click', () => {
 *     dialog.setAttribute('open', '');
 *   });
 *   document.querySelector('#cancel').addEventListener('click', () => {
 *     dialog.removeAttribute('open');
 *   });
 * </script>
 * ```
 */
export const TAG = define('bit-dialog', ({ host }) => {
  const props = defineProps<DialogProps>({
    backdrop: { default: undefined },
    dismissable: { default: false },
    elevation: { default: undefined },
    'initial-focus': { default: undefined },
    label: { default: '' },
    open: { default: false },
    padding: { default: undefined },
    persistent: { default: false },
    'return-focus': { default: true },
    rounded: { default: undefined },
    size: { default: 'md' },
  });

  const emit = defineEmits<{
    close: undefined;
    open: undefined;
  }>();

  const slots = defineSlots<{ default: unknown; footer: unknown; header: unknown }>();

  const dialogRef = ref<HTMLDialogElement>();

  const hasHeader = computed(() => slots.has('header').value || !!props.label.value || props.dismissable.value);
  const hasFooter = computed(() => slots.has('footer').value);

  // Collect all body children that are NOT this component's top-level host ancestor,
  // set inert on them when open to block screen readers from reaching background content.
  const getBackgroundEls = (): Element[] => {
    // Walk up from host to find the direct child of <body>
    let ancestor: Element = host;

    while (ancestor.parentElement && ancestor.parentElement !== document.body) {
      ancestor = ancestor.parentElement;
    }

    return Array.from(document.body.children).filter((el) => el !== ancestor);
  };

  let inerteledEls: Element[] = [];
  let returnFocusEl: HTMLElement | null = null;

  const lockBackground = () => {
    inerteledEls = getBackgroundEls().filter((el) => !el.hasAttribute('inert'));
    for (const el of inerteledEls) el.setAttribute('inert', '');
  };

  const unlockBackground = () => {
    for (const el of inerteledEls) el.removeAttribute('inert');
    inerteledEls = [];
  };

  onMount(() => {
    const dialog = dialogRef.value;

    if (!dialog) return;

    let isClosing = false;

    const getPanelEl = () => dialog.querySelector<HTMLElement>('.panel');

    const applyInitialFocus = () => {
      const selector = props['initial-focus'].value;

      if (selector) {
        // Search inside the host's light DOM children (slotted content)
        const target = host.querySelector<HTMLElement>(selector);

        if (target) {
          requestAnimationFrame(() => target.focus());

          return;
        }
      }
      // Fall back to native dialog focus management (first focusable element)
    };

    const closeWithAnimation = () => {
      if (isClosing || !dialog.open) return;

      isClosing = true;
      dialog.classList.add('closing');

      const panel = getPanelEl();
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

    // Open on initial mount if the prop is already true
    if (props.open.value && !dialog.open) {
      returnFocusEl = document.activeElement as HTMLElement | null;
      dialog.showModal();
      applyInitialFocus();
      lockBackground();
      emit('open');
    }

    // Sync prop changes → native dialog
    watch(props.open, (open) => {
      if (open) {
        if (!dialog.open) {
          returnFocusEl = document.activeElement as HTMLElement | null;
          dialog.showModal();
          applyInitialFocus();
          lockBackground();
          emit('open');
        }
      } else {
        closeWithAnimation();
      }
    });

    // Native dialog 'close' fires after animation finishes or on programmatic .close()
    const handleNativeClose = () => {
      unlockBackground();
      // Sync the open prop back to the host attribute if closed externally
      host.removeAttribute('open');

      // Return focus to the triggering element unless opted out
      if (props['return-focus'].value !== false && returnFocusEl) {
        returnFocusEl.focus();
        returnFocusEl = null;
      }

      emit('close');
    };

    // Intercept Escape to play exit animation first; also enforce persistent mode
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();

        if (!props.persistent.value) {
          closeWithAnimation();
        }
      }
    };

    // Backdrop click: the click target is the <dialog> element itself (not the panel)
    const handleBackdropClick = (e: MouseEvent) => {
      if (props.persistent.value) return;

      // When clicking the backdrop, the event target is the <dialog> element itself.
      // Clicks inside the panel bubble up with a more specific target.
      if (e.target === dialog) {
        closeWithAnimation();
      }
    };

    handle(dialog, 'close', handleNativeClose);
    handle(dialog, 'click', handleBackdropClick);
    handle(dialog, 'keydown', handleKeydown);

    return () => {
      // Ensure the native dialog is closed on unmount to release top-layer
      if (dialog.open) dialog.close();

      unlockBackground();
    };
  });

  const handleDismiss = () => {
    const dialog = dialogRef.value;

    if (!dialog) return;

    const event = new Event('close-request');

    dialog.dispatchEvent(event);
    dialog.classList.add('closing');

    const panel = dialog.querySelector<HTMLElement>('.panel');
    const finish = () => {
      dialog.classList.remove('closing');
      dialog.close();
    };

    if (panel && Number.parseFloat(getComputedStyle(panel).transitionDuration) > 0) {
      panel.addEventListener('transitionend', finish, { once: true });
    } else {
      finish();
    }
  };

  return {
    styles: [elevationMixin, roundedVariantMixin, coarsePointerMixin, reducedMotionMixin, componentStyles],
    template: html`
      <dialog
        ref=${dialogRef}
        class="dialog"
        part="dialog"
        :aria-label="${() => props.label.value || null}"
        aria-modal="true">
        <div class="overlay" part="overlay" aria-hidden="true"></div>
        <div class="panel" part="panel" :data-size="${props.size}">
          <div class="header" part="header" ?hidden=${() => !hasHeader.value}>
            <slot name="header">
              <span class="title" part="title">${() => props.label.value}</span>
            </slot>
            <button
              class="close"
              part="close"
              type="button"
              aria-label="Close dialog"
              ?hidden=${() => !props.dismissable.value}
              @click=${handleDismiss}>
              ${closeIcon}
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
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-dialog': HTMLElement & DialogProps & AddEventListeners<BitDialogEvents>;
  }
}
