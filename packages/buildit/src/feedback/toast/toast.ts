import { css, define, defineEmits, defineProps, html, onMount, ref, signal } from '@vielzeug/craftit';

import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

import { reducedMotionMixin } from '../../styles';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_position: var(--toast-position, fixed);
      --_inset-top: var(--toast-inset-top, auto);
      --_inset-bottom: var(--toast-inset-bottom, 1rem);
      --_inset-right: var(--toast-inset-right, 1rem);
      --_inset-left: var(--toast-inset-left, auto);
      --_z-index: var(--toast-z-index, 9999);
      --_max-width: var(--toast-max-width, 400px);
      --_gap: var(--toast-gap, 0.5rem);

      position: var(--_position);
      top: var(--_inset-top);
      bottom: var(--_inset-bottom);
      left: var(--_inset-left);
      right: var(--_inset-right);
      z-index: var(--_z-index);
      max-width: var(--_max-width);
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: var(--_gap);
    }

    /* Position variants */
    :host([position='top-left']) {
      --_inset-top: 1rem;
      --_inset-bottom: auto;
      --_inset-left: 1rem;
      --_inset-right: auto;
    }
    :host([position='top-center']) {
      --_inset-top: 1rem;
      --_inset-bottom: auto;
      --_inset-left: 50%;
      --_inset-right: auto;
      transform: translateX(-50%);
    }
    :host([position='top-right']) {
      --_inset-top: 1rem;
      --_inset-bottom: auto;
      --_inset-right: 1rem;
      --_inset-left: auto;
    }
    :host([position='bottom-left']) {
      --_inset-bottom: 1rem;
      --_inset-left: 1rem;
      --_inset-right: auto;
      --_inset-top: auto;
    }
    :host([position='bottom-center']) {
      --_inset-bottom: 1rem;
      --_inset-left: 50%;
      --_inset-right: auto;
      --_inset-top: auto;
      transform: translateX(-50%);
    }
    :host([position='bottom-right']) {
      --_inset-bottom: 1rem;
      --_inset-right: 1rem;
      --_inset-left: auto;
      --_inset-top: auto;
    }

    .toast-container {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
      row-gap: 0;
      perspective: 1200px;
      perspective-origin: center center;
      transition: var(--_motion-transition, row-gap var(--transition-normal, 0.35s) ease);
    }

    /* Keep ARIA live regions without affecting stacking layout geometry. */
    .toast-live-region {
      display: contents;
    }

    :host(.hovered) .toast-container {
      row-gap: var(--_gap);
    }

    :host(:not(.hovered)) .toast-wrapper {
      grid-column: 1;
      grid-row: 1;
      align-self: end;
    }

    :host([position^='top']:not(.hovered)) .toast-wrapper {
      align-self: start;
    }

    .toast-wrapper {
      pointer-events: auto;
      position: relative;
      transform-origin: center bottom;
      transition: var(
        --_motion-transition,
        transform 0.5s cubic-bezier(0.34, 1.1, 0.64, 1),
        opacity 0.5s cubic-bezier(0.34, 1.1, 0.64, 1),
        filter 0.5s cubic-bezier(0.34, 1.1, 0.64, 1)
      );
      will-change: transform, opacity, filter;
    }

    /* Enter animation via @starting-style — no JS class needed */
    @starting-style {
      .toast-wrapper {
        opacity: 0;
        transform: translateY(1.5rem) scale(0.92);
      }

      :host([position^='top']) .toast-wrapper {
        transform: translateY(-1.5rem) scale(0.92);
      }
    }

    /* Exit animation */
    .toast-wrapper.exiting {
      animation: var(--_motion-animation, toast-exit 0.3s ease-out forwards);
      pointer-events: none;
      z-index: -1 !important;
      transition: none !important;
    }

    @keyframes toast-exit {
      to {
        opacity: 0;
        transform: scale(0.7);
      }
    }

    /* Stacking (collapsed) */
    :host(:not(.hovered)) .toast-wrapper:nth-last-child(1) {
      z-index: 3;
      transform: translateY(0) scale(1);
      opacity: 1;
      filter: brightness(1);
    }

    :host(:not(.hovered)) .toast-wrapper:nth-last-child(2) {
      z-index: 2;
      transform: translateY(-8px) scale(0.95) rotateX(3deg);
      opacity: 0.85;
      filter: brightness(0.95);
      pointer-events: none;
    }

    :host(:not(.hovered)) .toast-wrapper:nth-last-child(3) {
      z-index: 1;
      transform: translateY(-14px) scale(0.9) rotateX(5deg);
      opacity: 0.7;
      filter: brightness(0.9);
      pointer-events: none;
    }

    :host(:not(.hovered)) .toast-wrapper:nth-last-child(n + 4) {
      opacity: 0;
      pointer-events: none;
    }

    /* Expanded (hovered) */
    :host(.hovered) .toast-wrapper {
      grid-column: 1;
      grid-row: auto;
      align-self: stretch;
      transform: none !important;
      opacity: 1 !important;
      filter: brightness(1) !important;
      z-index: auto !important;
      pointer-events: auto !important;
    }

    /* Staggered expand delays */
    :host(.hovered) .toast-wrapper:nth-last-child(2) {
      transition-delay: 0.05s;
    }
    :host(.hovered) .toast-wrapper:nth-last-child(3) {
      transition-delay: 0.1s;
    }
    :host(.hovered) .toast-wrapper:nth-last-child(n + 4) {
      transition-delay: 0.15s;
    }

    /* Top positions: reverse stacking direction */
    :host([position^='top']) .toast-wrapper {
      transform-origin: center top;
    }

    :host([position^='top']:not(.hovered)) .toast-wrapper:nth-last-child(2) {
      transform: translateY(8px) scale(0.95) rotateX(-3deg);
    }

    :host([position^='top']:not(.hovered)) .toast-wrapper:nth-last-child(3) {
      transform: translateY(14px) scale(0.9) rotateX(-5deg);
    }

    ::slotted(bit-alert) {
      margin: 0;
      box-shadow: var(--shadow-lg);
      width: 100%;
    }

    .toast-wrapper.exiting ::slotted(bit-alert) {
      transition: none !important;
    }

    .toast-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--size-4);
    }

    /* ========================================
       Responsive: small screens
       ======================================== */

    @media (max-width: 480px) {
      :host {
        --_max-width: calc(100vw - var(--size-4));
        --_inset-right: var(--size-2);
        --_inset-left: var(--size-2);
      }
      :host([position='top-center']),
      :host([position='bottom-center']) {
        --_inset-left: var(--size-2);
        transform: none;
        inset-inline-start: var(--size-2);
      }
    }
  }
