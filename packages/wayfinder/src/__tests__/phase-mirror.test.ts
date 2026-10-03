import { signal } from '@vielzeug/ripple';
import { createPhaseMirror } from '../phase-mirror';
import type { Router } from '../router';
import type { RouteState } from '../types';

const PHASES = ['draft', 'review', 'done'] as const;
type Phase = (typeof PHASES)[number];

/** Minimal router double: the mirror only reads snapshots and navigates by name. */
function fakeRouter(initialPath: string, initialName: string, initialParams: Record<string, string>) {
  const listeners = new Set<() => void>();
  const navigations: Array<{ name: string; params: Record<string, unknown>; replace: boolean | undefined }> = [];
  let name = initialName;
  let params: Record<string, unknown> = initialParams;

  const snapshot = (): RouteState =>
    ({
      location: { hash: '', pathname: initialPath, query: {} },
      matches: [{ data: undefined, name, params, pathname: initialPath }],
    }) as RouteState;

  const router = {
    getSnapshot: snapshot,
    href: (routeName: string, routeParams?: Record<string, unknown>) =>
      `/${routeName}/${Object.values(routeParams ?? {}).join('/')}`,
    navigate: (target: { name: string; params?: Record<string, unknown> }, options?: { replace?: boolean }) => {
      navigations.push({ name: target.name, params: target.params ?? {}, replace: options?.replace });
      name = target.name;
      params = target.params ?? {};
      for (const listener of [...listeners]) listener();

      return Promise.resolve();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };

  return { navigations, router: router as unknown as Router<any> };
}

describe('createPhaseMirror', () => {
  it('canonicalizes the bare detail route onto the current phase route', () => {
    const currentPhase = signal<Phase | null>('review');
    const subjectId = signal<string | null>('7');
    const { navigations, router } = fakeRouter('/jobs/7', 'jobDetail', { id: '7' });

    const mirror = createPhaseMirror<Phase>({
      canRevisit: () => false,
      currentPhase,
      detailRoute: 'jobDetail',
      phaseRoute: 'jobPhase',
      phases: PHASES,
      requestRevisit: () => {},
      router,
      subjectId,
    });

    expect(navigations).toEqual([{ name: 'jobPhase', params: { id: '7', phase: 'review' }, replace: true }]);
    mirror.dispose();
  });

  it('does not canonicalize a cross-instance detail navigation onto its own subject', () => {
    const currentPhase = signal<Phase | null>('done');
    const subjectId = signal<string | null>('7');
    const { navigations, router } = fakeRouter('/jobs/7/done', 'jobPhase', { id: '7', phase: 'done' });

    const mirror = createPhaseMirror<Phase>({
      canRevisit: () => false,
      currentPhase,
      detailRoute: 'jobDetail',
      phaseRoute: 'jobPhase',
      phases: PHASES,
      requestRevisit: () => {},
      router,
      subjectId,
    });
    expect(navigations).toHaveLength(0);

    // Navigating to another subject of the same flow while this mirror still holds subject 7:
    // the arrival must stay put: its own mirror canonicalizes it once it mounts.
    void router.navigate({ name: 'jobDetail', params: { id: '8' } });

    expect(navigations).toEqual([{ name: 'jobDetail', params: { id: '8' }, replace: undefined }]);
    mirror.dispose();
  });

  it('pushes a domain phase change onto the URL with replace', () => {
    const currentPhase = signal<Phase | null>('draft');
    const subjectId = signal<string | null>('7');
    const { navigations, router } = fakeRouter('/jobs/7/draft', 'jobPhase', { id: '7', phase: 'draft' });

    const mirror = createPhaseMirror<Phase>({
      canRevisit: () => false,
      currentPhase,
      detailRoute: 'jobDetail',
      phaseRoute: 'jobPhase',
      phases: PHASES,
      requestRevisit: () => {},
      router,
      subjectId,
    });
    expect(navigations).toHaveLength(0);

    currentPhase.value = 'review';

    expect(navigations).toEqual([{ name: 'jobPhase', params: { id: '7', phase: 'review' }, replace: true }]);
    mirror.dispose();
  });

  it('asks the consumer to revisit when the URL names a revisitable phase', () => {
    const currentPhase = signal<Phase | null>('done');
    const subjectId = signal<string | null>('7');
    const revisited: Phase[] = [];
    const { router } = fakeRouter('/jobs/7/review', 'jobPhase', { id: '7', phase: 'review' });

    const mirror = createPhaseMirror<Phase>({
      canRevisit: (current, target) => current === 'done' && target === 'review',
      currentPhase,
      detailRoute: 'jobDetail',
      phaseRoute: 'jobPhase',
      phases: PHASES,
      requestRevisit: (phase) => revisited.push(phase),
      router,
      subjectId,
    });

    expect(revisited).toEqual(['review']);
    mirror.dispose();
  });

  it('bounces an impossible phase route back to the actual phase', () => {
    const currentPhase = signal<Phase | null>('draft');
    const subjectId = signal<string | null>('7');
    const { navigations, router } = fakeRouter('/jobs/7/done', 'jobPhase', { id: '7', phase: 'done' });

    const mirror = createPhaseMirror<Phase>({
      canRevisit: () => false,
      currentPhase,
      detailRoute: 'jobDetail',
      phaseRoute: 'jobPhase',
      phases: PHASES,
      requestRevisit: () => {},
      router,
      subjectId,
    });

    expect(navigations).toEqual([{ name: 'jobPhase', params: { id: '7', phase: 'draft' }, replace: true }]);
    mirror.dispose();
  });

  it('stops following once the route leaves the stepped flow', () => {
    const currentPhase = signal<Phase | null>('draft');
    const subjectId = signal<string | null>('7');
    const { navigations, router } = fakeRouter('/jobs/7/draft', 'jobPhase', { id: '7', phase: 'draft' });

    const mirror = createPhaseMirror<Phase>({
      canRevisit: () => false,
      currentPhase,
      detailRoute: 'jobDetail',
      phaseRoute: 'jobPhase',
      phases: PHASES,
      requestRevisit: () => {},
      router,
      subjectId,
    });

    // Simulate departing the flow: the route no longer names a phase of this subject.
    (router as any).navigate({ name: 'home' });
    currentPhase.value = null;

    expect(navigations.filter((entry) => entry.name === 'jobPhase')).toHaveLength(0);
    mirror.dispose();
  });
});
