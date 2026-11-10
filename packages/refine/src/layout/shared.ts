/**
 * Private helpers shared by the responsive layout components (`ore-sidebar`,
 * `ore-navbar`) and the viewport breakpoint of `ore-tour`. Deliberately not
 * re-exported from the layout barrel: these encode internal container behavior,
 * not a public API.
 */

import { computed, fromSubscribable, type Readable, signal, untrack, watch } from '@vielzeug/ripple';
import {
  createElementSize,
  createMediaQuery,
  type ElementSizeState,
  type Sentinel,
  SentinelUnavailableError,
} from '@vielzeug/sentinel';

/**
 * Subscribe to an event and return its teardown. Returns a no-op for a missing
 * target so callers can pass an optional element without branching.
 */
export const listen = <E extends Event = Event>(
  el: EventTarget | null | undefined,
  name: string,
  handler: (e: E) => void,
  options?: AddEventListenerOptions,
): (() => void) => {
  if (!el) return () => {};

  el.addEventListener(name, handler as EventListener, options);

  return () => el.removeEventListener(name, handler as EventListener, options);
};

/**
 * The nearest scrollable ancestor, so a component pinned to the viewport can
 * listen for the scroll that actually moves it: a bar inside a scrolling panel
 * never sees a `window` scroll event.
 */
export const findScrollContainer = (start: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = start.parentElement;

  while (current) {
    const { overflowY } = window.getComputedStyle(current);

    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return current;
    }

    current = current.parentElement;
  }

  return null;
};

