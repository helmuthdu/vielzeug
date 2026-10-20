import type { Readable } from '@vielzeug/ripple';

/**
 * Beacon is headless: it decides *what* to show and *where* its anchor is, and
 * never renders. A presentation layer (`@vielzeug/refine`'s `ore-tour`, which
 * consumes a handle through `card.bind(handle)`, or an app's own markup) reads
 * {@link BeaconTourHandle.current} and positions itself with the rect the
 * handle publishes.
 */

/**
 * A viewport-space rectangle, in CSS pixels relative to the document origin.
 * Matches `@vielzeug/orbit`'s `Rect` shape, so a rect target can anchor a
 * positioner directly through {@link createVirtualReference}.
 */
export interface BeaconRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/** Resolves a target lazily; returning `null` means "not available yet". */
export type BeaconTargetResolver = () => Element | BeaconRect | null;

/**
 * What a step points at. A selector or `Element` anchors to real DOM; a rect (or
 * a resolver returning one) anchors to geometry that has no element, such as a
 * canvas region or a chart datum.
 */
export type BeaconTarget = BeaconTargetResolver | BeaconRect | Element | string;

/** How a step should be presented. `auto` lets the presentation layer pick by available space. */
export type BeaconPresentation = 'auto' | 'bottom-sheet' | 'modal' | 'popover';

/** Preferred side for an anchored presentation; `auto` asks the positioning layer to choose. */
export type BeaconPlacement =
  | 'auto'
  | 'bottom'
  | 'bottom-end'
  | 'bottom-start'
  | 'left'
  | 'left-end'
  | 'left-start'
  | 'right'
  | 'right-end'
  | 'right-start'
  | 'top'
  | 'top-end'
  | 'top-start';

/** One stop in a tour. `id` is stable and persisted, so renaming it resets progress for that step. */
export interface BeaconStep {
  /** Free-form data the presentation layer can read; Beacon never interprets it. */
  readonly data?: unknown;
  /** Supporting copy. */
  readonly description?: string;
  /** Stable step identity, unique within the tour. */
  readonly id: string;
  /** Overrides the tour-level placement for this step. */
  readonly placement?: BeaconPlacement;
  /** Overrides the tour-level presentation for this step. */
  readonly presentation?: BeaconPresentation;
  /** Omit for an intro/outro step that centers instead of anchoring. */
  readonly target?: BeaconTarget;
  /** Headline copy. */
  readonly title?: string;
}

/** Lifecycle of a tour, persisted across visits. */
export type BeaconStatus = 'active' | 'completed' | 'dismissed' | 'idle' | 'paused';

/** The persisted record for one tour or coachmark. */
export interface BeaconProgress {
  readonly status: BeaconStatus;
  /** `-1` before the first step, otherwise the active step index. */
  readonly stepIndex: number;
  /** The {@link BeaconTourConfig.version} the record was written under. */
  readonly version: number;
}

/**
 * Minimal storage contract. A plain object or `Map` works in tests; a
 * `@vielzeug/vault` store plugs in with a six-line bridge:
 *
 * ```ts
 * const store = createLocalStorage({ name: 'beacon', schema, codecs });
 * const storage: BeaconStorage = {
 *   get: (key) => store.get('progress', key),
 *   remove: (key) => store.delete('progress', key),
 *   set: (key, value) => store.put('progress', { id: key, ...value }),
 * };
 * ```
 *
 * Values are JSON, so any structured-cloneable record round-trips.
 */
export interface BeaconStorage {
  get(key: string): Promise<BeaconProgress | null | undefined> | BeaconProgress | null | undefined;
  remove(key: string): Promise<unknown> | unknown;
  set(key: string, value: BeaconProgress): Promise<unknown> | unknown;
}

/** Options shared by every {@link createTour} call. */
export interface BeaconTourConfig {
  /** Scroll each anchored step's target into view when it becomes active. Default `true`. */
  readonly autoScroll?: boolean;
  /** Start the tour on the next microtask when it is eligible. Default `false`. */
  readonly autoStart?: boolean;
  /** Unique identity, used as the storage key. */
  readonly id: string;
  /** Default placement handed to the presentation layer. Default `'auto'`. */
  readonly placement?: BeaconPlacement;
  /** Default presentation handed to the presentation layer. Default `'auto'`. */
  readonly presentation?: BeaconPresentation;
  /** Pixels kept clear at the top of the viewport for a sticky header, read at scroll time. Default `0`. */
  readonly scrollOffset?: number | (() => number);
  /** Every step, in order. Must contain at least one. */
  readonly steps: readonly BeaconStep[];
  /** Storage for progress. Omit to keep progress in memory for this handle only. */
  readonly storage?: BeaconStorage;
  /**
   * How long to wait for a step's target to appear before skipping that step, in
   * ms. Default `Infinity` (wait as long as the user needs — the tour resumes
   * when they navigate to the target). `0` shows the step immediately with a
   * `null` rect instead of waiting.
   */
  readonly targetTimeoutMs?: number;
  /**
   * Bump to re-show a tour users already finished. A stored record under an older
   * version makes the tour eligible again; a record at this version does not.
   */
  readonly version?: number;
}