`;

/** Toast container properties */
export interface ToastProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  max?: number;
}

/** Individual toast notification */
export interface ToastItem {
  /** Auto-generated via crypto.randomUUID() if omitted */
  id?: string;
  message: string;
  color?: ThemeColor;
  heading?: string;
  variant?: 'solid' | 'flat' | 'bordered';
  size?: ComponentSize;
  rounded?: RoundedSize | '';
  /** Auto-dismiss delay in ms. Set to 0 for persistent toasts (default: 5000) */
  duration?: number;
  dismissible?: boolean;
  /** Metadata text (e.g. timestamp) shown in the alert meta slot */
  meta?: string;
  /** Show message and actions side-by-side (horizontal layout) */
  horizontal?: boolean;
  /**
   * Urgency level for screen readers.
   * - `'polite'` (default): uses `aria-live="polite"` — announced after the user finishes their current action.
   * - `'assertive'`: uses `aria-live="assertive"` — interrupts the user immediately. Use only for critical errors.
   */
  urgency?: 'polite' | 'assertive';
  actions?: Array<{
    color?: ThemeColor;
    label: string;
    onClick?: () => void;
    variant?: VisualVariant;
  }>;
  /** Called after the toast is fully dismissed and removed */
  onDismiss?: () => void;
}

type NormalizedToast = ToastItem & { id: string };

/** Public API of the bit-toast element */
export interface ToastElement extends HTMLElement {
  add: (toast: ToastItem) => string;
  update: (id: string, updates: Partial<ToastItem>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

/**
 * A toast notification container with Time Machine-style stacking animation.
 * Stacks up to 3 notifications with a 3D effect. Hover to expand all toasts.
 *
 * @element bit-toast
 *
 * @attr {string} position - 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
 * @attr {number} max - Max toasts in DOM at once (default: 5)
 *
 * @fires add - When a toast is added `{ id }`
 * @fires dismiss - When a toast is dismissed `{ id }`
 *
 * @slot - Manually placed bit-alert elements
 *
 * @cssprop --toast-position - Position type (default: fixed)
 * @cssprop --toast-inset-top - Top inset
 * @cssprop --toast-inset-bottom - Bottom inset
 * @cssprop --toast-inset-left - Left inset
 * @cssprop --toast-inset-right - Right inset
 * @cssprop --toast-z-index - Z-index (default: 9999)
 * @cssprop --toast-max-width - Max width (default: 400px)
 * @cssprop --toast-gap - Gap between expanded toasts (default: 0.5rem)
 *
 * @example
 * ```html
 * <!-- Declarative: place once in HTML -->
 * <bit-toast position="bottom-right"></bit-toast>
 *
 * <!-- Programmatic: use the singleton service -->
 * <script type="module">
 *   import { toast } from '@vielzeug/buildit';
 *   toast.add({ message: 'Changes saved!', color: 'success' });
 * </script>
 * ```
 */
/** Renders the actions slot for a toast item */
function renderToastActions(toast: NormalizedToast, onDismiss: () => void) {
  if (!toast.actions?.length) return '';

  return html`
    <div slot="actions" class="toast-actions">
      ${toast.actions.map(
        (action) => html`
          <bit-button
            size="sm"
            color=${action.color || toast.color || 'primary'}
            variant=${action.variant || 'solid'}
            @click=${() => {
              action.onClick?.();
              onDismiss();
            }}
            >${action.label}</bit-button
          >
        `,
      )}
    </div>
  `;
}

export const TAG = define('bit-toast', ({ host }) => {
  const props = defineProps<ToastProps>({
    max: { default: 5 },
    position: { default: 'bottom-right' },
  });

  const emit = defineEmits<{
    add: { id: string };
    dismiss: { id: string };
  }>();

  const toasts = signal<NormalizedToast[]>([]);
  const exitingIds = signal<Set<string>>(new Set());
  const containerRef = ref<HTMLDivElement>();
  const timers = new Map<string, { remaining: number; startedAt: number; timeoutId: number }>();

  // Sequential dismiss queue — only one toast exits at a time so animations never overlap.
  const dismissQueue: string[] = [];
  let isDismissing = false;

  const setExiting = (id: string, value: boolean) => {
    const next = new Set(exitingIds.value);

    if (value) next.add(id);
    else next.delete(id);

    exitingIds.value = next;
  };

  const withExitAnimation = (el: HTMLElement, onDone: () => void) => {
    const animName = getComputedStyle(el).animationName.replace(/none/g, '').trim();

    if (!animName) {
      onDone();

      return;
    }

    let called = false;
    const done = () => {
      if (!called) {
        called = true;
        onDone();
      }
    };

    el.addEventListener('animationend', done, { once: true });
    window.setTimeout(done, 350);
  };

  const scheduleRemoval = (id: string, duration: number) => {
    const timeoutId = window.setTimeout(() => {
      removeToast(id);
      timers.delete(id);
    }, duration);

    timers.set(id, { remaining: duration, startedAt: Date.now(), timeoutId });
  };

  let isPaused = false;

  const pauseTimers = () => {
    if (isPaused) return;

    isPaused = true;
    for (const [id, t] of timers) {
      clearTimeout(t.timeoutId);
      timers.set(id, { ...t, remaining: Math.max(0, t.remaining - (Date.now() - t.startedAt)) });
    }
  };

  const resumeTimers = () => {
    if (!isPaused) return;

    isPaused = false;
    for (const [id, t] of timers) {
      if (t.remaining <= 0) continue;

      scheduleRemoval(id, t.remaining);
    }
  };

  const addToast = (toast: ToastItem): string => {
    const id = toast.id || crypto.randomUUID();
    const item: NormalizedToast = { dismissible: true, duration: 5000, ...toast, id };

    toasts.value = [...toasts.value, item].slice(-props.max.value);
    emit('add', { id });

    if (item.duration! > 0) scheduleRemoval(id, item.duration!);

    return id;
  };

  const removeToast = (id: string) => {
    // Cancel the auto-dismiss timer if one is running.
    const timer = timers.get(id);

    if (timer) {
      clearTimeout(timer.timeoutId);
      timers.delete(id);
    }

    // Skip if already exiting or already queued.
    if (exitingIds.value.has(id) || dismissQueue.includes(id)) return;

    if (isDismissing) {
      dismissQueue.push(id);

      return;
    }

    isDismissing = true;
    executeRemoval(id);
  };

  // Internal: actually animate and remove. Always called from processNextInQueue or directly
  // when the queue is empty.
  const executeRemoval = (id: string) => {
    // Guard: could have been removed by clearAll between queue entry and execution.
    if (exitingIds.value.has(id)) {
      processNextInQueue();

      return;
    }

    const item = toasts.value.find((t) => t.id === id);
    const wrapper = containerRef.value?.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);

    const finalize = () => {
      setExiting(id, false);
      toasts.value = toasts.value.filter((t) => t.id !== id);
      item?.onDismiss?.();
      emit('dismiss', { id });
      processNextInQueue();
    };

    if (wrapper) {
      setExiting(id, true);
      withExitAnimation(wrapper, finalize);
    } else {
      finalize();
    }
  };

  const processNextInQueue = () => {
    if (dismissQueue.length === 0) {
      isDismissing = false;

      return;
    }

    const nextId = dismissQueue.shift()!;

    executeRemoval(nextId);
  };

  const updateToast = (id: string, updates: Partial<ToastItem>) => {
    toasts.value = toasts.value.map((t) => (t.id === id ? { ...t, ...updates, id } : t));

    if (updates.duration === undefined) return;

    const timer = timers.get(id);

    if (timer) clearTimeout(timer.timeoutId);

    timers.delete(id);

    if (updates.duration > 0) scheduleRemoval(id, updates.duration);
  };

  const clearAll = () => {
    for (const [, t] of timers) clearTimeout(t.timeoutId);
    timers.clear();

    // Drain any pending queue entries and replace with the full current list so
    // they exit one-by-one in order.
    dismissQueue.length = 0;

    const ids = toasts.value.map((t) => t.id).filter((id) => !exitingIds.value.has(id));

    if (!ids.length) return;

    dismissQueue.push(...ids);

    if (!isDismissing) processNextInQueue();
  };

  onMount(() => {
    const el = host as ToastElement;

    el.add = addToast;
    el.update = updateToast;
    el.dismiss = removeToast;
    el.clear = clearAll;
  });

  const urgencyOf = (t: NormalizedToast) => t.urgency ?? (t.color === 'error' ? 'assertive' : 'polite');

  let focusPaused = false;
  let hoverPaused = false;
  const maybePause = () => pauseTimers();
  const maybeResume = () => {
    if (!focusPaused && !hoverPaused) resumeTimers();
  };

  const setHovered = (hovered: boolean) => {
    hoverPaused = hovered;
    host.classList.toggle('hovered', hovered);

    if (hovered) maybePause();
    else maybeResume();
  };

  const renderToastItem = (toast: NormalizedToast) => html`
    <div
      class=${() => `toast-wrapper${exitingIds.value.has(toast.id) ? ' exiting' : ''}`}
      data-toast-id=${toast.id}
      part="toast-wrapper">
      <bit-alert
        color=${toast.color || (toast.urgency === 'assertive' ? 'error' : 'primary')}
        variant=${toast.variant || 'solid'}
        size=${toast.size || 'md'}
        rounded=${toast.rounded || 'md'}
        ?dismissible=${toast.dismissible}
        ?inline=${toast.horizontal}
        heading=${toast.heading || ''}
        @dismiss=${() => removeToast(toast.id)}>
        ${toast.meta ? html`<span slot="meta">${toast.meta}</span>` : ''} ${toast.message}
        ${renderToastActions(toast, () => removeToast(toast.id))}
      </bit-alert>
    </div>
  `;

  return {
    styles: [reducedMotionMixin, componentStyles],
    template: html`
      <div
        class="toast-container"
        ref=${containerRef}
        @mouseenter=${() => setHovered(true)}
        @mouseleave=${() => setHovered(false)}
        @focusin=${() => {
          focusPaused = true;
          maybePause();
        }}
        @focusout=${() => {
          focusPaused = false;
          maybeResume();
        }}
        part="container">
        <!-- Polite live region: normal informational toasts -->
        <div
          role="region"
          aria-live="polite"
          aria-relevant="additions removals"
          aria-atomic="false"
          aria-label="Notifications"
          class="toast-live-region">
          ${() => toasts.value.filter((t) => urgencyOf(t) === 'polite').map(renderToastItem)}
        </div>
        <!-- Assertive live region: critical errors that interrupt immediately -->
        <div
          role="region"
          aria-live="assertive"
          aria-relevant="additions removals"
          aria-atomic="false"
          aria-label="Critical notifications"
          class="toast-live-region">
          ${() => toasts.value.filter((t) => urgencyOf(t) === 'assertive').map(renderToastItem)}
        </div>
        <slot></slot>
      </div>
    `,
  };
});

// ─── Singleton toast service ─────────────────────────────────────────────────

const getHost = (): ToastElement => {
  let el = document.querySelector<ToastElement>('bit-toast');

  if (!el) {
    el = document.createElement('bit-toast') as ToastElement;
    document.body.appendChild(el);
  }

  return el;
};

/**
 * Singleton service for triggering toasts without direct DOM references.
 *
 * @example
 * ```ts
 * import { toast } from '@vielzeug/buildit';
 *
 * toast.add({ message: 'Saved!', color: 'success' });
 *
 * const id = toast.add({ message: 'Uploading…', duration: 0, dismissible: false });
 * toast.update(id, { message: 'Done!', color: 'success', duration: 3000, dismissible: true });
 *
 * await toast.promise(uploadFile(), {
 *   loading: 'Uploading…',
 *   success: (url) => `Uploaded to ${url}`,
 *   error: 'Upload failed',
 * });
 * ```
 */
export const toast = {
  /** Add a toast and return its id */
  add(item: ToastItem): string {
    return getHost().add(item);
  },

  /** Dismiss all toasts (animated) */
  clear(): void {
    getHost().clear();
  },
  /** Configure the auto-created container. Call before the first `add()` if the defaults need to change. */
  configure(config: ToastProps): void {
    const el = getHost();

    if (config.position) el.setAttribute('position', config.position);

    if (config.max != null) el.setAttribute('max', String(config.max));
  },

  /**
   * Shows a loading toast tied to a promise.
   * Updates to success/error when the promise settles.
   */
  async promise<T>(
    promise: Promise<T>,
    messages: {
      error: string | ((err: unknown) => string);
      loading: string;
      success: string | ((data: T) => string);
    },
  ): Promise<T> {
    const id = toast.add({ color: 'primary', dismissible: false, duration: 0, message: messages.loading });

    try {
      const data = await promise;

      toast.update(id, {
        color: 'success',
        dismissible: true,
        duration: 5000,
        message: typeof messages.success === 'function' ? messages.success(data) : messages.success,
      });

      return data;
    } catch (err) {
      toast.update(id, {
        color: 'error',
        dismissible: true,
        duration: 5000,
        message: typeof messages.error === 'function' ? messages.error(err) : messages.error,
      });
      throw err;
    }
  },

  /** Dismiss a toast by id */
  remove(id: string): void {
    getHost().dismiss(id);
  },

  /** Update an existing toast in-place */
  update(id: string, updates: Partial<ToastItem>): void {
    getHost().update(id, updates);
  },
};

declare global {
  interface HTMLElementTagNameMap {
    'bit-toast': ToastElement;
  }
}
