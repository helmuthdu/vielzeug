// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { createPhaseRoutes } from './phase-routes';
import { router } from './router';

type TestPhase = 'hunt' | 'preparing' | 'story';

const settle = async (): Promise<void> => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('createPhaseRoutes', () => {
  const scopes: ReturnType<typeof effectScope>[] = [];

  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop();
  });

  const mount = (currentPhase: { value: TestPhase | null }) => {
    const requestRevisit = vi.fn();
    const scope = effectScope();
    scopes.push(scope);
    const routes = scope.run(() =>
      createPhaseRoutes<TestPhase>({
        canRevisit: (current, target) => current === 'hunt' && (target === 'preparing' || target === 'story'),
        currentPhase: () => currentPhase.value,
        detailRoute: 'ascentDetail',
        phaseRoute: 'ascentPhase',
        phases: ['story', 'preparing', 'hunt'],
        requestRevisit,
        subjectId: () => 'subject',
      }),
    )!;
    return { requestRevisit, routes };
  };

  it('advances the URL when the domain advances, without asking for a revisit', async () => {
    await router.navigate('/ascents/subject/story');
    const phase = ref<TestPhase | null>('story');
    const { requestRevisit } = mount(phase);
    await settle();

    phase.value = 'preparing';
    await settle();

    expect(router.getSnapshot().location.pathname).toBe('/ascents/subject/preparing');
    expect(requestRevisit).not.toHaveBeenCalled();
  });

  it('asks for a revisit when the URL arrives at a revisit-able phase', async () => {
    await router.navigate('/ascents/subject/hunt');
    const phase = ref<TestPhase | null>('hunt');
    const { requestRevisit } = mount(phase);
    await settle();

    await router.navigate('/ascents/subject/preparing');
    await settle();

    expect(requestRevisit).toHaveBeenCalledWith('preparing');
  });

  it('asks when the domain loads on a cold deep link to a revisit-able phase', async () => {
    await router.navigate('/ascents/subject/preparing');
    const phase = ref<TestPhase | null>(null);
    const { requestRevisit } = mount(phase);
    await settle();
    expect(requestRevisit).not.toHaveBeenCalled();

    phase.value = 'hunt';
    await settle();

    expect(requestRevisit).toHaveBeenCalledWith('preparing');
  });

  it('bounces an impossible or invalid phase route back to the actual phase', async () => {
    await router.navigate('/ascents/subject/hunt');
    const phase = ref<TestPhase | null>('hunt');
    const { requestRevisit } = mount(phase);
    await settle();

    await router.navigate('/ascents/subject/nonsense');
    await settle();

    expect(requestRevisit).not.toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/ascents/subject/hunt');
  });

  it('does not bounce back when navigating to a different subject of the same flow', async () => {
    await router.navigate('/ascents/subject/hunt');
    const phase = ref<TestPhase | null>('hunt');
    mount(phase);
    await settle();

    // Navigating to another ascent's phase route must not read as a mismatch to bounce from.
    await router.navigate('/ascents/other/preparing');
    await settle();

    expect(router.getSnapshot().location.pathname).toBe('/ascents/other/preparing');
  });

  it('does not bounce back when navigating away from the flow entirely', async () => {
    await router.navigate('/ascents/subject/hunt');
    const phase = ref<TestPhase | null>('hunt');
    mount(phase);
    await settle();

    // Leaving the stepped flow for a different route must not fight the navigation.
    await router.navigate('/');
    await settle();

    expect(router.getSnapshot().location.pathname).toBe('/');
  });

  it('canonicalizes the bare detail route onto the current phase', async () => {
    await router.navigate('/ascents/subject/hunt');
    const phase = ref<TestPhase | null>('hunt');
    mount(phase);
    await settle();

    await router.navigate('/ascents/subject');
    await settle();

    expect(router.getSnapshot().location.pathname).toBe('/ascents/subject/hunt');
  });

  it('keeps the Vue-side revisit phases and route phase live as the domain advances', async () => {
    await router.navigate('/ascents/subject/story');
    const phase = ref<TestPhase | null>('story');
    const { routes } = mount(phase);
    await settle();
    expect(routes.revisitPhases.value).toEqual([]);
    expect(routes.routePhase.value).toBe('story');

    phase.value = 'preparing';
    await settle();
    expect(routes.revisitPhases.value).toEqual([]);
    expect(routes.routePhase.value).toBe('preparing');

    phase.value = 'hunt';
    await settle();
    expect(routes.revisitPhases.value).toEqual(['story', 'preparing']);
    expect(routes.routePhase.value).toBe('hunt');
  });
});
