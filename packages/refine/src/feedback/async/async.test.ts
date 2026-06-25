import { fire, type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-async', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./async');
    await import('../skeleton/skeleton');
    await import('../../content/icon/icon');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ── Status rendering ────────────────────────────────────────────────────────
  //
  // With the CSS-driven model all five regions are always in the shadow DOM.
  // Tests query within the relevant region class (.region-loading, etc.)
  // rather than relying on presence/absence of the element.

  describe('status: idle', () => {
    it('renders the idle region (always in DOM)', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'idle' } });

      expect(fixture.query('.region-idle')).not.toBeNull();
    });
  });

  describe('status: loading', () => {
    it('renders the default skeleton stack when no loading slot is provided', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'loading' } });

      expect(fixture.query('.region-loading .loading-default')).not.toBeNull();
    });

    it('sets aria-busy="true" on the host', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'loading' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('sets aria-label="Loading…" on the host', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'loading' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Loading\u2026');
    });

    it('renders a custom loading slot when provided', async () => {
      fixture = await mount('ore-async', {
        attrs: { status: 'loading' },
        html: '<p slot="loading" class="custom-load">Loading…</p>',
      });

      await fixture.flush();

      expect(fixture.element.querySelector('.custom-load')).not.toBeNull();
      expect(fixture.query('.region-loading .loading-default')).toBeNull();
    });
  });

  describe('status: empty', () => {
    it('renders the default empty state with label', async () => {
      fixture = await mount('ore-async', {
        attrs: { 'empty-label': 'No items found', status: 'empty' },
      });

      expect(fixture.query('.region-empty .empty-state')).not.toBeNull();
      expect(fixture.query('.region-empty .title')?.textContent?.trim()).toBe('No items found');
    });

    it('renders the default empty state with description', async () => {
      fixture = await mount('ore-async', {
        attrs: { 'empty-description': 'Try clearing your filters', 'empty-label': 'Nothing here', status: 'empty' },
      });

      expect(fixture.query('.region-empty .description')?.textContent?.trim()).toBe('Try clearing your filters');
    });

    it('renders empty state icon', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'empty' } });

      await fixture.flush();
      expect(fixture.query('.region-empty .empty-state .icon ore-icon')).not.toBeNull();
    });

    it('renders a custom empty slot when provided', async () => {
      fixture = await mount('ore-async', {
        attrs: { status: 'empty' },
        html: '<div slot="empty" class="custom-empty">Custom</div>',
      });

      expect(fixture.element.querySelector('.custom-empty')).not.toBeNull();
    });

    it('sets aria-busy="false" on the host', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'empty' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('status: error', () => {
    it('renders the default error state with label', async () => {
      fixture = await mount('ore-async', {
        attrs: { 'error-label': 'Request failed', status: 'error' },
      });

      expect(fixture.query('.region-error .error-state')).not.toBeNull();
      expect(fixture.query('.region-error .title')?.textContent?.trim()).toBe('Request failed');
    });

    it('renders the error description when provided', async () => {
      fixture = await mount('ore-async', {
        attrs: { 'error-description': 'Check your connection', 'error-label': 'Error', status: 'error' },
      });

      expect(fixture.query('.region-error .description')?.textContent?.trim()).toBe('Check your connection');
    });

    it('does not show retry button by default', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'error' } });

      expect(fixture.query('.retry-btn')).toBeNull();
    });

    it('shows the retry button when retryable is set', async () => {
      fixture = await mount('ore-async', { attrs: { retryable: '', status: 'error' } });

      expect(fixture.query('.retry-btn')).not.toBeNull();
    });

    it('emits retry event when retry button is clicked', async () => {
      const calls: Event[] = [];

      fixture = await mount('ore-async', { attrs: { retryable: '', status: 'error' } });
      fixture.element.addEventListener('retry', (e) => calls.push(e));

      fire.click(fixture.query('.retry-btn')!);

      expect(calls).toHaveLength(1);
    });

    it('sets aria-busy="false" and aria-live="assertive" in error state', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'error' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
      expect(fixture.element.getAttribute('aria-live')).toBe('assertive');
    });

    it('renders a custom error slot when provided', async () => {
      fixture = await mount('ore-async', {
        attrs: { status: 'error' },
        html: '<div slot="error" class="custom-error">Custom</div>',
      });

      expect(fixture.element.querySelector('.custom-error')).not.toBeNull();
    });
  });

  describe('status: success', () => {
    it('renders default slot content when status is omitted', async () => {
      fixture = await mount('ore-async', {
        html: '<p class="content">Loaded by default</p>',
      });

      expect(fixture.element.querySelector('.content')?.textContent).toBe('Loaded by default');
    });

    it('renders default slot content', async () => {
      fixture = await mount('ore-async', {
        attrs: { status: 'success' },
        html: '<p class="content">Loaded</p>',
      });

      expect(fixture.element.querySelector('.content')?.textContent).toBe('Loaded');
    });

    it('sets aria-busy="false" on the host', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'success' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });

    it('falls back to success region for unknown status values', async () => {
      fixture = await mount('ore-async', {
        attrs: { status: 'done' as any },
        html: '<p class="content">Fallback content</p>',
      });

      expect(fixture.element.querySelector('.content')?.textContent).toBe('Fallback content');
    });
  });

  // ── Reactive status updates ──────────────────────────────────────────────────

  describe('reactive updates', () => {
    it('transitions from loading to success without DOM churn', async () => {
      fixture = await mount('ore-async', {
        attrs: { status: 'loading' },
        html: '<p class="data">Data</p>',
      });

      expect(fixture.query('.region-loading .loading-default')).not.toBeNull();

      fixture.element.setAttribute('status', 'success');
      await fixture.flush();

      expect(fixture.element.querySelector('.data')?.textContent).toBe('Data');
    });

    it('transitions from loading to error and shows error state', async () => {
      fixture = await mount('ore-async', {
        attrs: { 'error-label': 'Failed', status: 'loading' },
      });

      fixture.element.setAttribute('status', 'error');
      await fixture.flush();

      expect(fixture.query('.region-error .error-state')).not.toBeNull();
      expect(fixture.query('.region-error .title')?.textContent?.trim()).toBe('Failed');
    });

    it('transitions from loading to empty and shows empty state', async () => {
      fixture = await mount('ore-async', {
        attrs: { 'empty-label': 'No data', status: 'loading' },
      });

      fixture.element.setAttribute('status', 'empty');
      await fixture.flush();

      expect(fixture.query('.region-empty .empty-state')).not.toBeNull();
      expect(fixture.query('.region-empty .title')?.textContent?.trim()).toBe('No data');
    });

    it('reacts when loading slot content is added after mount', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'loading' } });

      expect(fixture.query('.region-loading .loading-default')).not.toBeNull();

      const customLoading = document.createElement('p');

      customLoading.className = 'custom-load';
      customLoading.slot = 'loading';
      customLoading.textContent = 'Loading…';
      fixture.element.append(customLoading);

      await fixture.flush();

      expect(fixture.element.querySelector('.custom-load')).not.toBeNull();
      expect(fixture.query('.region-loading .loading-default')).toBeNull();
    });

    it('reacts when an existing child is reassigned to the empty slot', async () => {
      fixture = await mount('ore-async', {
        attrs: { status: 'empty' },
        html: '<div class="custom-empty">Custom</div>',
      });

      expect(fixture.query('.region-empty .empty-state')).not.toBeNull();

      fixture.element.querySelector('.custom-empty')?.setAttribute('slot', 'empty');
      await fixture.flush();

      expect(fixture.element.querySelector('.custom-empty')).not.toBeNull();
      expect(fixture.query('.region-empty .empty-state')).toBeNull();
    });

    it('updates aria-busy reactively when status changes', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'loading' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');

      fixture.element.setAttribute('status', 'success');
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });
  });

  // ── Accessibility contract ───────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('exposes aria-live="polite" by default', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'idle' } });

      expect(fixture.element.getAttribute('aria-live')).toBe('polite');
    });

    it('exposes aria-live="assertive" in error state', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'error' } });

      expect(fixture.element.getAttribute('aria-live')).toBe('assertive');
    });

    it('error state uses role="alert" for immediate announcement', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'error' } });

      expect(fixture.query('[role="alert"]')).not.toBeNull();
    });

    it('loading state uses role="status" for polite announcement', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'loading' } });

      expect(fixture.query('[role="status"]')).not.toBeNull();
    });

    it('retry button is keyboard accessible (type=button prevents form submit)', async () => {
      fixture = await mount('ore-async', { attrs: { retryable: '', status: 'error' } });

      const btn = fixture.query<HTMLButtonElement>('.retry-btn');

      expect(btn?.type).toBe('button');
    });

    it('all regions exist in the shadow DOM for live-region stability', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'loading' } });

      expect(fixture.query('.region-idle')).not.toBeNull();
      expect(fixture.query('.region-loading')).not.toBeNull();
      expect(fixture.query('.region-empty')).not.toBeNull();
      expect(fixture.query('.region-error')).not.toBeNull();
      expect(fixture.query('.region-success')).not.toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-async', { attrs: { status: 'idle' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
