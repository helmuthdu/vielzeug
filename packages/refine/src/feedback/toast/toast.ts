import { createPanGesture, type PanGesture } from '@vielzeug/gesture';
import { define, each, getHost, html, onCleanup, onMounted, prop, ref, useEmit } from '@vielzeug/ore';
import { computed, type Readable, signal, watch } from '@vielzeug/ripple';
import type { OreAvatarProps } from '../../content/avatar/avatar';
import { lifecycleSignal } from '../../core';
import type { ButtonEmphasis, ButtonVariant } from '../../inputs/button/button';
import { createLayoutMotion } from '../../shared/layout-motion';
import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';
import componentStyles from './toast.css?inline';

// The avatar is a rendered child: registering it through a TAG re-export keeps
// the custom-element link alive across cross-entry chunking.
export { AVATAR_TAG } from '../../content/avatar/avatar';
export { ICON_TAG } from '../../content/icon/icon';
export { ALERT_TAG } from '../alert/alert';

/**
 * Default exit budget in milliseconds: without a bound view, removal happens
 * this long (plus a small buffer) after dismissal on a store-owned timeout.
 * A bound view reschedules the same timeout with the real exit-transition
 * duration (`--toast-exit-duration`, read from computed style) and finalizes
 * early on `transitionend`, so a themed duration is never clipped; this
 * constant only covers a viewless store or an unparseable token.
 */
const DEFAULT_EXIT_MS = 200;

/** Slack added to a measured exit duration before the backstop fires. */
const EXIT_BUFFER_MS = 50;

export type OreToastEvents = {
  add: { id: string };
  dismiss: { id: string };
};

/** Runtime events exposed through {@link ToastService.tap}. */
export type ToastEvent = { id: string; type: 'add' | 'dismiss' } | { type: 'dispose' };

export type OreToastProps = {
  max?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
};

/**
 * Notification severity. Drives the status icon, the accent color, and the
 * default screen-reader urgency; it never fills the surface, which stays a
 * neutral light/dark card so a stack of notifications stays calm and legible.
 */
export const TOAST_STATUSES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
export type ToastStatus = (typeof TOAST_STATUSES)[number];

/** Individual toast notification. */
export type ToastItem = {
  actions?: Array<{
    /** Explicit button color; overrides `emphasis`. */
    color?: ThemeColor;
    /**
     * Semantic role of the action, reusing ore-button's emphasis: 'primary' (accent
     * fill), 'cancel' (neutral ghost), 'destructive' (error ink), or 'normal'. Picks
     * the treatment so a confirm/cancel pair reads with real hierarchy. An explicit
     * `color`/`variant` overrides it. Deliberately independent of the toast `status`:
     * a danger toast's Undo is a recovery action, not a destructive one.
     */
    emphasis?: ButtonEmphasis;
    label: string;
    onClick?: () => void;
    /** Explicit button variant; overrides `emphasis`. */
    variant?: ButtonVariant;
  }>;
  /**
   * Avatar rendered in the leading slot instead of the status icon: pass an
   * ore-avatar props object (`initials`, `src`, `alt`, `color`, `status`) for a
   * person-centric notification. The avatar replaces the icon, so `status` no
   * longer renders its glyph (it still tints the accent and sets urgency).
   */
  avatar?: Partial<OreAvatarProps>;
  dismissible?: boolean;
  /** Auto-dismiss delay in ms. Set to 0 for persistent toasts (default: 5000). */
  duration?: number;
  heading?: string;
  /** Show message and actions side-by-side (horizontal layout). */
  horizontal?: boolean;
  /** Auto-generated when omitted. */
  id?: string;
  message: string;
  /** Metadata text (for example, a timestamp) shown in the alert meta slot. */
  meta?: string;
  /** Called after the toast is fully dismissed and removed. */
  onDismiss?: () => void;
  /**
   * Replace a live entry carrying the same message instead of stacking a duplicate :
   * repeated bursts update the existing notification and restart its timer.
   */
  replace?: boolean;
  rounded?: RoundedSize | '';
  /**
   * Material-style compact bar: an inverted neutral surface (dark chip in light themes,
   * light chip in dark themes) with single-row padding. The close button inherits the
   * surface's text color. Style through `--toast-snackbar-*` custom properties.
   */
  snackbar?: boolean;
  size?: ComponentSize;
  /**
   * Notification severity: `neutral` (default, no icon), `info`, `success`,
   * `warning`, or `danger`. Renders a status icon and tints the accent; `danger`
   * announces assertively by default.
   */
  status?: ToastStatus;
  /**
   * Screen-reader announcement urgency. Defaults to `assertive` for `danger`
   * and `polite` for every other status.
   */
  urgency?: 'polite' | 'assertive';
};

type ToastPhase = 'active' | 'exiting';

type ToastTimer = {
  remaining: number;
  startedAt: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
};

