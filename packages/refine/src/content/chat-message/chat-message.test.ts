import { type Fixture, mount, user } from '@vielzeug/ore/testing';

describe('ore-chat-message', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./chat-message');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Core Functionality', () => {
    it('renders slotted content inside the bubble', async () => {
      fixture = await mount('ore-chat-message', { html: 'Hello there' });

      expect(fixture.query('.bubble slot')).toBeTruthy();
      expect(fixture.element.textContent).toContain('Hello there');
    });

    it('trims leading/trailing whitespace from pretty-printed slotted HTML', async () => {
      // Regression: `.content` uses `white-space: pre-wrap` to preserve intentional line
      // breaks in long replies — but that also rendered the newline + indentation from
      // pretty-printed markup (`<ore-chat-message>\n  Hello\n</ore-chat-message>`) as visible
      // blank lines around the text, looking like oversized bubble padding.
      fixture = await mount('ore-chat-message', { html: '\n  It\u2019s sunny and 22\u00b0C in Lisbon.\n' });
      await fixture.flush();

      expect(fixture.element.textContent).toBe('It\u2019s sunny and 22\u00b0C in Lisbon.');
    });

    it('preserves intentional internal line breaks while trimming only the outer edges', async () => {
      fixture = await mount('ore-chat-message', { html: '\n  Line one\nLine two\n' });
      await fixture.flush();

      expect(fixture.element.textContent).toBe('Line one\nLine two');
    });

    it('trims leading whitespace even when a named-slotted avatar splits the default slot into two text nodes', async () => {
      // Regression: a named-slotted sibling between the opening tag and the message text
      // (e.g. `<ore-avatar slot="avatar">`) splits the light DOM into *two* default-slot
      // text nodes — text nodes can't target a named slot, so the run before the avatar and
      // the run after it are assigned separately. The old trim only touched
      // `assignedNodes()[0]` (the empty whitespace-only run before the avatar) and never
      // reached the leading indentation on the *second* node, where the real text actually
      // starts — leaving a blank line above the text inside the bubble.
      fixture = await mount('ore-chat-message', {
        attrs: { name: 'Assistant' },
        html: '\n  <span slot="avatar">A</span>\n  Here is the summary.\n',
      });
      await fixture.flush();

      const slot = fixture.query<HTMLSlotElement>('.content-slot')!;
      const texts = slot.assignedNodes({ flatten: true }).map((n) => n.textContent);

      expect(texts).toEqual(['', 'Here is the summary.']);
    });

    it('scopes the `pre-wrap` white-space handling to the slot, not `.content`', async () => {
      // Regression: `.content`'s own shadow-template whitespace (the newline + indentation
      // between `<slot>` and the cursor `<span>` in this template) rendered as real blank
      // lines when `white-space: pre-wrap` sat on `.content` itself — confirmed by measuring
      // rendered box height in a real browser (jsdom has no layout engine, so this test only
      // guards the structural fix: `pre-wrap` must live on the slot, scoped by this class,
      // not on `.content`, which needs normal whitespace collapsing for its own template gaps).
      fixture = await mount('ore-chat-message', { html: 'Hi' });

      const slot = fixture.query('.content slot');

      expect(slot?.classList.contains('content-slot')).toBe(true);
    });

    it('defaults to sender="assistant"', async () => {
      fixture = await mount('ore-chat-message');

      expect(fixture.element.getAttribute('sender')).toBe('assistant');
    });

    it('reflects an explicit sender attribute', async () => {
      fixture = await mount('ore-chat-message', { attrs: { sender: 'user' } });

      expect(fixture.element.getAttribute('sender')).toBe('user');
    });

    it('renders the display name when provided', async () => {
      fixture = await mount('ore-chat-message', { attrs: { name: 'Alex' } });

      expect(fixture.query('.name')?.textContent?.trim()).toBe('Alex');
    });

    // Regression, verified in a real browser (not testable in jsdom — see below): `.name`,
    // `.meta`, and `.actions` used a smaller inline padding than `.bubble`, so their text
    // sat noticeably left of the bubble's own text instead of lining up with it — most
    // visible with an avatar + name together. Fixed by matching all three to `.bubble`'s
    // inline padding. Confirmed via `getBoundingClientRect` in headless Chrome that the
    // name/meta/actions text and the bubble's own text now share the same left edge.
    //
    // No jsdom test for this: `getComputedStyle` doesn't resolve `var()` through an adopted
    // stylesheet (false positive — passes identically whether the bug is present or not),
    // and jsdom's CSS parser doesn't support `@layer` at all, silently dropping the entire
    // ruleset that wraps every rule in this file, so even reading declared values back out
    // of the parsed CSSOM isn't possible either. Layout-dependent checks like this are
    // explicitly out of this package's automated test scope — see `packages/refine/AGENTS.md`.
    // This exact class of bug (and two siblings — bubble stretch, phantom blank lines) is
    // covered instead by `scripts/verify-layout.mjs` (`pnpm verify:layout`, repo root).

    it('hides the name element when no name is set', async () => {
      fixture = await mount('ore-chat-message');

      expect(fixture.query('.name')?.hasAttribute('hidden')).toBe(true);
    });

    it('renders a formatted timestamp from an ISO string', async () => {
      fixture = await mount('ore-chat-message', { attrs: { timestamp: '2024-01-01T12:00:00Z' } });

      const time = fixture.query<HTMLTimeElement>('.timestamp');

      expect(time?.getAttribute('datetime')).toBe('2024-01-01T12:00:00Z');
      expect(time?.textContent?.trim()).not.toBe('');
    });

    it('hides the timestamp for an invalid date string', async () => {
      fixture = await mount('ore-chat-message', { attrs: { timestamp: 'not-a-date' } });

      expect(fixture.query('.timestamp')?.hasAttribute('hidden')).toBe(true);
    });

    it('shows the streaming cursor when `streaming` is set', async () => {
      fixture = await mount('ore-chat-message', { attrs: { streaming: '' } });

      expect(fixture.query('.cursor')?.hasAttribute('hidden')).toBe(false);
    });

    it('hides the streaming cursor by default', async () => {
      fixture = await mount('ore-chat-message');

      expect(fixture.query('.cursor')?.hasAttribute('hidden')).toBe(true);
    });

    it('renders the avatar slot content', async () => {
      fixture = await mount('ore-chat-message', {
        html: '<span slot="avatar">A</span>Hi',
      });

      expect(fixture.element.querySelector('[slot="avatar"]')).toBeTruthy();
    });

    it('renders the actions slot content', async () => {
      fixture = await mount('ore-chat-message', {
        html: '<button slot="actions">Copy</button>Hi',
      });

      expect(fixture.element.querySelector('[slot="actions"]')).toBeTruthy();
    });
  });

  describe('Status', () => {
    it('hides the meta row when there is nothing to show', async () => {
      fixture = await mount('ore-chat-message');

      expect(fixture.query('.meta')?.hasAttribute('hidden')).toBe(true);
    });

    it('shows a spinner for status="sending"', async () => {
      fixture = await mount('ore-chat-message', { attrs: { status: 'sending' } });

      expect(fixture.query('.spinner')).toBeTruthy();
      expect(fixture.query('.meta')?.hasAttribute('hidden')).toBe(false);
    });

    it('shows a check icon for status="sent"', async () => {
      fixture = await mount('ore-chat-message', { attrs: { status: 'sent' } });

      expect(fixture.query('.status ore-icon')?.getAttribute('name')).toBe('check');
    });

    it('shows an error icon, error text, and retry button for status="error"', async () => {
      fixture = await mount('ore-chat-message', { attrs: { error: 'Network error', status: 'error' } });

      expect(fixture.query('.status ore-icon')?.getAttribute('name')).toBe('alert-circle');
      expect(fixture.query('.error-text')?.textContent?.trim()).toBe('Network error');
      expect(fixture.query('.retry')?.hasAttribute('hidden')).toBe(false);
    });

    it('hides the retry button for non-error statuses', async () => {
      fixture = await mount('ore-chat-message', { attrs: { status: 'sent' } });

      expect(fixture.query('.retry')?.hasAttribute('hidden')).toBe(true);
    });

    it('emits retry when the retry button is clicked', async () => {
      fixture = await mount('ore-chat-message', { attrs: { status: 'error' } });

      const onRetry = vi.fn();

      fixture.element.addEventListener('retry', onRetry);
      await user.click(fixture.query<HTMLElement>('.retry')!);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Announcements', () => {
    const flushAnnounce = () => new Promise((r) => setTimeout(r, 60)); // announce() clear-then-set delay
    const assertiveRegion = () => document.querySelector('[data-block-announcer="assertive"]');

    it('announces a failed send once', async () => {
      // `announce()` requires a genuine reactive transition — mount already in `status="error"`
      // has no "before" state to transition from, so set it after mount instead.
      fixture = await mount('ore-chat-message');

      fixture.element.setAttribute('error', 'Network error');
      fixture.element.setAttribute('status', 'error');
      await fixture.flush();
      await flushAnnounce();

      expect(assertiveRegion()?.textContent).toBe('Message failed to send: Network error');
    });

    it('does not announce for non-error statuses', async () => {
      // The assertive region is a shared singleton across the whole document (by design —
      // see `headless/announcer.ts`), so this asserts "unchanged by this mount" rather than
      // "empty", since an earlier test in this file may have already written to it.
      const before = assertiveRegion()?.textContent;

      fixture = await mount('ore-chat-message', { attrs: { status: 'sent' } });

      await flushAnnounce();

      expect(assertiveRegion()?.textContent).toBe(before);
    });

    it('re-announces when a retry fails again with a different reason, even without leaving status="error"', async () => {
      // Regression: keying the announce purely on the status transition (non-error → error)
      // meant a second consecutive failure with a *different* error message never
      // re-announced, since `status` never left `"error"` in between.
      fixture = await mount('ore-chat-message');

      fixture.element.setAttribute('error', 'Network error');
      fixture.element.setAttribute('status', 'error');
      await fixture.flush();
      await flushAnnounce();
      expect(assertiveRegion()?.textContent).toBe('Message failed to send: Network error');

      fixture.element.setAttribute('error', 'Timeout');
      await fixture.flush();
      await flushAnnounce();

      expect(assertiveRegion()?.textContent).toBe('Message failed to send: Timeout');
    });
  });

  describe('Accessibility', () => {
    it('bubble has role article with a descriptive aria-label', async () => {
      fixture = await mount('ore-chat-message', { attrs: { sender: 'user' } });

      const bubble = fixture.query('.bubble');

      expect(bubble?.getAttribute('role')).toBe('article');
      expect(bubble?.getAttribute('aria-label')).toBe('Message from You');
    });

    it('uses the `name` prop in the aria-label when provided', async () => {
      fixture = await mount('ore-chat-message', { attrs: { name: 'Alex', sender: 'assistant' } });

      expect(fixture.query('.bubble')?.getAttribute('aria-label')).toBe('Message from Alex');
    });

    it('error text has role alert', async () => {
      fixture = await mount('ore-chat-message', { attrs: { error: 'Failed', status: 'error' } });

      expect(fixture.query('.error-text')?.getAttribute('role')).toBe('alert');
    });

    it('streaming cursor is aria-hidden', async () => {
      fixture = await mount('ore-chat-message', { attrs: { streaming: '' } });

      expect(fixture.query('.cursor')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('passes axe checks (default assistant message)', async () => {
      fixture = await mount('ore-chat-message', { html: 'Hello there' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks (error status with retry)', async () => {
      fixture = await mount('ore-chat-message', {
        attrs: { error: 'Failed to send', sender: 'user', status: 'error' },
        html: 'Hi there',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