/** Options for {@link createCoachmark}. */
export interface BeaconCoachmarkConfig {
  /** Show automatically on the next microtask when not yet seen. Default `true`. */
  readonly autoShow?: boolean;
  /** Free-form data for the presentation layer. */
  readonly data?: unknown;
  readonly description?: string;
  /** Unique identity, used as the storage key. */
  readonly id: string;
  readonly placement?: BeaconPlacement;
  readonly presentation?: BeaconPresentation;
  /** Storage for the seen/seen-version record. Omit for memory-only. */
  readonly storage?: BeaconStorage;
  /** Where the hint points. */
  readonly target: BeaconTarget;
  readonly title?: string;
  /** Bump to re-show a coachmark the user already saw. */
  readonly version?: number;
}

/**
 * The snapshot a presentation layer renders from. Both handles publish one:
 * a tour's `current` moves through its steps, a coachmark's is its single step
 * while visible and `null` while hidden.
 */
export interface BeaconCurrentStep {
  readonly placement: BeaconPlacement;
  readonly presentation: BeaconPresentation;
  /**
   * Resolved anchor rect, or `null` for a centered step, an unresolved target,
   * or an anchored step whose target left the document. Beacon keeps the rect
   * fresh on scroll, resize, and target layout changes while a step is active.
   */
  readonly rect: BeaconRect | null;
  /** `null` before the tour starts and after it ends. */
  readonly step: BeaconStep | null;
  readonly stepIndex: number;
  readonly totalSteps: number;
}

/** Events every beacon handle can report. */
export type BeaconBaseEvent =
  | { readonly type: 'dispose' }
  | { readonly error: unknown; readonly message: string; readonly type: 'warning' };

/** Notable moments a tour reports through `tap`. */
export type BeaconTourEvent =
  | { readonly index: number; readonly step: BeaconStep; readonly type: 'step:start' }
  | { readonly index: number; readonly step: BeaconStep; readonly type: 'step:complete' }
  | { readonly reason: 'finish' | 'skip'; readonly type: 'tour:complete' }
  | { readonly type: 'tour:dismiss' }
  | { readonly status: BeaconStatus; readonly type: 'status-change' }
  | { readonly message: string; readonly type: 'target-missing' }
  | { readonly index: number; readonly message: string; readonly step: BeaconStep; readonly type: 'target-waiting' }
  | BeaconBaseEvent;

/** Notable moments a coachmark reports through `tap`. */
export type BeaconCoachmarkEvent =
  | { readonly type: 'coachmark:show' }
  | { readonly type: 'coachmark:dismiss' }
  | { readonly type: 'target-waiting' }
  | BeaconBaseEvent;

/** The running tour returned by {@link createTour}. */
export interface BeaconTourHandle {
  /** Return to the previous step. No-op on the first step. Throws after dispose. */
  back(): void;
  /** The step to render, kept live. Beacon re-publishes the rect on scroll, resize, and target layout changes while a step is active. */
  readonly current: Readable<BeaconCurrentStep>;
  /** End the tour by closing it (Escape, backdrop). Persisted as dismissed; {@link reset} makes it available again. */
  dismiss(): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  /** Whether the tour should be offered to this user: never run, dismissed-and-re-eligible, or superseded by a newer version. */
  readonly eligible: Readable<boolean>;
  /** Mark the tour finished and stop showing it. */
  finish(): void;
  /** Jump to a step by id or index. Throws after dispose. */
  goto(step: number | string): void;
  readonly id: string;
  /** Advance to the next step, or finish on the last one. Throws after dispose. */
  next(): void;
  /** Stop showing the tour, keeping progress so {@link start} can resume it. */
  pause(): void;
  /** Discard persisted progress so the tour is eligible again. */
  reset(): void;
  /** End the tour from a "Skip" control. Persisted like {@link dismiss}, reported with reason `'skip'`. */
  skip(): void;
  /** Begin (or resume) the tour. No-op when already completed. Throws after dispose. */
  start(): void;
  readonly status: Readable<BeaconStatus>;
  readonly steps: readonly BeaconStep[];
  tap(handler: (event: BeaconTourEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  [Symbol.dispose](): void;
}

/** The running coachmark returned by {@link createCoachmark}. */
export interface BeaconCoachmarkHandle {
  /** The hint as a single-step snapshot: `step` is the hint while visible, `null` while hidden. */
  readonly current: Readable<BeaconCurrentStep>;
  /** Hide the hint and record it as seen. */
  dismiss(): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  /** Whether the coachmark should be offered: never seen, or superseded by a newer version. */
  readonly eligible: Readable<boolean>;
  /** Hide the hint without marking it seen, so it can show again. */
  hide(): void;
  readonly id: string;
  /** Discard the persisted record so the coachmark is eligible again. */
  reset(): void;
  /** Show the hint. No-op once {@link dismiss}ed without a newer version. Throws after dispose. */
  show(): void;
  tap(handler: (event: BeaconCoachmarkEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  [Symbol.dispose](): void;
}
