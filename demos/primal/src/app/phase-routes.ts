import { signal } from '@vielzeug/ripple';
import { createPhaseMirror, type PhaseMirrorOptions } from '@vielzeug/wayfinder';
import { getCurrentScope, onScopeDispose, type ShallowRef, watch } from 'vue';
import type { RouteName } from './router';
import { router } from './router';
import { useReadable } from './vue-bridge';

/**
 * Mirrors a subject's step phase into the URL as `/:subject/:id/:phase`: the shared routing
 * approach for every stepped flow (campaign chapters, ascents). The Vue adapter over
 * `@vielzeug/wayfinder`'s framework-neutral phase mirror: the domain side arrives as plain
 * getters over reactive state, which this adapter bridges into the ripple readables the
 * mirror subscribes to. Both live as long as the calling component's scope.
 */
export interface PhaseRoutesOptions<Phase extends string>
  extends Omit<PhaseMirrorOptions<Phase>, 'currentPhase' | 'detailRoute' | 'phaseRoute' | 'router' | 'subjectId'> {
  /** Reads the domain's current phase; `null` while the subject is missing. */
  readonly currentPhase: () => Phase | null;
  /** Bare detail route that canonicalizes onto the phase route. */
  readonly detailRoute: RouteName;
  /** Route name carrying the `:phase` segment. */
  readonly phaseRoute: RouteName;
  /** Reads the subject id; `null` while the subject is missing. */
  readonly subjectId: () => string | null;
}

export interface PhaseRoutes<Phase extends string> {
  /** Bounces a mismatched phase route back to the domain's actual phase: the dialog cancel path. */
  readonly bounceIfMismatched: () => void;
  /** Follows a tracker revisit link without writing history. */
  readonly followPhase: (phase: string) => void;
  /** Anchor href for one phase step; `#` while the subject is missing. */
  readonly phaseHref: (phase: string) => string;
  /** The phases the current phase may legally revisit: the tracker links exactly these. */
  readonly revisitPhases: Readonly<ShallowRef<readonly Phase[]>>;
  /** The phase segment of the current route, when it names a valid phase. */
  readonly routePhase: Readonly<ShallowRef<Phase | null>>;
}

export function createPhaseRoutes<Phase extends string>(options: PhaseRoutesOptions<Phase>): PhaseRoutes<Phase> {
  // Vue getters over reactive state → ripple readables the mirror subscribes to.
  const currentPhase = signal<Phase | null>(options.currentPhase());
  const subjectId = signal<string | null>(options.subjectId());
  const stops = [
    watch(options.currentPhase, (value) => currentPhase.update(() => value), { immediate: true }),
    watch(options.subjectId, (value) => subjectId.update(() => value), { immediate: true }),
  ];
  const mirror = createPhaseMirror<Phase>({
    ...options,
    currentPhase,
    detailRoute: options.detailRoute as string,
    phaseRoute: options.phaseRoute as string,
    router,
    subjectId,
  });
  const detach = (): void => {
    mirror.dispose();
    for (const stop of stops.splice(0)) stop();
  };
  if (getCurrentScope()) onScopeDispose(detach);
  return {
    bounceIfMismatched: mirror.bounceIfMismatched,
    followPhase: mirror.followPhase,
    phaseHref: mirror.phaseHref,
    // Ripple readables are not Vue-reactive: a bare Vue computed over `.value` would freeze
    // at its first read, so both bridge through `useReadable`'s subscription instead.
    revisitPhases: useReadable(mirror.revisitPhases),
    routePhase: useReadable(mirror.routePhase),
  };
}