type ToastEntry = Required<Pick<ToastItem, 'dismissible' | 'duration' | 'id'>> &
  Omit<ToastItem, 'dismissible' | 'duration' | 'id'> & {
    exitTimeoutId: ReturnType<typeof setTimeout> | null;
    id: string;
    phase: ToastPhase;
    timer: ToastTimer | null;
  };

/**
 * Owns notification data and every timer. Renderers only subscribe to this
 * store; they never expose imperative mutation methods themselves.
 */
class ToastStore {
  readonly #entries = signal<ToastEntry[]>([]);
  readonly #listeners = new Set<(entries: ToastEntry[]) => void>();
  readonly #tappers = new Set<(event: ToastEvent) => void>();
  #disposed = false;
  #max = 5;
  #paused = false;

  add(item: ToastItem): string {
    if (this.#disposed) return item.id ?? crypto.randomUUID();

    const id = item.id ?? crypto.randomUUID();

    // A repeated burst replaces its own live entry instead of stacking duplicates.
    if (item.replace) {
      const existing = this.#entries.value.find((entry) => entry.phase !== 'exiting' && entry.message === item.message);

      if (existing) {
        this.update(existing.id, { ...item, id: existing.id });
        return existing.id;
      }
    }

    const active = this.#entries.value.filter((entry) => entry.phase !== 'exiting');
    const overflow = active.length - (this.#max - 1);

    if (overflow > 0) {
      for (const entry of active.slice(0, overflow)) this.dismiss(entry.id);
    }

    const entry: ToastEntry = {
      ...item,
      dismissible: item.dismissible ?? true,
      // Action toasts persist until dismissed by default: keyboard and screen-reader users
      // reach toasts last in tab order, so a timed expiry would expire the choice unseen.
      duration: item.duration ?? (item.actions?.length ? 0 : 5000),
      exitTimeoutId: null,
      id,
      // Entry motion is pure CSS (@starting-style supplies the pre-mount frame),
      // so a new entry needs no JS phase to animate in.
      phase: 'active',
      timer: null,
    };

    this.#setEntries([...this.#entries.value, entry]);
    this.#dispatch({ id, type: 'add' });

    if (entry.duration > 0) {
      // While paused the window is recorded without arming a timeout; resume arms it.
      if (this.#paused) {
        this.#update(id, { timer: { remaining: entry.duration, startedAt: Date.now(), timeoutId: null } });
      } else {
        this.#scheduleTimer(id, entry.duration);
      }
    }

    return id;
  }

  clear(): void {
    for (const entry of this.#entries.value) {
      if (entry.phase !== 'exiting') this.dismiss(entry.id);
    }
  }

  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;

    for (const entry of this.#entries.value) {
      if (entry.timer?.timeoutId) clearTimeout(entry.timer.timeoutId);

      if (entry.exitTimeoutId) clearTimeout(entry.exitTimeoutId);
    }

    this.#dispatch({ type: 'dispose' });
    this.#setEntries([]);
    this.#listeners.clear();
    this.#tappers.clear();
  }

  dismiss(id: string): void {
    const entry = this.#entry(id);

    if (!entry || entry.phase === 'exiting' || this.#disposed) return;

    this.#update(id, { ...this.#clearTimer(entry), phase: 'exiting' });

    // Arm the default budget only if the bound view has not already budgeted
    // this exit: a synchronous watcher can run syncControls inside the
    // #update notification above, and clobbering the view's themed duration
    // with the default would re-clip it.
    if (this.#entry(id)?.exitTimeoutId == null) this.scheduleFinalization(id, DEFAULT_EXIT_MS + EXIT_BUFFER_MS);
  }

  finalize(id: string): void {
    const entry = this.#entry(id);

    if (!entry || this.#disposed) return;

    if (entry.timer?.timeoutId) clearTimeout(entry.timer.timeoutId);

    if (entry.exitTimeoutId) clearTimeout(entry.exitTimeoutId);

    this.#setEntries(this.#entries.value.filter((candidate) => candidate.id !== id));
    entry.onDismiss?.();
    this.#dispatch({ id, type: 'dismiss' });
  }

  /**
   * Single pause seam for the view: hover, in-region focus, and open
   * top-layer surfaces all collapse into one boolean. Pausing records each
   * timer's remaining window without an armed timeout; resuming re-arms it.
   */
  setPaused(paused: boolean): void {
    if (this.#disposed || paused === this.#paused) return;

    this.#paused = paused;

    if (paused) {
      this.#setEntries(
        this.#entries.value.map((entry) => {
          if (!entry.timer) return entry;

          if (entry.timer.timeoutId) clearTimeout(entry.timer.timeoutId);

          return {
            ...entry,
            timer: {
              ...entry.timer,
              remaining: Math.max(0, entry.timer.remaining - (Date.now() - entry.timer.startedAt)),
            },
          };
        }),
      );

      return;
    }

    for (const entry of this.#entries.value) {
      if (entry.timer && entry.timer.remaining > 0) this.#scheduleTimer(entry.id, entry.timer.remaining);
    }
  }

  /**
   * Arms (or re-arms) the removal backstop for an exiting entry. The store
   * arms a default budget at dismissal; a bound view calls this with the
   * themed exit duration so a long `--toast-exit-duration` is never clipped
   * and a reduced-motion zero is honored. `finalize()` is idempotent, so the
   * backstop racing an early `transitionend` finalize is harmless.
   */
  scheduleFinalization(id: string, delay: number): void {
    const entry = this.#entry(id);

    if (entry?.phase !== 'exiting' || this.#disposed) return;

    if (entry.exitTimeoutId) clearTimeout(entry.exitTimeoutId);

    const exitTimeoutId = setTimeout(() => this.finalize(id), delay);

    this.#update(id, { exitTimeoutId });
  }

  setMax(max: number | undefined): void {
    if (max != null) this.#max = Math.max(1, max);
  }

  subscribe(listener: (entries: ToastEntry[]) => void): () => void {
    listener(this.#entries.value);
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  /** Side-channel observation of add/dismiss/dispose transitions; handler errors are swallowed. */
  tap(handler: (event: ToastEvent) => void, options?: { readonly signal?: AbortSignal }): () => void {
    if (this.#disposed) return () => {};

    this.#tappers.add(handler);
    options?.signal?.addEventListener(
      'abort',
      () => {
        this.#tappers.delete(handler);
      },
      { once: true },
    );

    return () => this.#tappers.delete(handler);
  }

  update(id: string, updates: Partial<ToastItem>): void {
    const entry = this.#entry(id);

    if (!entry || this.#disposed) return;

    // Omitted fields leave the entry unchanged; only provided values patch it.
    const patch = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    ) as Partial<ToastItem>;

    const cleared = patch.duration !== undefined ? this.#clearTimer(entry) : entry;

    this.#update(id, { ...cleared, ...patch, id });

    if (patch.duration !== undefined && patch.duration > 0) {
      // Same pause contract as add(): record the window, let setPaused() arm it,
      // so a toast updated behind an open dialog does not expire unseen.
      if (this.#paused) {
        this.#update(id, { timer: { remaining: patch.duration, startedAt: Date.now(), timeoutId: null } });
      } else {
        this.#scheduleTimer(id, patch.duration);
      }
    }
  }

  #clearTimer(entry: ToastEntry): ToastEntry {
    if (entry.timer?.timeoutId) clearTimeout(entry.timer.timeoutId);

    return { ...entry, timer: null };
  }

  #dispatch(event: ToastEvent): void {
    if (this.#tappers.size === 0) return;

    for (const tapper of this.#tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must not affect toast behavior.
      }
    }
  }

  #entry(id: string): ToastEntry | undefined {
    return this.#entries.value.find((entry) => entry.id === id);
  }

  #scheduleTimer(id: string, remaining: number): void {
    if (remaining <= 0 || this.#disposed) return;

    const timeoutId = setTimeout(() => this.dismiss(id), remaining);

    this.#update(id, { timer: { remaining, startedAt: Date.now(), timeoutId } });
  }

  #setEntries(entries: ToastEntry[]): void {
    this.#entries.value = entries;
    for (const listener of this.#listeners) listener(entries);
  }

  #update(id: string, patch: Partial<ToastEntry>): void {
    this.#setEntries(this.#entries.value.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }
}

type ToastHostBinding = {
  bind: (store: ToastStore) => void;
  unbind: () => void;
};

const hostBindings = new WeakMap<HTMLElement, ToastHostBinding>();
const hostStores = new WeakMap<HTMLElement, ToastStore>();

const bindToastHost = (host: HTMLElement, store: ToastStore): void => {
  hostStores.set(host, store);
  hostBindings.get(host)?.bind(store);
};

const NO_ACTIONS: NonNullable<ToastItem['actions']> = [];

/** Accent color token per status; `neutral` borrows primary so the progress bar stays visible. */
const STATUS_ACCENT: Record<ToastStatus, string> = {
  danger: 'error',
  info: 'info',
  neutral: 'primary',
  success: 'success',
  warning: 'warning',
};

/** Status icon per severity; `neutral` carries none (a plain message needs no status glyph). */
const STATUS_ICON: Record<ToastStatus, string | undefined> = {
  danger: 'circle-alert',
  info: 'info',
  neutral: undefined,
  success: 'check',
  warning: 'triangle-alert',
};

const urgencyOf = (entry: ToastEntry): 'polite' | 'assertive' =>
  entry.urgency ?? (entry.status === 'danger' ? 'assertive' : 'polite');

/** Renders the action buttons for a toast entry. Buttons are keyed so focus survives store updates. */
function renderToastActions(item: Readable<ToastEntry>, dismiss: () => void) {
  const actions = computed(() => item.value.actions ?? NO_ACTIONS);

  return html`
    ${() =>
      actions.value.length
        ? html`
            <div slot="actions" class="toast-actions">
              ${each(
                () => actions.value,
                (action, index) => `${index}:${action.label}`,
                (action) => html`
                  <ore-button
                    size="sm"
                    emphasis=${() => action.value.emphasis ?? null}
                    color=${() => action.value.color || (action.value.emphasis ? null : 'primary')}
                    variant=${() => action.value.variant || (action.value.emphasis ? null : 'ghost')}
                    @click=${() => {
                      action.value.onClick?.();
                      dismiss();
                    }}>
                    ${() => action.value.label}
                  </ore-button>
                `,
              )}
            </div>
          `
        : ''}
  `;
}

export const TOAST_TAG = 'ore-toast' as const;

/**
 * Declarative toast host. It subscribes to the service for its scope and
 * renders notifications, but has no imperative mutation API of its own.
 *
 * Notifications render as a vertical list (newest nearest the anchored edge)
 * inside polite and assertive live regions. Entries are keyed by id, so store
 * updates (timer pauses, message updates, phase changes) patch the existing
 * DOM instead of re-creating it: focus, in-flight gestures, and CSS
 * transitions all survive.
 *
 * @element ore-toast
 *
 * @attr {string} position - Stack placement.
 * @attr {number} max - Maximum live notifications for the scoped service.
 *
 * @cssprop --toast-max-width - Panel width cap (default 400px; full width on phones).
 * @cssprop --toast-gap - Gap between notifications.
 * @cssprop --toast-bg - Neutral notification surface (default the elevated contrast surface).
 * @cssprop --toast-color - Notification text color.
 * @cssprop --toast-border-color - Notification border.
 * @cssprop --toast-icon-size - Status icon size (default --size-5).
 * @cssprop --toast-avatar-size - Leading avatar diameter (default --size-8).
 * @cssprop --toast-shadow - Elevation shadow.
 * @cssprop --toast-enter-duration / --toast-exit-duration - Motion durations.
 * @cssprop --toast-progress-height - Height of the auto-dismiss progress bar.
 * @cssprop --toast-snackbar-height - Snackbar message row height, action or not (default --size-8).
 * @cssprop --toast-inset-top / --toast-inset-bottom / --toast-inset-left / --toast-inset-right - Viewport insets.
 *
 * @part container - Notification list.
 * @part toast-wrapper - Per-notification layout wrapper (swipe target).
 * @part toast-inner - Per-notification motion target.
 * @part progress - Auto-dismiss progress bar.
 */
define<OreToastProps>(TOAST_TAG, {
  props: {
    max: prop.number(5),
    position: prop.oneOf(
      ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const,
      'bottom-right',
    ),
  },
  setup(props) {
    const el = getHost() as HTMLElement;
    const emit = useEmit<OreToastEvents>();
    const containerRef = ref<HTMLDivElement>();
    const entries = signal<ToastEntry[]>([]);
    const hoverPaused = signal(false);
    const focusPaused = signal(false);
    const modalPaused = signal(false);
    const paused = computed(() => hoverPaused.value || focusPaused.value || modalPaused.value);
    const swipeControls = new Map<string, { element: HTMLElement; gesture: PanGesture }>();
    /** Exiting entries whose removal backstop the view has already re-armed. */
    const exitBudgeted = new Set<string>();
    let pendingSyncFrame: number | undefined;

    // ── Stack reflow motion ──
    // A toast entering or leaving the stack shifts every neighbour by a full
    // card height, and an instant shift reads as a glitch. Wrappers are keyed by
    // the entry id, which survives the keyed `each()` reconciliation, so a
    // survivor animates from its old slot to its new one. The entering toast is
    // skipped by the key match (it has no captured slot) and keeps its own CSS
    // enter transition; a dismissed toast holds its slot until finalized, so the
    // stack moves once, when it actually leaves.
    const stackMotion = createLayoutMotion(el, lifecycleSignal(onCleanup), {
      elements: () => [...(el.shadowRoot?.querySelectorAll<HTMLElement>('.toast-wrapper[data-toast-id]') ?? [])],
      getKey: (wrapper) => wrapper.dataset.toastId || undefined,
    });
    let store: ToastStore | null = null;
    let unsubscribeEntries = () => {};
    let unsubscribeEvents = () => {};

    // The declarative `max` attribute stays live: the service seeds it once at host
    // creation, and later attribute changes take effect through this watch.
    watch(
      () => props.max.value,
      (max) => store?.setMax(max),
    );

    const getInner = (wrapper: HTMLElement): HTMLElement | null => {
      return wrapper.querySelector<HTMLElement>('.toast-inner');
    };

    /**
     * Exit fade duration from the theme, in milliseconds. The root
     * `--_motion-transition` hatch (theme.css Reduced Motion) replaces the
     * whole transition under the OS preference or data-motion='reduced', so the
     * fade is instant and the duration is 0; otherwise it is the themed
     * `--toast-exit-duration`. The token is authored in milliseconds
     * (`--duration-200: 200ms`), so parseFloat of the computed value is already
     * ms - the same convention `createLayoutMotion` reads. An unparseable value
     * (jsdom resolves no custom properties) falls back to the store's default.
     */
    const readExitDuration = (inner: HTMLElement): number => {
      const style = getComputedStyle(inner);

      if (style.getPropertyValue('--_motion-transition').trim() === 'none') return 0;

      const ms = Number.parseFloat(style.getPropertyValue('--_exit-duration').trim());

      return Number.isFinite(ms) ? ms : DEFAULT_EXIT_MS;
    };

    /** The same duration plus the store's removal buffer. */
    const readExitBudget = (inner: HTMLElement): number => readExitDuration(inner) + EXIT_BUFFER_MS;

    /** The exit transition is the finish signal: remove the entry as soon as the
     *  fade completes instead of waiting for the backstop. Only an entry the
     *  store already marks exiting may finalize here, so an enter transition
     *  finishing on a live toast can never remove it; FLIP motion (WAAPI) fires
     *  no transition events and never reaches this path. */
    const onTransitionEnd = (event: TransitionEvent): void => {
      if (event.propertyName !== 'opacity' && event.propertyName !== 'transform') return;

      const target = event.target;

      if (!(target instanceof HTMLElement) || !target.classList.contains('toast-inner')) return;

      const id = wrapperFromEvent(event)?.dataset.toastId;

      if (id && entries.value.some((entry) => entry.id === id && entry.phase === 'exiting')) store?.finalize(id);
    };

    const wrapperFromEvent = (event: Event): HTMLElement | null =>
      event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.classList.contains('toast-wrapper')) ??
      null;

    /** Timers pause while a top-layer surface (an open dialog, fullscreen) covers the
     *  toasts: the user cannot interact with them, so choices must not expire unseen.
     *  Any open dialog counts: pausing wrongly is safer than expiring a choice the
     *  user could not see. `fullscreenElement` is undefined on engines without the API. */
    const syncTopLayer = (): void => {
      const doc = el.ownerDocument;
      modalPaused.value = doc.querySelector('dialog[open]') !== null || doc.fullscreenElement != null;
    };

    /** The element focused before a toast took focus; removal hands it back so keyboard
     *  users keep their place instead of restarting from the document top. */
    let lastExternalFocus: HTMLElement | null = null;
    let focusedWrapperId: string | null = null;
    /** Frame budget for the focus-restore re-check; see the restore block in syncControls. */
    let restoreCheckFrames = 0;

    /** The deepest focused element, piercing shadow roots: document-level targets
     *  retarget to their host, and focusing a host without a tabindex is a no-op. */
    const deepActiveElement = (doc: Document): HTMLElement | null => {
      let active = doc.activeElement as HTMLElement | null;

      while (active?.shadowRoot) {
        const deeper = active.shadowRoot.activeElement as HTMLElement | null;
        if (!deeper) break;
        active = deeper;
      }

      return active;
    };

    const onDocumentFocusIn = (event: FocusEvent): void => {
      if (event.composedPath().includes(el)) return;
      lastExternalFocus = deepActiveElement(el.ownerDocument);
    };

    const onToastFocusIn = (event: FocusEvent): void => {
      focusPaused.value = true;
      focusedWrapperId = wrapperFromEvent(event)?.dataset.toastId ?? null;
      restoreCheckFrames = 0;
    };

    const onToastFocusOut = (): void => {
      focusPaused.value = false;
      // Focusout fires before the next focusin settles; check after the microtask so a
      // move inside the region keeps the tracked wrapper while leaving clears it. Focus
      // that fell to `<body>` means the focused node was removed: keep the marker so
      // the restore in syncControls can hand focus back.
      void Promise.resolve().then(() => {
        const doc = el.ownerDocument;
        if (!focusPaused.value && doc.activeElement !== doc.body) focusedWrapperId = null;
      });
    };

    /** Escape dismisses the newest dismissible toast when nothing inside the toast region
     *  holds focus (the in-region handler owns that case and stops the event) and no
     *  top-layer surface is open: those own the Escape key. */
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented || modalPaused.value) return;
      if (focusPaused.value) return;

      const newest = [...entries.value].reverse().find((entry) => entry.dismissible && entry.phase !== 'exiting');

      if (newest) {
        event.preventDefault();
        store?.dismiss(newest.id);
      }
    };

    const createToastSwipe = (id: string, wrapper: HTMLElement): PanGesture => {
      const isDismissible = (): boolean => entries.value.find((entry) => entry.id === id)?.dismissible ?? true;
      const reset = (): void => {
        const inner = getInner(wrapper);

        if (!inner) return;

        inner.style.transition = '';
        inner.style.transform = '';
        inner.style.opacity = '';
      };

      return createPanGesture(wrapper, {
        axis: 'x',
        disabled: () => !isDismissible(),
        onEnd: ({ distance, reason }) => {
          if (reason !== 'release' || Math.abs(distance) < 48) {
            reset();

            return;
          }

          const inner = getInner(wrapper);

          if (!inner || !store) return;

          store.dismiss(id);

          // One duration knob for all exit motion: the flight reuses the themed
          // exit duration, so swipe, fade, and backstop stay in lockstep. A zero
          // duration (Reduced Motion) skips the flight and just hides the card;
          // the backstop, rescheduled to the buffer-only budget, removes it.
          const flight = readExitDuration(inner);

          if (flight <= 0) {
            inner.style.transition = 'none';
            inner.style.opacity = '0';

            return;
          }

          const direction = distance >= 0 ? 1 : -1;

          inner.style.transition = `transform ${flight}ms ease-out, opacity ${flight}ms ease-out`;
          // Force a style flush so the transition starts from the current
          // position instead of batching with the target values below.
          void inner.offsetWidth;
          inner.style.transform = `translateX(${direction * 120}%)`;
          inner.style.opacity = '0';
          // transitionend on the exiting inner finalizes; the backstop covers
          // engines where the transition never runs.
        },
        onMove: ({ distance }) => {
          const inner = getInner(wrapper);

          if (!inner) return;

          inner.style.transition = 'none';
          inner.style.transform = `translateX(${distance}px)`;
          inner.style.opacity = String(Math.max(0, 1 - Math.abs(distance) / 200));
        },
        pointerCapture: false,
        shouldStart: (event) =>
          !event
            .composedPath()
            .some((node) => node instanceof Element && node.matches('button, a, input, select, textarea, ore-button')),
      });
    };

    const syncControls = (): void => {
      const currentIds = new Set(entries.value.map((entry) => entry.id));

      for (const [id, control] of swipeControls) {
        if (!currentIds.has(id)) {
          control.gesture.dispose();

          swipeControls.delete(id);
          exitBudgeted.delete(id);
        }
      }

      // A removed wrapper that held focus drops focus to `<body>`; hand it back so
      // keyboard users keep their place. The entry leaves the store before the keyed
      // removal unmounts the focused node, so the frame re-checks below perform the
      // restore once focus has actually fallen to `<body>`.
      if (focusedWrapperId !== null && !currentIds.has(focusedWrapperId)) {
        const doc = el.ownerDocument;

        if (doc.activeElement === doc.body) {
          const restore = lastExternalFocus;
          focusedWrapperId = null;
          if (restore?.isConnected) restore.focus();
        } else if (restoreCheckFrames < 10) {
          // The keyed removal has not unmounted the focused node yet; re-check until
          // focus actually falls to `<body>`. A timer, not a frame: animation frames
          // never fire while the tab is hidden, and toasts outlive tab switches.
          restoreCheckFrames += 1;
          setTimeout(() => syncControls(), 16);
        }
      }

      for (const entry of entries.value) {
        const wrapper = containerRef.value?.querySelector<HTMLElement>(`[data-toast-id="${entry.id}"]`);
        const control = swipeControls.get(entry.id);

        if (wrapper && control?.element !== wrapper) {
          control?.gesture.dispose();
          swipeControls.set(entry.id, { element: wrapper, gesture: createToastSwipe(entry.id, wrapper) });
        }

        // Replace the store's default exit budget with the themed one, once per
        // entry: a --toast-exit-duration longer than the default is honored,
        // and transitionend finalizes early when the fade finishes sooner.
        if (entry.phase === 'exiting' && !exitBudgeted.has(entry.id) && store) {
          const inner = wrapper ? getInner(wrapper) : null;

          if (inner) {
            exitBudgeted.add(entry.id);
            store.scheduleFinalization(entry.id, readExitBudget(inner));
          }
        }
      }
    };

    const scheduleSyncControls = (): void => {
      syncControls();

      if (pendingSyncFrame !== undefined) cancelAnimationFrame(pendingSyncFrame);

      pendingSyncFrame = requestAnimationFrame(() => {
        pendingSyncFrame = undefined;
        syncControls();
      });
    };

    watch(entries, scheduleSyncControls);
    watch(paused, (isPaused) => store?.setPaused(isPaused));

    const bind = (nextStore: ToastStore): void => {
      if (store === nextStore) return;

      unsubscribeEntries();

      unsubscribeEvents();
      store = nextStore;
      store.setMax(props.max.value);
      unsubscribeEntries = store.subscribe((nextEntries) => {
        stackMotion.run(() => {
          entries.value = nextEntries;
        });
      });
      unsubscribeEvents = store.tap((event) => {
        if (event.type === 'dispose') return;
        emit(event.type, { id: event.id });
      });

      if (paused.value) store.setPaused(true);
    };

    /** Escape dismisses the notification that currently holds focus. */
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;

      const id = wrapperFromEvent(event)?.dataset.toastId;
      const entry = id ? entries.value.find((candidate) => candidate.id === id) : undefined;

      if (!entry?.dismissible) return;

      event.preventDefault();
      event.stopPropagation();
      store?.dismiss(entry.id);
    };

    const renderEntry = (item: Readable<ToastEntry>) => {
      const id = item.value.id;
      const dismiss = () => store?.dismiss(id);
      const meta = computed(() => item.value.meta ?? '');
      const innerClass = computed(
        () => `toast-inner${item.value.phase === 'exiting' ? ' exiting' : ''}${item.value.snackbar ? ' snackbar' : ''}`,
      );
      const statusIcon = computed(() => STATUS_ICON[item.value.status ?? 'neutral']);
      const innerStyle = computed(
        () =>
          `--_toast-accent: var(--color-${STATUS_ACCENT[item.value.status ?? 'neutral']}); --_toast-radius: var(--rounded-${
            item.value.rounded || (item.value.snackbar ? 'sm' : 'md')
          })`,
      );
      // Progress restarts from the correct fraction whenever the timer is (re)scheduled:
      // the animation runs for the full duration with a negative delay for elapsed time.
      const progressStyle = computed(() => {
        const { duration, timer } = item.value;

        if (!timer || duration <= 0) return '';

        return `--_toast-duration: ${duration}ms; --_toast-elapsed: -${Math.max(0, duration - timer.remaining)}ms`;
      });

      return html`
        <div class="toast-wrapper" data-toast-id=${id} part="toast-wrapper">
          <div class=${() => innerClass.value} style=${() => innerStyle.value} part="toast-inner">
            <ore-alert
              embedded
              size=${() => item.value.size || 'md'}
              rounded=${() => item.value.rounded || 'md'}
              ?horizontal=${() => Boolean(item.value.horizontal)}
              heading=${() => item.value.heading || null}
              ?dismissible=${() => item.value.dismissible}
              @dismiss=${dismiss}>
              ${() =>
                item.value.avatar
                  ? html`<ore-avatar
                      class="toast-avatar"
                      slot="icon"
                      alt=${() => item.value.avatar?.alt ?? null}
                      color=${() => item.value.avatar?.color ?? null}
                      initials=${() => item.value.avatar?.initials ?? null}
                      rounded=${() => item.value.avatar?.rounded ?? null}
                      size=${() => item.value.avatar?.size ?? null}
                      src=${() => item.value.avatar?.src ?? null}
                      status=${() => item.value.avatar?.status ?? null}></ore-avatar>`
                  : statusIcon.value
                    ? html`<ore-icon
                        class="toast-status-icon"
                        name=${statusIcon.value}
                        slot="icon"
                        aria-hidden="true"></ore-icon>`
                    : ''}
              <span slot="meta" ?hidden=${() => !meta.value}>${() => meta.value}</span>
              ${() => item.value.message} ${renderToastActions(item, dismiss)}
            </ore-alert>
            <div
              class="toast-progress"
              part="progress"
              style=${() => progressStyle.value}
              ?hidden=${() => !progressStyle.value}
              aria-hidden="true"></div>
          </div>
        </div>
      `;
    };

    onMounted(() => {
      hostBindings.set(el, {
        bind,
        unbind() {
          unsubscribeEntries();
          unsubscribeEvents();
          store = null;
          entries.value = [];
        },
      });

      const doc = el.ownerDocument;

      // The host mounts with the first toast, so pre-toast focus was never tracked by
      // the document listener: snapshot where focus sits right now (the control that
      // triggered the toast) as the restore target.
      const beforeFirstToast = deepActiveElement(doc);
      lastExternalFocus = beforeFirstToast !== doc.body ? beforeFirstToast : null;

      doc.addEventListener('focusin', onDocumentFocusIn);
      doc.addEventListener('keydown', onDocumentKeydown);
      // `toggle` does not bubble; the capture listener still sees dialog and popover toggles.
      doc.addEventListener('toggle', syncTopLayer, true);
      doc.addEventListener('fullscreenchange', syncTopLayer);
      syncTopLayer();

      const boundStore = hostStores.get(el);

      if (boundStore) bind(boundStore);
    });

    onCleanup(() => {
      hostBindings.get(el)?.unbind();

      hostBindings.delete(el);

      if (pendingSyncFrame !== undefined) cancelAnimationFrame(pendingSyncFrame);

      for (const control of swipeControls.values()) control.gesture.dispose();
      swipeControls.clear();

      const doc = el.ownerDocument;

      doc.removeEventListener('focusin', onDocumentFocusIn);
      doc.removeEventListener('keydown', onDocumentKeydown);
      doc.removeEventListener('toggle', syncTopLayer, true);
      doc.removeEventListener('fullscreenchange', syncTopLayer);
    });

    const politeEntries = computed(() => entries.value.filter((entry) => urgencyOf(entry) === 'polite'));
    const assertiveEntries = computed(() => entries.value.filter((entry) => urgencyOf(entry) === 'assertive'));
    const keyOf = (entry: ToastEntry) => entry.id;

    return html`
      <div
        class=${() => `toast-container${paused.value ? ' paused' : ''}`}
        ref=${containerRef}
        @pointerenter=${() => {
          hoverPaused.value = true;
        }}
        @pointerleave=${() => {
          hoverPaused.value = false;
        }}
        @focusin=${onToastFocusIn}
        @focusout=${onToastFocusOut}
        @keydown=${onKeydown}
        @transitionend=${onTransitionEnd}
        part="container">
        <div
          role="region"
          aria-live="polite"
          aria-relevant="additions removals"
          aria-atomic="false"
          aria-label="Notifications"
          class="toast-live-region">
          ${each(politeEntries, keyOf, renderEntry)}
        </div>
        <div
          role="region"
          aria-live="assertive"
          aria-relevant="additions removals"
          aria-atomic="false"
          aria-label="Critical notifications"
          class="toast-live-region">
          ${each(assertiveEntries, keyOf, renderEntry)}
        </div>
        <slot></slot>
      </div>
    `;
  },
  styles: [componentStyles],
});

