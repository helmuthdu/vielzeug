/** Chooses whether an animation uses full or reduced motion. */
export type MotionMode = 'full' | 'reduced' | 'system';

/** The terminal result of a lifecycle-owned animation. */
export type AnimationResult =
  | { readonly status: 'finished' }
  | { readonly status: 'reduced' }
  | { readonly reason?: unknown; readonly status: 'cancelled' };

/** Keyframes accepted by the Web Animations API. */
export type Keyframes = readonly Keyframe[] | PropertyIndexedKeyframes;

/**
 * Native Web Animations timing options with Necromancer's ownership controls.
 *
 * `duration` defaults to `180` milliseconds. `motion` defaults to `'system'`.
 * `signal` disposes the returned handle when aborted.
 *
 * Deliberately extends native `KeyframeAnimationOptions` in full rather than a narrower,
 * Necromancer-specific timing type: every native field (`easing`, `fill`, `iterations`, a
 * string `delay`/`duration`, etc.) reaches `element.animate()` unchanged. Callers already
 * fluent in the Web Animations API bring that knowledge here directly, instead of learning
 * a second, smaller timing vocabulary — the option chain below only ever *adds* ownership
 * fields on top, never narrows what's already native.
 *
 * Option chain: `AnimateOptions` -> `AnimateEachOptions` (+`stagger`) -> `LayoutAnimationOptions`
 * (+`elements`). Each layer's implementation module strips only the field it added before
 * forwarding the rest down (see `animate-each.ts`, `layout.ts`, and `_motion.ts`'s
 * `resolveAnimationOptions()`, which is the last stop and strips `interrupt`/`motion`/`signal`).
 */
export type AnimateOptions = KeyframeAnimationOptions & {
  /**
   * Cancels every active Necromancer-owned animation on the element as this
   * animation begins. Native animations owned outside Necromancer are untouched.
   */
  readonly interrupt?: 'cancel';
  readonly motion?: MotionMode;
  readonly signal?: AbortSignal;
};

/** Produces keyframes for an element at a stable position in an animation group. */
export type KeyframeFactory = (element: Element, index: number, total: number) => Keyframes;

/** Options for animating a group of elements. */
export type AnimateEachOptions = AnimateOptions & {
  /** Milliseconds to delay each element after the preceding element. Defaults to `0`. */
  readonly stagger?: number;
};

/** Options for animating positional layout changes captured by {@link captureLayout}. */
export type LayoutAnimationOptions = AnimateEachOptions & {
  /**
   * Elements in their committed layout. With {@link LayoutCaptureOptions.getKey},
   * replacement elements match their captured predecessors by key.
   */
  readonly elements?: Iterable<Element>;
};

/** Options for capturing positional layout changes. */
export interface LayoutCaptureOptions {
  /** Maps an element to its stable, non-empty identity across a DOM replacement. */
  readonly getKey?: (element: Element) => string;
}

/** A lifecycle-owned native Web Animation. */
export interface AnimationHandle {
  /** The lifecycle-owned native Web Animation. */
  readonly animation: Animation;
  /** Resolves once the animation finishes, is reduced, or is cancelled. */
  readonly result: Promise<AnimationResult>;
  /** Whether this handle has been disposed. */
  readonly disposed: boolean;
  /** Cancels the native animation and releases owned listeners. */
  dispose(reason?: unknown): void;
  /** Calls {@link dispose}. */
  [Symbol.dispose](): void;
}

/** A lifecycle-owned collection of animations. */
export interface AnimationGroup {
  /** Child handles in the order supplied to {@link animateEach}. */
  readonly handles: readonly AnimationHandle[];
  /** Resolves after all children have reached a terminal state. */
  readonly results: Promise<readonly AnimationResult[]>;
  /** Whether this group has been disposed. */
  readonly disposed: boolean;
  /** Disposes every child and releases group ownership. */
  dispose(reason?: unknown): void;
  /** Calls {@link dispose}. */
  [Symbol.dispose](): void;
}

/** A one-shot positional layout transition returned by {@link captureLayout}. */
export interface LayoutTransition {
  /**
   * Measures the current layout and animates elements from their captured positions.
   *
   * Omit `options.elements` to animate the captured elements, or supply the
   * committed replacements when the transition was captured with `getKey`.
   */
  animate(options?: LayoutAnimationOptions): AnimationGroup;
}
