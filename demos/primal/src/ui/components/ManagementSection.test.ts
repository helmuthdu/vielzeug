// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { pendingHostSubject, sessionDialogOpen, sessionState } from '../../app/events';
import ManagementSection from './ManagementSection.vue';

const mounted: Array<ReturnType<typeof createApp>> = [];

afterEach(() => {
  for (const app of mounted) app.unmount();
  mounted.length = 0;
  pendingHostSubject.update(() => null);
  sessionDialogOpen.update(() => false);
  sessionState.update(() => ({ mode: null, subject: null }));
});

function mountManagement(
  props: {
    deleteBody: string;
    deleteLabel: string;
    deleteTitle: string;
    guest?: boolean;
    hostable?: boolean;
    name?: string;
    nameLabel?: string;
    onRemove?: () => void;
    onRename?: (name: string) => void;
    renameTitle?: string;
    subject?: { id: string; kind: 'campaign' | 'expedition' | 'challenge' | 'ascent' };
  },
  duplicate = false,
): { app: ReturnType<typeof createApp>; container: HTMLDivElement } {
  const container = document.createElement('div');
  const app = createApp({
    render: () =>
      h(
        ManagementSection,
        {
          ...props,
          hostable: props.hostable ?? true,
          subject: props.subject ?? { id: 'test-session', kind: 'challenge' },
        },
        duplicate ? { default: () => h('ore-button', 'Duplicate') } : undefined,
      ),
  });
  for (const tag of ['ore-button', 'ore-dialog', 'ore-icon', 'ore-input', 'ore-text']) {
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
  mounted.push(app);
  return { app, container };
}

describe('ManagementSection', () => {
  it('opens the multiplayer host flow for this session', () => {
    const subject = { id: 'campaign-1', kind: 'campaign' as const };
    const { app, container } = mountManagement({
      deleteBody: 'Delete this run?',
      deleteLabel: 'Delete',
      deleteTitle: 'Delete run',
      subject,
    });

    container.querySelector<HTMLElement>('.management__share')?.click();

    expect(pendingHostSubject.peek()).toEqual(subject);
    expect(sessionDialogOpen.peek()).toBe(true);
    app.unmount();
    mounted.pop();
  });

  it('labels the session action for the game currently being hosted', async () => {
    const subject = { id: 'campaign-1', kind: 'campaign' as const };
    const { app, container } = mountManagement({
      deleteBody: 'Delete this run?',
      deleteLabel: 'Delete',
      deleteTitle: 'Delete run',
      subject,
    });
    const button = container.querySelector('.management__share');
    expect(button?.textContent?.trim()).toBe('Host session');
    expect(button?.querySelector('ore-icon')?.getAttribute('name')).toBe('waypoints');

    sessionState.update(() => ({ mode: 'host', subject }));
    await nextTick();
    expect(button?.textContent?.trim()).toBe('Session details');

    sessionState.update(() => ({ mode: 'host', subject: { id: 'campaign-2', kind: 'campaign' } }));
    await nextTick();
    expect(button?.textContent?.trim()).toBe('Host session');
    app.unmount();
    mounted.pop();
  });

  it('hides Host session for finished games but keeps their live Session details', async () => {
    const subject = { id: 'campaign-1', kind: 'campaign' as const };
    const { app, container } = mountManagement({
      deleteBody: 'Delete this run?',
      deleteLabel: 'Delete',
      deleteTitle: 'Delete run',
      hostable: false,
      subject,
    });
    expect(container.querySelector('.management__share')).toBeNull();

    sessionState.update(() => ({ mode: 'host', subject }));
    await nextTick();
    expect(container.querySelector('.management__share')?.textContent?.trim()).toBe('Session details');

    sessionState.update(() => ({ mode: null, subject: null }));
    await nextTick();
    expect(container.querySelector('.management__share')).toBeNull();
    app.unmount();
    mounted.pop();
  });

  it('offers rename and backups separately from confirmed owner deletion', async () => {
    const rename = vi.fn();
    const remove = vi.fn();
    const { app, container } = mountManagement(
      {
        deleteBody: 'Delete this run?',
        deleteLabel: 'Delete',
        deleteTitle: 'Delete run',
        name: 'First name',
        nameLabel: 'Run name',
        onRemove: remove,
        onRename: rename,
        renameTitle: 'Rename run',
      },
      true,
    );
    const actions = container.querySelector('.management__actions');
    expect(actions?.textContent).toContain('Duplicate');
    expect(actions?.querySelector('ore-button[href="/settings?section=data"]')).not.toBeNull();

    actions?.querySelector<HTMLElement>('.management__utilities ore-button')?.click();
    await nextTick();
    const input = container.querySelector('ore-input') as HTMLElement & { value: string };
    expect(input.getAttribute('value')).toBe('First name');
    input.value = '   ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    const dialogs = container.querySelectorAll('ore-dialog');
    dialogs[0]?.querySelector<HTMLElement>('ore-button:last-child')?.click();
    expect(rename).not.toHaveBeenCalled();

    input.value = '  New name  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    dialogs[0]?.querySelector<HTMLElement>('ore-button:last-child')?.click();
    expect(rename).toHaveBeenCalledWith('New name');

    actions?.querySelector<HTMLElement>('.management__remove ore-button')?.click();
    await nextTick();
    dialogs[1]?.querySelector<HTMLElement>('ore-button:last-child')?.click();
    expect(remove).toHaveBeenCalledOnce();
    app.unmount();
    mounted.pop();
  });

  it('links expedition management to the backup section', () => {
    const { app, container } = mountManagement({
      deleteBody: 'Delete expedition?',
      deleteLabel: 'Delete',
      deleteTitle: 'Delete expedition',
      subject: { id: 'expedition-1', kind: 'expedition' },
    });

    expect(container.querySelector('ore-button[href="/settings?section=data"]')).not.toBeNull();
    app.unmount();
    mounted.pop();
  });

  it('places a primary action after utilities and before deletion', () => {
    const container = document.createElement('div');
    const app = createApp({
      render: () =>
        h(
          ManagementSection,
          {
            deleteBody: 'Delete this run?',
            deleteLabel: 'Delete',
            deleteTitle: 'Delete run',
            hostable: true,
            subject: { id: 'run-1', kind: 'challenge' },
          },
          { primary: () => h('ore-button', 'Start fresh') },
        ),
    });
    app.mount(container);
    mounted.push(app);

    expect([...container.querySelector('.management__actions')!.children].map((element) => element.className)).toEqual([
      'management__utilities',
      'management__primary',
      'management__remove',
    ]);
  });

  it('shows guests a Leave session action without owner management controls', async () => {
    const remove = vi.fn();
    const { app, container } = mountManagement(
      {
        deleteBody: 'Delete this run?',
        deleteLabel: 'Delete',
        deleteTitle: 'Delete run',
        guest: true,
        name: 'Shared run',
        onRemove: remove,
      },
      true,
    );

    expect(container.querySelector('.management__utilities')).toBeNull();
    expect(container.querySelector('.management__actions')?.textContent?.trim()).toBe('Leave');
    expect(container.querySelector('.management__actions')?.textContent).not.toContain('Duplicate');
    expect(container.querySelector('.management__actions')?.textContent).not.toContain('Delete');

    container.querySelector<HTMLElement>('.management__remove ore-button')?.click();
    await nextTick();
    const dialogs = container.querySelectorAll('ore-dialog');
    expect(dialogs[1]?.getAttribute('label')).toBe('Leave this session?');
    dialogs[1]?.querySelector<HTMLElement>('ore-button:last-child')?.click();
    expect(remove).toHaveBeenCalledOnce();

    app.unmount();
    mounted.pop();
  });
});