export type ToastServiceConfig = OreToastProps;

export interface ToastService {
  add(item: ToastItem): string;
  clear(): void;
  configure(config: ToastServiceConfig): void;
  dismiss(id: string): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  error(message: string, opts?: Partial<ToastItem>): string;
  info(message: string, opts?: Partial<ToastItem>): string;
  promise<T>(
    promise: Promise<T>,
    messages: {
      error: string | ((err: unknown) => string);
      loading: string;
      success: string | ((data: T) => string);
    },
  ): Promise<T>;
  success(message: string, opts?: Partial<ToastItem>): string;
  /** Side-channel observation of add/dispose/dismiss transitions; handler errors are swallowed. */
  tap(handler: (event: ToastEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  update(id: string, updates: Partial<ToastItem>): void;
  warning(message: string, opts?: Partial<ToastItem>): string;
  [Symbol.dispose](): void;
}

const services = new WeakMap<ParentNode, ToastService>();

/**
 * Creates a scoped toast service. The service owns its notification store and
 * binds it to the declarative `<ore-toast>` host inside `root`, creating that
 * host lazily when notifications are first requested.
 */
export function createToastService(root: ParentNode = document.body): ToastService {
  const existing = services.get(root);

  if (existing) return existing;

  const store = new ToastStore();
  const disposalController = new AbortController();
  let disposed = false;
  let pendingConfig: ToastServiceConfig | null = null;
  let host: HTMLElement | null = null;

  const assertActive = (): boolean => !disposed;
  const rootNode = root as Element | Document | ShadowRoot;

  /** Applies stashed configuration to the host as attributes; the component's own `max`
   *  watch and the bind-time seed carry them into the store, so this stays declarative. */
  const applyConfig = (): void => {
    if (!pendingConfig || !host) return;

    if (pendingConfig.position) host.setAttribute('position', pendingConfig.position);

    if (pendingConfig.max != null) host.setAttribute('max', String(pendingConfig.max));

    pendingConfig = null;
  };

  const getHost = (): HTMLElement | null => {
    if (!assertActive()) return null;

    if (host?.isConnected) return host;

    host = rootNode.querySelector<HTMLElement>(TOAST_TAG);

    if (!host) {
      host = document.createElement(TOAST_TAG);
      rootNode.appendChild(host);
    }

    applyConfig();
    bindToastHost(host, store);

    return host;
  };
  const ensureHost = (): boolean => Boolean(getHost());

  const service: ToastService = {
    add(item) {
      if (!ensureHost()) return item.id ?? crypto.randomUUID();

      return store.add(item);
    },

    clear() {
      if (ensureHost()) store.clear();
    },

    configure(config) {
      pendingConfig = { ...pendingConfig, ...config };
      applyConfig();
    },

    dismiss(id) {
      if (ensureHost()) store.dismiss(id);
    },

    get disposalSignal() {
      return disposalController.signal;
    },

    dispose() {
      if (disposed) return;

      disposed = true;

      disposalController.abort();

      store.dispose();

      if (services.get(root) === service) services.delete(root);
    },

    get disposed() {
      return disposed;
    },

    error(message, opts) {
      return service.add({ status: 'danger', ...opts, message });
    },

    info(message, opts) {
      return service.add({ status: 'info', ...opts, message });
    },

    async promise(promise, messages) {
      // The loading entry stays dismissible: if the promise never settles, the user keeps
      // an escape hatch instead of an immortal notification.
      const id = service.add({ duration: 0, message: messages.loading });

      try {
        const data = await promise;

        service.update(id, {
          duration: 5000,
          message: typeof messages.success === 'function' ? messages.success(data) : messages.success,
          status: 'success',
        });

        return data;
      } catch (err) {
        service.update(id, {
          duration: 5000,
          message: typeof messages.error === 'function' ? messages.error(err) : messages.error,
          status: 'danger',
        });
        throw err;
      }
    },

    success(message, opts) {
      return service.add({ status: 'success', ...opts, message });
    },

    tap(handler, options) {
      return store.tap(handler, options);
    },

    [Symbol.dispose]() {
      service.dispose();
    },

    update(id, updates) {
      if (ensureHost()) store.update(id, updates);
    },

    warning(message, opts) {
      return service.add({ status: 'warning', ...opts, message });
    },
  };

  services.set(root, service);

  return service;
}

/** Singleton service backed by a lazily created host in `document.body`. */
export const toast: ToastService = createToastService();