/** Parses the px value out of a container-query string like `(max-width: 768px)`. */
export const parseMaxWidthPx = (query: string | undefined): number | undefined => {
  const value = String(query ?? '').trim();

  if (!value) return undefined;

  const match = /max-width\s*:\s*([0-9]+(?:\.[0-9]+)?)px/i.exec(value);

  if (!match) return undefined;

  const parsed = Number.parseFloat(match[1]);

  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * The element whose width the component measures against, skipping transparent
 * `ore-grid-item` wrappers so a component inside a grid still sees its real container.
 */
export const resolveContainerElement = (el: HTMLElement): HTMLElement | null => {
  let container = el.parentElement;

  while (container?.tagName.toLowerCase() === 'ore-grid-item') {
    container = container.parentElement;
  }

  return container;
};

/** The container width to test against a breakpoint, falling back to the element itself. */
export const readContainerWidth = (el: HTMLElement): number => {
  const parentWidth = resolveContainerElement(el)?.clientWidth ?? 0;

  if (parentWidth > 0) return parentWidth;

  return el.offsetWidth;
};

/** Handle for one responsive breakpoint owned by `createResponsiveMode`. */
export type ResponsiveMode = {
  /** Parsed px value of the query's `max-width`, or `undefined` when not parseable. */
  readonly maxWidthPx: Readable<number | undefined>;
  /** Whether the component is currently "narrow" under this breakpoint. */
  readonly matches: Readable<boolean>;
  /** Re-read the container width against the parsed breakpoint. */
  remeasure(): void;
  dispose(): void;
};

/**
 * One responsive breakpoint: subscribes to a viewport media query and (for parseable
 * `max-width` queries) tracks the container width, calling `onChange` whenever the
 * resolved match flips. With `container-breakpoints` opted in on a parseable query,
 * the container width is the sole authority (no media subscription); otherwise the
 * viewport media query decides. Toggling the opt-in at runtime re-subscribes.
 *
 * The media watch runs its body `untrack`ed on purpose: without it, signals read
 * inside the callback become dependencies of the watch effect; a sentinel update
 * would then dispose the media subscription's scope without re-invoking the callback
 * (source unchanged), leaving the component deaf to later viewport changes.
 */
export const createResponsiveMode = (
  el: HTMLElement,
  query: Readable<string | undefined | null>,
  containerDriven: Readable<boolean | undefined>,
  onChange: (matches: boolean) => void,
): ResponsiveMode => {
  const mediaMatches = signal(false);
  const sizeMatches = signal(false);
  const maxWidthPx = signal<number | undefined>(parseMaxWidthPx(String(query.value ?? '')));

  const remeasure = () => {
    const width = readContainerWidth(el);
    const next = width > 0 && maxWidthPx.value != null ? width <= maxWidthPx.value : false;

    if (next !== sizeMatches.value) sizeMatches.value = next;
  };

  const matches = computed(() =>
    containerDriven.value && maxWidthPx.value != null ? sizeMatches.value : mediaMatches.value,
  );

  let mediaCleanup: (() => void) | undefined;

  const resubscribe = () => {
    mediaCleanup?.();
    mediaCleanup = undefined;

    const mediaQuery = String(query.value ?? '').trim();

    if (containerDriven.value && maxWidthPx.value != null) return;

    if (!mediaQuery) return;

    try {
      const mediaHandle = createMediaQuery(mediaQuery);
      const syncMedia = (state: ReturnType<typeof mediaHandle.getSnapshot>) => {
        if (state && mediaMatches.value !== state.matches) {
          mediaMatches.value = state.matches;
          onChange(matches.value);
        }
      };

      syncMedia(mediaHandle.getSnapshot());

      const stopMedia = watch(fromSubscribable(mediaHandle, { signal: mediaHandle.disposalSignal }), syncMedia);

      mediaCleanup = () => {
        stopMedia.dispose();
        mediaHandle.dispose();
      };
    } catch (error) {
      if (!(error instanceof SentinelUnavailableError)) throw error;
    }
  };

  const stopQueryWatch = watch(
    query,
    () =>
      untrack(() => {
        mediaMatches.value = false;
        maxWidthPx.value = parseMaxWidthPx(String(query.value ?? ''));
        remeasure();
        resubscribe();
        onChange(matches.value);
      }),
    { immediate: true },
  );

  const stopContainerWatch = watch(
    containerDriven,
    () =>
      untrack(() => {
        resubscribe();
        onChange(matches.value);
      }),
    { immediate: true },
  );

  return {
    dispose() {
      stopQueryWatch.dispose();
      stopContainerWatch.dispose();
      mediaCleanup?.();
    },
    matches,
    maxWidthPx,
    remeasure,
  };
};

/** Handle for `createResizeTracker`. */
export type ResizeTracker = {
  /** Docs-preview heuristic: the resolved container is narrower than the window. */
  readonly isPreviewMode: Readable<boolean>;
  dispose(): void;
};

/**
 * Debounce (one animation frame) the host/wrapper/container size signals into a single
 * `onResize` callback, and derive the preview-mode flag: a container narrower than the
 * window means the component is embedded in a docs preview, where `position: fixed`
 * must become `absolute` to stay inside the preview shell.
 */
export const createResizeTracker = (el: HTMLElement, onResize: () => void): ResizeTracker => {
  const isPreviewMode = signal(false);

  if (typeof ResizeObserver !== 'function') {
    return { dispose: () => {}, isPreviewMode };
  }

  const sizes: Sentinel<ElementSizeState | null>[] = [createElementSize(el)];

  const wrapperEl = el.parentElement;
  const containerEl = resolveContainerElement(el);

  if (wrapperEl) sizes.push(createElementSize(wrapperEl));
  if (containerEl && containerEl !== wrapperEl) sizes.push(createElementSize(containerEl));

  const sizeSignals = sizes.map((size) => fromSubscribable(size, { signal: size.disposalSignal }));

  let rafId: number | undefined;

  const stop = watch(
    computed(() => sizeSignals.map((size) => [size.value?.width, size.value?.height])),
    () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        rafId = undefined;

        const parentWidth = resolveContainerElement(el)?.clientWidth ?? 0;
        const next = parentWidth > 0 && parentWidth < window.innerWidth;

        if (next !== isPreviewMode.value) isPreviewMode.value = next;

        onResize();
      });
    },
  );

  return {
    dispose() {
      if (rafId !== undefined) cancelAnimationFrame(rafId);

      stop.dispose();

      for (const size of sizes) size.dispose();
    },
    isPreviewMode,
  };
};
