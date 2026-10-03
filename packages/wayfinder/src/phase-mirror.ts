import { computed, type Readable, watch } from '@vielzeug/ripple';

import { createRouteSignals } from './route-signals';
import type { Router } from './router';

/**
 * Mirrors a domain state machine's phase into the URL as `/:subject/:id/:phase`.
 *
 * The mirror never writes history: every phase transition REPLACES the route, so the browser
 * back button leaves the flow rather than stepping between phases. Arriving at a mismatched
 * phase route is a revisit request (the consumer owns its confirm dialog) or an impossible
 * jump, which bounces back to the actual phase. The bare detail URL canonicalizes onto the
 * current phase's route, so every arrival is shareable and reload-safe. The state machine
 * stays the sole source of truth: `canRevisit` decides which mismatched routes may ask and
 * which bounce.
 */
export interface PhaseMirrorOptions<Phase extends string> {
  /** Whether the domain may revisit `target` from `current`. */
  readonly canRevisit: (current: Phase, target: Phase) => boolean;
  /** Reads the domain's current phase; `null` while the subject is missing. */
  readonly currentPhase: Readable<Phase | null>;
  /** Bare detail route name that canonicalizes onto the phase route. */
  readonly detailRoute: string;
  /** Route name carrying the `:phase` segment. */
  readonly phaseRoute: string;
  /** Valid phase values; the route segment is validated against this list. */
  readonly phases: readonly Phase[];
  /** Runs the revisit the URL asked for: the consumer owns its confirm dialog and command. */
  readonly requestRevisit: (phase: Phase) => void;
  /**
   * Any wayfinder router instance. The mirror only navigates by route name with runtime-shaped
   * params, so it deliberately erases the route-table generic instead of propagating it.
   */
  readonly router: Router<any>;
  /** Reads the subject id; `null` while the subject is missing. */
  readonly subjectId: Readable<string | null>;
}

export interface PhaseMirror<Phase extends string> {
  /** Bounces a mismatched phase route back to the domain's actual phase: the dialog cancel path. */
  readonly bounceIfMismatched: () => void;
  /** Stops mirroring; the URL keeps whatever the last navigation left behind. */
  readonly dispose: () => void;
  /** Follows a tracker revisit link without writing history. */
  readonly followPhase: (phase: string) => void;
  /** Anchor href for one phase step; `#` while the subject is missing. */
  readonly phaseHref: (phase: string) => string;
  /** The phases the current phase may legally revisit: the tracker links exactly these. */
  readonly revisitPhases: Readable<readonly Phase[]>;
  /** The phase segment of the current route, when it names a valid phase. */
  readonly routePhase: Readable<Phase | null>;
}

/** Creates the two-way phase mirror between a domain state machine and a route segment. */
export function createPhaseMirror<Phase extends string>(options: PhaseMirrorOptions<Phase>): PhaseMirror<Phase> {
  const { name: routeName, params: routeParams } = createRouteSignals(options.router);

  const routePhase = computed<Phase | null>(() => {
    const segment = routeParams.value.phase as Phase | undefined;
    return segment !== undefined && options.phases.includes(segment) ? segment : null;
  });
  const revisitPhases = computed<readonly Phase[]>(() => {
    const phase = options.currentPhase.value;
    return phase ? options.phases.filter((entry) => options.canRevisit(phase, entry)) : [];
  });

  /** Lands on the phase's route, replacing so back exits the flow. */
  const goToPhase = (phase: string): void => {
    const id = options.subjectId.value;
    if (!id) return;
    void options.router.navigate({ name: options.phaseRoute, params: { id, phase } } as never, { replace: true });
  };

  const handles = [
    // The bare detail URL canonicalizes to the current phase's route.
    watch(
      () => `${options.subjectId.value ?? ''}|${routeName.value ?? ''}`,
      () => {
        const id = options.subjectId.value;
        const phase = options.currentPhase.value;
        // The URL names a different subject of the same flow: a cross-instance navigation.
        // Canonicalizing it here would stomp the arrival onto this mirror's own subject;
        // the arriving view's own mirror takes over from here.
        const urlSubjectId = routeParams.value.id;
        if (typeof urlSubjectId === 'string' && urlSubjectId !== id) return;
        if (routeName.value === options.detailRoute && id && phase) goToPhase(phase);
      },
      { immediate: true },
    ),
    // Domain → URL: every phase change lands on the phase's route.
    watch(options.currentPhase, (phase, previous) => {
      if (!phase || phase === previous) return;
      if (routePhase.value === phase) return;
      goToPhase(phase);
    }),
    // URL → domain: a mismatched or invalid phase route revisits (through the consumer's
    // dialog) or bounces. Reacts to the URL itself and to the domain loading (null → value,
    // which re-checks the mismatch a cold deep link brought in): never to domain-led changes:
    // an advance or a confirmed revisit swaps the domain before the URL catches up, and reading
    // the not-yet-updated URL as a revisit request would open the dialog on every advance.
    watch(
      () => [routePhase.value, options.currentPhase.value] as const,
      ([phase, current], previous) => {
        // The user left the stepped flow entirely: the mirror stops following. Ripple
        // watchers fire synchronously on route change (before the component unmounts), so
        // a departure reads as "phase vanished" and would bounce back without this guard.
        if (routeName.value !== options.phaseRoute && routeName.value !== options.detailRoute) return;
        // The URL names a different subject of the same flow: a cross-instance navigation,
        // not a phase mismatch. The old mirror's component unmounts right after this.
        const urlSubjectId = routeParams.value.id;
        if (typeof urlSubjectId === 'string' && urlSubjectId !== options.subjectId.value) return;
        const previousCurrent = previous?.[1] ?? null;
        // A domain-led change (value → value) belongs to the domain → URL watcher above.
        if (current !== previousCurrent && previousCurrent !== null) return;
        const id = options.subjectId.value;
        if (!id || !current) return;
        if (phase === current) return;
        if (phase && options.canRevisit(current, phase)) {
          options.requestRevisit(phase);
          return;
        }
        goToPhase(current);
      },
      { immediate: true },
    ),
  ];

  return {
    bounceIfMismatched: () => {
      const current = options.currentPhase.value;
      if (options.subjectId.value && current && routePhase.value !== null && routePhase.value !== current) {
        goToPhase(current);
      }
    },
    dispose: () => {
      for (const handle of handles.splice(0)) handle.dispose();
    },
    followPhase: goToPhase,
    phaseHref: (phase: string): string => {
      const id = options.subjectId.value;
      return id ? options.router.href(options.phaseRoute as never, { id, phase } as never) : '#';
    },
    revisitPhases,
    routePhase,
  };
}
