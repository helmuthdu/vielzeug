import type { OreTourElement, TourController } from '@vielzeug/refine/tour';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mountOnboarding } from './onboarding';

// Minimal stand-in for <ore-tour>: mirrors the real card's bind() contract
// (render the snapshot into props, route the card's actions into the
// controller), because the contract under test is the bridge's choreography,
// not the card's rendering (covered by refine's own suite).
class StubCard extends HTMLElement {
  bind(controller: TourController): () => void {
    const apply = (): void => {
      const current = controller.current.peek();

      Object.assign(this, {
        anchor: current.rect ?? null,
        description: current.step?.description ?? '',
        open: current.step !== null,
        placement: current.placement === 'auto' ? 'bottom' : current.placement,
        presentation: current.presentation,
        'step-index': current.stepIndex,
        title: current.step?.title ?? '',
        'total-steps': current.totalSteps,
      });
    };

    const unsubscribe = controller.current.subscribe(apply);

    const route = (action: 'back' | 'dismiss' | 'finish' | 'next' | 'skip') => (): void => {
      (controller[action] ?? controller.dismiss).call(controller);
    };

    const listeners: [string, EventListener][] = [
      ['back', route('back')],
      ['dismiss', route('dismiss')],
      ['finish', route('finish')],
      ['next', route('next')],
      ['skip', route('skip')],
    ];

    for (const [type, listener] of listeners) this.addEventListener(type, listener);
    apply();

    return () => {
      unsubscribe();
      for (const [type, listener] of listeners) this.removeEventListener(type, listener);
    };
  }
}

customElements.define('stub-tour-card', StubCard);

const stubCard = (): OreTourElement => document.createElement('stub-tour-card') as unknown as OreTourElement;

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

let fixture: HTMLElement;

beforeEach(() => {
  // The tour and coachmark anchor to these hooks; beacon waits for a step's
  // target to exist before publishing it, so they must be present.
  fixture = document.createElement('div');
  fixture.innerHTML = `
    <nav data-tour="navigation"></nav>
    <section data-tour="board"></section>
    <button data-tour="pinned-tile"></button>
    <button data-tour="add-tile"></button>
    <button data-tour="share"></button>
  `;
  document.body.append(fixture);
});

afterEach(() => {
  fixture.remove();
});

describe('mountOnboarding', () => {
  it('drives the tour card from the beacon handle and forwards its events', async () => {
    const tourCard = stubCard();
    const coachCard = stubCard();
    const handle = mountOnboarding({ coachCard, tourCard });

    // autoStart fires on a microtask after the synchronous storage load.
    await flush();

    expect(tourCard.open).toBe(true);
    expect(tourCard.title).toBe('Welcome to Signalbox');
    // Kebab-case prop keys: ore exposes el['step-index'], never el.stepIndex.
    expect(tourCard['step-index']).toBe(0);
    expect(tourCard['total-steps']).toBe(5);
    // The welcome step has no target, so it centers instead of anchoring.
    expect(tourCard.anchor).toBeNull();
    expect(handle.statusText.value).toContain('step 1 of 5');

    // The card's next event advances the tour to the anchored nav step.
    tourCard.dispatchEvent(new Event('next'));

    expect(tourCard.title).toBe('Move around the workspace');
    expect(tourCard['step-index']).toBe(1);
    expect(tourCard.anchor).not.toBeNull();

    // Escape-style dismissal closes the card and marks the tour dismissed.
    tourCard.dispatchEvent(new CustomEvent('dismiss', { detail: { reason: 'escape' } }));

    expect(tourCard.open).toBe(false);
    expect(handle.statusText.value).toContain('dismissed');

    handle.dispose();
  });

  it('shows and dismisses the coachmark through the handle', async () => {
    const tourCard = stubCard();
    const coachCard = stubCard();
    const handle = mountOnboarding({ coachCard, tourCard });

    await flush();

    expect(coachCard.open).toBe(false);

    handle.showShareHint();

    expect(coachCard.open).toBe(true);
    expect(coachCard.title).toBe('Share this board');
    expect(coachCard.presentation).toBe('popover');

    handle.dismissCoach();

    expect(coachCard.open).toBe(false);

    handle.dispose();
  });

  it('surfaces the coachmark only when the tour is finished, not skipped', async () => {
    const tourCard = stubCard();
    const coachCard = stubCard();
    const handle = mountOnboarding({ coachCard, tourCard });

    await flush();

    // Walk to the last step and Skip: opting out of guidance must not be
    // answered with another prompt.
    tourCard.dispatchEvent(new Event('skip'));
    await flush();

    expect(coachCard.open).toBe(false);
    expect(handle.statusText.value).toContain('dismissed');

    handle.dispose();
  });

  it('ends an active tour when the user navigates away (endTour)', async () => {
    const tourCard = stubCard();
    const coachCard = stubCard();
    const handle = mountOnboarding({ coachCard, tourCard });

    await flush();

    expect(tourCard.open).toBe(true);

    handle.endTour();

    expect(tourCard.open).toBe(false);
    expect(handle.statusText.value).toContain('dismissed');
    // Ending is not finishing: no coachmark reward.
    expect(coachCard.open).toBe(false);

    handle.dispose();
  });

  it('stops driving the cards once disposed', async () => {
    const tourCard = stubCard();
    const coachCard = stubCard();
    const handle = mountOnboarding({ coachCard, tourCard });

    await flush();
    handle.dispose();

    expect(() => tourCard.dispatchEvent(new Event('next'))).not.toThrow();
    expect(handle.disposed).toBe(true);
  });
});
