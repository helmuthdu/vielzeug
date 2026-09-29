import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

import type { ChatPanelElement, OreChatPanelMessage } from './chat-panel';

const greeting: OreChatPanelMessage = { sender: 'assistant', text: 'Hi! How can I help?' };

const openPanel = async (props: Partial<ChatPanelElement> = {}): Promise<Fixture<HTMLElement>> =>
  mount('ore-chat-panel', { props: { messages: [greeting], open: true, ...props } });

describe('ore-chat-panel', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./chat-panel');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Core Functionality', () => {
    it('renders a labelled region that is hidden until opened', async () => {
      fixture = await mount('ore-chat-panel', { attrs: { label: 'Model advisor' } });

      const window = fixture.query<HTMLElement>('.window')!;

      expect(window.getAttribute('role')).toBe('region');
      expect(window.getAttribute('aria-label')).toBe('Model advisor');
      expect(window.hidden).toBe(true);
    });

    it('reveals the window when the open prop is set', async () => {
      fixture = await openPanel();

      expect(fixture.query<HTMLElement>('.window')!.hidden).toBe(false);
    });

    it('renders each message as an ore-chat-message with the right sender', async () => {
      fixture = await openPanel({
        messages: [greeting, { sender: 'user', text: 'What is the range?' }],
      });

      const messages = fixture.queryAll('ore-chat-message');

      expect(messages).toHaveLength(2);
      expect(messages[0].getAttribute('sender')).toBe('assistant');
      expect(messages[1].getAttribute('sender')).toBe('user');
    });

    it('gives assistant messages an avatar and a name, and leaves user messages bare', async () => {
      fixture = await openPanel({
        messages: [greeting, { sender: 'user', text: 'Hello' }],
      });

      const [assistant, user] = fixture.queryAll('ore-chat-message');

      expect(assistant.querySelector('[slot="avatar"]')).not.toBeNull();
      expect(assistant.getAttribute('name')).toBe('Assistant');
      expect(user.getAttribute('name')).toBeNull();
    });

    it('renders a composer with the default character limit', async () => {
      fixture = await openPanel();

      const composer = fixture.query('ore-message-composer')!;

      expect(composer.getAttribute('maxlength')).toBe('240');
    });

    it('honours a custom maxlength', async () => {
      fixture = await openPanel({ maxlength: 120 });

      expect(fixture.query('ore-message-composer')!.getAttribute('maxlength')).toBe('120');
    });
  });

  describe('Suggestions', () => {
    it('shows suggestion chips while the transcript holds only the greeting', async () => {
      fixture = await openPanel({
        suggestions: [
          { label: 'Range', value: 'What is the range?' },
          { label: 'Trim', value: 'Which trims are there?' },
        ],
      });

      const chips = fixture.queryAll('.suggestions ore-chip');

      expect(chips).toHaveLength(2);
      expect(chips[0].textContent).toContain('Range');
    });

    it('hides suggestions once the conversation has started', async () => {
      fixture = await openPanel({
        messages: [greeting, { sender: 'user', text: 'Range?' }],
        suggestions: [{ label: 'Range', value: 'What is the range?' }],
      });

      expect(fixture.query('.suggestions')).toBeNull();
    });

    it('emits send with the suggestion value when a chip is clicked', async () => {
      fixture = await openPanel({
        suggestions: [{ label: 'Range', value: 'What is the range?' }],
      });

      const sent: string[] = [];

      fixture.element.addEventListener('send', (e) => sent.push((e as CustomEvent<{ text: string }>).detail.text));

      fireClick(fixture.query('.suggestions ore-chip')!);

      expect(sent).toEqual(['What is the range?']);
    });
  });

  describe('Events', () => {
    it('emits send with trimmed text when the composer sends', async () => {
      fixture = await openPanel();

      const sent: string[] = [];

      fixture.element.addEventListener('send', (e) => sent.push((e as CustomEvent<{ text: string }>).detail.text));

      const composer = fixture.query('ore-message-composer')!;

      composer.dispatchEvent(
        new CustomEvent('send', { bubbles: true, composed: true, detail: { value: '  Hello there  ' } }),
      );

      expect(sent).toEqual(['Hello there']);
    });

    it('ignores a blank composer send', async () => {
      fixture = await openPanel();

      const handler = vi.fn();

      fixture.element.addEventListener('send', handler);

      fixture
        .query('ore-message-composer')!
        .dispatchEvent(new CustomEvent('send', { bubbles: true, composed: true, detail: { value: '   ' } }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not leak the composer raw send event to consumers', async () => {
      fixture = await openPanel();

      const handler = vi.fn();

      fixture.element.addEventListener('send', handler);

      // The panel re-emits its own `send`; the composer's composed `send` must be
      // swallowed at the panel boundary, so exactly one `send` reaches a consumer.
      fixture
        .query('ore-message-composer')!
        .dispatchEvent(new CustomEvent('send', { bubbles: true, composed: true, detail: { value: 'Hi' } }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits action with the message payload when a message action is clicked', async () => {
      fixture = await openPanel({
        messages: [{ ...greeting, action: { label: 'See specs', payload: 'specifications' } }],
      });

      const actions: unknown[] = [];

      fixture.element.addEventListener('action', (e) =>
        actions.push((e as CustomEvent<{ payload: unknown }>).detail.payload),
      );

      const actionButton =
        fixture.query('[slot="actions"]') ?? fixture.queryAll('ore-chat-message')[0].querySelector('[slot="actions"]');

      fireClick(actionButton!);

      expect(actions).toEqual(['specifications']);
    });

    it('shows a Start over button only after the conversation has started', async () => {
      fixture = await openPanel();

      // The close button also lives in `.tools`; Start over is the text variant.
      expect(fixture.query('.tools ore-button[variant="text"]')).toBeNull();

      await fixture.act(() => {
        fixture.element.messages = [greeting, { sender: 'user', text: 'Hi' }];
      });

      const startOver = fixture.query('.tools ore-button[variant="text"]')!;

      expect(startOver.textContent).toContain('Start over');
    });

    it('emits reset when Start over is clicked', async () => {
      fixture = await openPanel({ messages: [greeting, { sender: 'user', text: 'Hi' }] });

      const handler = vi.fn();

      fixture.element.addEventListener('reset', handler);

      fireClick(fixture.query('.tools ore-button[variant="text"]')!);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Open / Close', () => {
    it('reflects the open attribute when opened imperatively', async () => {
      fixture = await mount('ore-chat-panel');

      const panel = fixture.element as ChatPanelElement;

      panel.show();
      await fixture.flush();

      expect(fixture.element.hasAttribute('open')).toBe(true);
      expect(fixture.query<HTMLElement>('.window')!.hidden).toBe(false);
    });

    it('hides when closed imperatively', async () => {
      fixture = await openPanel();

      (fixture.element as ChatPanelElement).hide();
      await fixture.flush();

      expect(fixture.element.hasAttribute('open')).toBe(false);
      expect(fixture.query<HTMLElement>('.window')!.hidden).toBe(true);
    });

    it('emits open-change with open state and reason', async () => {
      fixture = await mount('ore-chat-panel');

      const details: unknown[] = [];

      fixture.element.addEventListener('open-change', (e) => details.push((e as CustomEvent).detail));

      (fixture.element as ChatPanelElement).show();
      await fixture.flush();

      expect(details).toEqual([{ open: true, reason: 'programmatic' }]);
    });

    it('closes on Escape with an escape reason', async () => {
      fixture = await openPanel();

      let detail: unknown;

      fixture.element.addEventListener('open-change', (e) => {
        detail = (e as CustomEvent).detail;
      });

      fireKeyDown(fixture.query('.window')!, { key: 'Escape' });
      await fixture.flush();

      expect(detail).toEqual({ open: false, reason: 'escape' });
    });

    it('closes on Escape via the document listener when focus is elsewhere', async () => {
      fixture = await openPanel();

      const handler = vi.fn();

      fixture.element.addEventListener('open-change', handler);

      fireKeyDown(document.body, { key: 'Escape' });
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
      expect(fixture.element.hasAttribute('open')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('exposes the transcript as a polite live region', async () => {
      fixture = await openPanel();

      const log = fixture.query('.messages')!;

      expect(log.getAttribute('role')).toBe('log');
      expect(log.getAttribute('aria-live')).toBe('polite');
    });

    it('has no detectable violations', async () => {
      fixture = await openPanel({
        messages: [greeting, { sender: 'user', text: 'What is the range?' }],
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
