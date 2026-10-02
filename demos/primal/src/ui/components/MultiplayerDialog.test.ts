// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { sessionDialogOpen, sessionState } from '../../app/events';
import { campaigns, expeditions } from '../../app/store';
import { createCampaign } from '../../domain/campaign';
import { createExpedition } from '../../domain/expedition';
import MultiplayerDialog from './MultiplayerDialog.vue';

afterEach(() => {
  sessionDialogOpen.update(() => false);
  sessionState.update(() => ({ mode: null, subject: null }));
  campaigns.update(() => []);
  expeditions.update(() => []);
});

function mountDialog(): { app: ReturnType<typeof createApp>; container: HTMLDivElement } {
  const container = document.createElement('div');
  const app = createApp(MultiplayerDialog);
  for (const tag of [
    'ore-accordion',
    'ore-accordion-item',
    'ore-alert',
    'ore-button',
    'ore-chip',
    'ore-dialog',
    'ore-icon',
    'ore-list',
    'ore-list-item',
    'ore-qr-code',
    'ore-qr-scanner',
    'ore-separator',
    'ore-text',
    'ore-textarea',
  ]) {
    app.component(
      tag,
      defineComponent({
        setup(_, { attrs, slots }) {
          return () =>
            h(
              tag,
              attrs,
              Object.values(slots).flatMap((slot) => slot?.() ?? []),
            );
        },
      }),
    );
  }
  app.mount(container);
  return { app, container };
}

describe('MultiplayerDialog', () => {
  it('closes instead of showing the session list after hosting ends', async () => {
    sessionState.update(() => ({ mode: 'host', subject: { id: 'campaign-seed', kind: 'campaign' } }));
    sessionDialogOpen.update(() => true);
    const { app, container } = mountDialog();

    const end = [...container.querySelectorAll<HTMLElement>('ore-button')].find((button) =>
      button.textContent?.includes('End session'),
    );
    expect(end).toBeDefined();
    end?.click();
    await nextTick();
    expect(sessionDialogOpen.peek()).toBe(false);
    app.unmount();
  });

  it('lists active games but not completed campaigns or played expeditions', () => {
    const active = createCampaign({
      config: { expansionIds: ['core'], name: 'Active', nightmareVariant: false, variants: [] },
      hunterIds: ['daeron', 'mirah'],
      id: 'active',
      now: '2026-01-01T00:00:00.000Z',
    });
    campaigns.update(() => [active, { ...active, finalBattleWon: true, id: 'finished', name: 'Completed' }]);
    const ready = createExpedition('ready', ['core'], '2026-01-01T00:00:00.000Z');
    expeditions.update(() => [ready, { ...ready, id: 'played', status: 'played' }]);
    sessionDialogOpen.update(() => true);

    const { app, container } = mountDialog();
    const list = container.querySelector('.mp__host-list');
    expect(list?.querySelectorAll('ore-list-item')).toHaveLength(2);
    expect(list?.textContent).toContain('Active');
    expect(list?.textContent).not.toContain('Completed');
    app.unmount();
  });
});
