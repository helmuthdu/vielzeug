/**
 * Fling projection: how far a released gesture would travel if its release
 * velocity carried on.
 *
 * Apple's sheet and card gestures are velocity-sensitive: a short, fast flick
 * dismisses just as surely as a long slow drag that crosses the threshold. A
 * fixed distance threshold alone misses the flick entirely. Projecting the
 * release position forward by the distance the current velocity would cover in
 * `seconds` folds the flick into the same comparison the component already
 * makes, so one threshold serves both gestures.
 *
 * A quarter-second is the sweet spot: long enough that a deliberate flick
 * (~1500 px/s) projects ~375px and clears any panel threshold, short enough
 * that a slow drag reads as itself. Components pair this with
 * `@vielzeug/necromancer`'s `spring()`, seeded with the same release velocity,
 * so the projection decides *where* the panel settles and the spring reproduces
 * the momentum that put it there.
 */
export const FLING_PROJECTION_SECONDS = 0.25;

/**
 * Project a released position forward along the direction of `velocity`
 * (px/s), as if it had continued for {@link FLING_PROJECTION_SECONDS}.
 */
export function projectFling(position: number, velocity: number, seconds = FLING_PROJECTION_SECONDS): number {
  return position + velocity * seconds;
}
