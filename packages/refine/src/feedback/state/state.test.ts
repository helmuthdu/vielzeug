import { fireClick } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-state', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./state');
    await import('../skeleton/skeleton');
    await import('../../content/icon/icon');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ── Status rendering ────────────────────────────────────────────────────────
  //
  // With the CSS-driven model every region is always in the shadow DOM.
  // Tests query within the relevant region class (.region-loading, etc.)
  // rather than relying on presence/absence of the element.

  describe('status: idle', () => {
    it('renders the idle region (always in DOM)', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'idle' } });

      expect(fixture.query('.region-idle')).not.toBeNull();
    });
  });

  describe('status: loading', () => {
    it('renders the default skeleton stack when no loading slot is provided', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'loading' } });

      expect(fixture.query('.region-loading .loading-default')).not.toBeNull();
    });

    it('sets aria-busy="true" on the host', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'loading' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('names the loading region "Loading…"', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'loading' } });

      expect(fixture.query('.region-loading')?.getAttribute('aria-label')).toBe('Loading\u2026');
    });

    it('renders a custom loading slot when provided', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'loading' },
        html: '<p slot="loading" class="custom-load">Loading…</p>',
      });

      await fixture.flush();

      expect(fixture.element.querySelector('.custom-load')).not.toBeNull();
      expect(fixture.query('.region-loading .loading-default')).toBeNull();
    });
  });

  describe('status: empty', () => {
    it('renders the default placeholder with label', async () => {
      fixture = await mount('ore-state', {
        attrs: { 'empty-label': 'No items found', status: 'empty' },
      });

      expect(fixture.query('.region-placeholder .placeholder')).not.toBeNull();
      expect(fixture.query('.region-placeholder .title')?.textContent?.trim()).toBe('No items found');
    });

    it('renders the default placeholder with description', async () => {
      fixture = await mount('ore-state', {
        attrs: { 'empty-description': 'Try clearing your filters', 'empty-label': 'Nothing here', status: 'empty' },
      });

      expect(fixture.query('.region-placeholder .description')?.textContent?.trim()).toBe('Try clearing your filters');
    });

    it('renders the default artwork icon', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'empty' } });

      await fixture.flush();

      const icon = fixture.query('.artwork-default ore-icon');

      expect(icon).not.toBeNull();
      expect(icon?.getAttribute('name')).toBe('package');
    });

    it('uses role="status" for the empty placeholder', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'empty' } });

      expect(fixture.query('.placeholder .message')?.getAttribute('role')).toBe('status');
    });

    it('hides the action row when nothing is slotted', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'empty' } });

      expect(fixture.query('.placeholder .actions')?.hasAttribute('hidden')).toBe(true);
    });

    it('shows the action row for slotted actions', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'empty' },
        html: '<button slot="actions" class="clear-btn">Clear filters</button>',
      });

      await fixture.flush();

      expect(fixture.query('.placeholder .actions')?.hasAttribute('hidden')).toBe(false);
      expect(fixture.query('slot[name="actions"]')).not.toBeNull();
    });

    it('renders a slotted illustration in place of the default icon', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'empty' },
        html: '<img slot="illustration" class="art" alt="" />',
      });

      await fixture.flush();

      expect(fixture.element.querySelector('.art')).not.toBeNull();
      expect(fixture.query('.artwork-default')?.hasAttribute('hidden')).toBe(true);
    });

    it('renders a custom empty slot when provided', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'empty' },
        html: '<div slot="empty" class="custom-empty">Custom</div>',
      });

      expect(fixture.element.querySelector('.custom-empty')).not.toBeNull();
    });

    it('drops the built-in placeholder when an empty override is slotted', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'empty' },
        html: '<div slot="empty" class="custom-empty">Custom</div>',
      });

      await fixture.flush();

      expect(fixture.query('.placeholder')).toBeNull();
    });

    it('sets aria-busy="false" on the host', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'empty' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('status: error', () => {
    it('renders the default placeholder with label', async () => {
      fixture = await mount('ore-state', {
        attrs: { 'error-label': 'Request failed', status: 'error' },
      });

      expect(fixture.query('.region-placeholder .placeholder')).not.toBeNull();
      expect(fixture.query('.region-placeholder .title')?.textContent?.trim()).toBe('Request failed');
    });

    it('renders the error description when provided', async () => {
      fixture = await mount('ore-state', {
        attrs: { 'error-description': 'Check your connection', 'error-label': 'Error', status: 'error' },
      });

      expect(fixture.query('.region-placeholder .description')?.textContent?.trim()).toBe('Check your connection');
    });

    it('renders the alert artwork and role', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'error' } });

      await fixture.flush();

      expect(fixture.query('.placeholder .message')?.getAttribute('role')).toBe('alert');
      expect(fixture.query('.artwork-default ore-icon')?.getAttribute('name')).toBe('triangle-alert');
    });

    it('does not show retry button by default', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'error' } });

      expect(fixture.query('.retry-btn')).toBeNull();
    });

    it('shows the retry button when retryable is set', async () => {
      fixture = await mount('ore-state', { attrs: { retryable: '', status: 'error' } });

      expect(fixture.query('.retry-btn')).not.toBeNull();
    });

    it('lets slotted actions replace the built-in retry button', async () => {
      fixture = await mount('ore-state', {
        attrs: { retryable: '', status: 'error' },
        html: '<button slot="actions" class="custom-retry">Reload</button>',
      });

      await fixture.flush();

      expect(fixture.query('.retry-btn')).toBeNull();
      expect(fixture.query('.placeholder .actions')?.hasAttribute('hidden')).toBe(false);
    });

    it('emits retry event when retry button is clicked', async () => {
      const calls: Event[] = [];

      fixture = await mount('ore-state', { attrs: { retryable: '', status: 'error' } });
      fixture.element.addEventListener('retry', (e) => calls.push(e));

      fireClick(fixture.query('.retry-btn')!);

      expect(calls).toHaveLength(1);
    });

    it('emits retry with no detail payload', async () => {
      let detail: unknown = 'unset';

      fixture = await mount('ore-state', { attrs: { retryable: '', status: 'error' } });
      fixture.element.addEventListener('retry', (e) => {
        detail = (e as CustomEvent).detail;
      });

      fireClick(fixture.query('.retry-btn')!);

      expect(detail).toBeNull();
    });

    it('sets aria-busy="false" and an alert message in error state', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'error' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
      expect(fixture.query('.placeholder .message')?.getAttribute('role')).toBe('alert');
    });

    it('renders a custom error slot when provided', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'error' },
        html: '<div slot="error" class="custom-error">Custom</div>',
      });

      expect(fixture.element.querySelector('.custom-error')).not.toBeNull();
    });

    it('drops the built-in placeholder when an error override is slotted', async () => {
      fixture = await mount('ore-state', {
        attrs: { retryable: '', status: 'error' },
        html: '<div slot="error" class="custom-error">Custom</div>',
      });

      await fixture.flush();

      expect(fixture.query('.placeholder')).toBeNull();
    });
  });

  describe('status: success', () => {
    it('renders default slot content when status is omitted', async () => {
      fixture = await mount('ore-state', {
        html: '<p class="content">Loaded by default</p>',
      });

      expect(fixture.element.querySelector('.content')?.textContent).toBe('Loaded by default');
    });

    it('renders default slot content', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'success' },
        html: '<p class="content">Loaded</p>',
      });

      expect(fixture.element.querySelector('.content')?.textContent).toBe('Loaded');
    });

    it('sets aria-busy="false" on the host', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'success' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });

    it('falls back to success region for unknown status values', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'done' as any },
        html: '<p class="content">Fallback content</p>',
      });

      expect(fixture.element.querySelector('.content')?.textContent).toBe('Fallback content');
    });
  });

  // ── Reactive status updates ──────────────────────────────────────────────────

  describe('reactive updates', () => {
    it('transitions from loading to success without DOM churn', async () => {
      fixture = await mount('ore-state', {
        attrs: { status: 'loading' },
        html: '<p class="data">Data</p>',
      });

      expect(fixture.query('.region-loading .loading-default')).not.toBeNull();

      fixture.element.setAttribute('status', 'success');
      await fixture.flush();

      expect(fixture.element.querySelector('.data')?.textContent).toBe('Data');
    });

    it('transitions from loading to error and shows the error placeholder', async () => {
      fixture = await mount('ore-state', {
        attrs: { 'error-label': 'Failed', status: 'loading' },
      });

      fixture.element.setAttribute('status', 'error');
      await fixture.flush();

      expect(fixture.query('.region-placeholder .message')?.getAttribute('role')).toBe('alert');
      expect(fixture.query('.region-placeholder .title')?.textContent?.trim()).toBe('Failed');
    });

    it('transitions from loading to empty and shows the empty placeholder', async () => {
      fixture = await mount('ore-state', {
        attrs: { 'empty-label': 'No data', status: 'loading' },
      });

      fixture.element.setAttribute('status', 'empty');
      await fixture.flush();

      expect(fixture.query('.region-placeholder .message')?.getAttribute('role')).toBe('status');
      expect(fixture.query('.region-placeholder .title')?.textContent?.trim()).toBe('No data');
    });

    it('swaps placeholder copy when status flips between empty and error', async () => {
      fixture = await mount('ore-state', {
        attrs: { 'empty-label': 'Nothing yet', 'error-label': 'Broken', status: 'empty' },
      });

      expect(fixture.query('.placeholder .title')?.textContent?.trim()).toBe('Nothing yet');

      fixture.element.setAttribute('status', 'error');
      await fixture.flush();

      expect(fixture.query('.placeholder .title')?.textContent?.trim()).toBe('Broken');
      expect(fixture.query('.placeholder .retry-btn')).toBeNull();
    });

    it('reacts when loading slot content is added after mount', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'loading' } });

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
      fixture = await mount('ore-state', {
        attrs: { status: 'empty' },
        html: '<div class="custom-empty">Custom</div>',
      });

      expect(fixture.query('.region-placeholder .placeholder')).not.toBeNull();

      fixture.element.querySelector('.custom-empty')?.setAttribute('slot', 'empty');
      await fixture.flush();

      expect(fixture.element.querySelector('.custom-empty')).not.toBeNull();
      expect(fixture.query('.region-placeholder .placeholder')).toBeNull();
    });

    it('reveals the action row when actions are slotted after mount', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'empty' } });

      expect(fixture.query('.placeholder .actions')?.hasAttribute('hidden')).toBe(true);

      const action = document.createElement('button');

      action.slot = 'actions';
      action.className = 'late-action';
      action.textContent = 'Create';
      fixture.element.append(action);

      await fixture.flush();

      expect(fixture.query('.placeholder .actions')?.hasAttribute('hidden')).toBe(false);
    });

    it('updates aria-busy reactively when status changes', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'loading' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');

      fixture.element.setAttribute('status', 'success');
      await fixture.flush();

      expect(fixture.element.getAttribute('aria-busy')).toBe('false');
    });
  });

  // ── Accessibility contract ───────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('keeps aria-live off the host so slotted success content is not announced', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'idle' } });

      expect(fixture.element.hasAttribute('aria-live')).toBe(false);
      expect(fixture.element.hasAttribute('aria-label')).toBe(false);
    });

    it('announces the empty placeholder politely through role="status"', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'empty' } });

      expect(fixture.query('.placeholder .message')?.getAttribute('role')).toBe('status');
    });

    it('announces the error placeholder assertively through role="alert"', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'error' } });

      expect(fixture.query('.placeholder .message')?.getAttribute('role')).toBe('alert');
    });

    it('error state uses role="alert" for immediate announcement', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'error' } });

      expect(fixture.query('[role="alert"]')).not.toBeNull();
    });

    it('loading state uses role="status" for polite announcement', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'loading' } });

      expect(fixture.query('[role="status"]')).not.toBeNull();
    });

    it('retry button is keyboard accessible (type=button prevents form submit)', async () => {
      fixture = await mount('ore-state', { attrs: { retryable: '', status: 'error' } });

      const btn = fixture.query<HTMLButtonElement>('.retry-btn');

      expect(btn?.type).toBe('button');
    });

    it('every region exists in the shadow DOM for live-region stability', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'loading' } });

      expect(fixture.query('.region-idle')).not.toBeNull();
      expect(fixture.query('.region-loading')).not.toBeNull();
      expect(fixture.query('.region-placeholder')).not.toBeNull();
      expect(fixture.query('.region-success')).not.toBeNull();
    });

    it('passes axe checks', async () => {
      fixture = await mount('ore-state', { attrs: { status: 'idle' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
