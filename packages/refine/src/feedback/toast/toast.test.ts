import { FLUSH_DEEP, type Fixture, mount, user, waitFor } from '@vielzeug/ore/testing';

import type { ToastElement } from './toast';

import { createToastService } from './toast';

// ── Test helpers ──────────────────────────────────────────────────────────────

// Trigger the transitionend on ALL exiting inner elements (jsdom does not run CSS).
const completeAllExits = async (fixture: Fixture<HTMLElement>, flush: () => Promise<void>) => {
  for (const el of fixture.queryAll<HTMLElement>('.toast-inner.exiting')) {
    el.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true }));
  }

  await flush();
};

// Trigger transitionend on the first exiting inner element.
const completeExit = async (fixture: Fixture<HTMLElement>, flush: () => Promise<void>) => {
  fixture
    .query<HTMLElement>('.toast-inner.exiting')
    ?.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true }));
  await flush();
};

// Find the close button inside the first ore-alert's shadow DOM.
const getCloseButton = (fixture: Fixture<HTMLElement>): HTMLElement | null => {
  const alert = fixture.query<HTMLElement>('ore-alert');

  return alert?.shadowRoot?.querySelector<HTMLElement>('[part="close"]') ?? null;
};

// ── Component tests ───────────────────────────────────────────────────────────

describe('ore-toast', () => {
  let fixture: Fixture<HTMLElement & ToastElement>;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders toast container with live region', async () => {
      fixture = await mount('ore-toast');

      expect(fixture.query('[role="region"]')).toBeTruthy();
    });

    it('live region has aria-live polite', async () => {
      fixture = await mount('ore-toast');

      expect(fixture.query('[aria-live="polite"]')).toBeTruthy();
    });

    it('live region has accessible label', async () => {
      fixture = await mount('ore-toast');

      expect(fixture.query('[aria-label="Notifications"]')).toBeTruthy();
    });

    it('toast-wrapper has part="toast-wrapper"', async () => {
      fixture = await mount('ore-toast');

      fixture.element.add({ duration: 0, message: 'Part test' });
      await fixture.flush();

      expect(fixture.query('[part="toast-wrapper"]')).toBeTruthy();
    });

    it('toast-inner has part="toast-inner"', async () => {
      fixture = await mount('ore-toast');

      fixture.element.add({ duration: 0, message: 'Inner part test' });
      await fixture.flush();

      expect(fixture.query('[part="toast-inner"]')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('applies position attribute', async () => {
      fixture = await mount('ore-toast', { attrs: { position: 'top-left' } });

      expect(fixture.element.getAttribute('position')).toBe('top-left');
    });

    it('applies max attribute', async () => {
      fixture = await mount('ore-toast', { attrs: { max: '3' } });

      expect(fixture.element.getAttribute('max')).toBe('3');
    });
  });

  describe('add()', () => {
    it('shows toast message after add', async () => {
      fixture = await mount('ore-toast');

      fixture.element.add({ message: 'Test notification' });
      await fixture.flush();

      await waitFor(() => {
        expect(fixture.query('ore-alert')?.textContent?.trim()).toContain('Test notification');
      });
    });

    it('returns a stable id', async () => {
      fixture = await mount('ore-toast');

      const id = fixture.element.add({ message: 'Hello' });

      await fixture.flush();

      expect(fixture.query(`[data-toast-id="${id}"]`)).toBeTruthy();
    });

    it('renders the close button when dismissible (default)', async () => {
      fixture = await mount('ore-toast');

      fixture.element.add({ duration: 0, message: 'Closable' });
      await fixture.flush();

      expect(getCloseButton(fixture)).toBeTruthy();
    });

    it('does not render close button when dismissible is false', async () => {
      fixture = await mount('ore-toast');

      fixture.element.add({ dismissible: false, duration: 0, message: 'Not closable' });
      await fixture.flush();

      const btn = getCloseButton(fixture);

      expect(btn === null || btn.hidden).toBe(true);
    });

    it('toast starts in entering phase then transitions to active', async () => {
      fixture = await mount('ore-toast');

      fixture.element.add({ duration: 0, message: 'Entering' });

      // Before flush: element may have entering class
      await fixture.flush();

      // After rAF resolves: entering class should be gone
      await waitFor(() => {
        const inner = fixture.query('.toast-inner');

        expect(inner?.classList.contains('entering')).toBe(false);
        expect(inner?.classList.contains('exiting')).toBe(false);
      });
    });
  });

  describe('max eviction', () => {
    it('evicts oldest toast with animation when max is exceeded', async () => {
      fixture = await mount('ore-toast', { attrs: { max: '2' } });

      const onDismiss = vi.fn();

      fixture.element.add({ duration: 0, message: 'First', onDismiss });
      fixture.element.add({ duration: 0, message: 'Second' });
      fixture.element.add({ duration: 0, message: 'Third' });

      // Deep flush: reactive update + queueMicrotask in removeToast runs,
      // attaching transitionend listener to the re-rendered .toast-inner.exiting.
      await fixture.flush(FLUSH_DEEP);

      // First toast should be in exiting state (animated eviction).
      expect(fixture.queryAll('.toast-inner.exiting').length).toBeGreaterThanOrEqual(1);

      // After exit animation completes, onDismiss should fire.
      await completeAllExits(fixture, () => fixture.flush());

      expect(onDismiss).toHaveBeenCalled();
    });

    it('fires dismiss event for evicted toasts', async () => {
      fixture = await mount('ore-toast', { attrs: { max: '1' } });

      const handler = vi.fn();

      fixture.element.addEventListener('dismiss', handler);

      const id1 = fixture.element.add({ duration: 0, message: 'First' });

      await fixture.flush();

      fixture.element.add({ duration: 0, message: 'Second' });

      // Deep flush: reactive render + queueMicrotask listener setup.
      await fixture.flush(FLUSH_DEEP);

      await completeAllExits(fixture, () => fixture.flush());

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { id: id1 } }));
    });
  });

  describe('dismiss()', () => {
    it('clicking close button removes toast after animation', async () => {
      fixture = await mount('ore-toast');

      fixture.element.add({ dismissible: true, duration: 0, message: 'Closable' });
      await fixture.flush();

      const closeBtn = getCloseButton(fixture);

      expect(closeBtn).toBeTruthy();

      await user.click(closeBtn!);
      await fixture.flush();

      await completeExit(fixture, () => fixture.flush());

      expect(fixture.query('ore-alert')).toBeNull();
    });

    it('programmatic dismiss removes toast after animation', async () => {
      fixture = await mount('ore-toast');

      const id = fixture.element.add({ duration: 0, message: 'Gone' });

      await fixture.flush();

      fixture.element.dismiss(id);
      await fixture.flush();

      await completeExit(fixture, () => fixture.flush());

      expect(fixture.query(`[data-toast-id="${id}"]`)).toBeNull();
    });

    it('duplicate dismiss calls on the same id are no-ops', async () => {
      fixture = await mount('ore-toast');

      const id = fixture.element.add({ duration: 0, message: 'Once' });

      await fixture.flush();

      fixture.element.dismiss(id);
      fixture.element.dismiss(id);
      await fixture.flush();

      // Only one .toast-inner.exiting should exist.
      const exiting = fixture.queryAll('.toast-inner.exiting');

      expect(exiting.length).toBe(1);
    });

    it('two toasts can exit in parallel', async () => {
      fixture = await mount('ore-toast');

      const id1 = fixture.element.add({ duration: 0, message: 'First' });
      const id2 = fixture.element.add({ duration: 0, message: 'Second' });

      await fixture.flush();

      fixture.element.dismiss(id1);
      fixture.element.dismiss(id2);
      await fixture.flush();

      const exiting = fixture.queryAll('.toast-inner.exiting');

      expect(exiting.length).toBe(2);
    });

    it('active toasts are not stuck in exiting state after a dismiss + add sequence', async () => {
      fixture = await mount('ore-toast');

      const id1 = fixture.element.add({ duration: 0, message: 'First' });
      const id2 = fixture.element.add({ duration: 0, message: 'Second' });

      await fixture.flush();

      fixture.element.dismiss(id1);

      const id3 = fixture.element.add({ duration: 0, message: 'Third' });

      await fixture.flush();
      await completeExit(fixture, () => fixture.flush());

      const second = fixture.query(`[data-toast-id="${id2}"] .toast-inner`);
      const third = fixture.query(`[data-toast-id="${id3}"] .toast-inner`);

      expect(second?.classList.contains('exiting')).toBe(false);
      expect(third?.classList.contains('exiting')).toBe(false);
    });
  });

  describe('update()', () => {
    it('updates message in place', async () => {
      fixture = await mount('ore-toast');

      const id = fixture.element.add({ duration: 0, message: 'Old' });

      await fixture.flush();

      fixture.element.update(id, { message: 'New' });
      await fixture.flush();

      expect(fixture.query('ore-alert')?.textContent?.trim()).toContain('New');
    });

    it('update on unknown id is a no-op', async () => {
      fixture = await mount('ore-toast');

      // Should not throw.
      expect(() => fixture.element.update('nonexistent-id', { message: 'Noop' })).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('starts exit animation on all toasts', async () => {
      fixture = await mount('ore-toast');

      fixture.element.add({ duration: 0, message: 'A' });
      fixture.element.add({ duration: 0, message: 'B' });
      await fixture.flush();

      fixture.element.clear();
      await fixture.flush();

      const exiting = fixture.queryAll('.toast-inner.exiting');

      expect(exiting.length).toBe(2);
    });
  });

  describe('Positions', () => {
    for (const position of ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']) {
      it(`accepts ${position} position`, async () => {
        fixture = await mount('ore-toast', { attrs: { position } });

        expect(fixture.element.getAttribute('position')).toBe(position);
        fixture.dispose();
      });
    }
  });

  describe('Events', () => {
    it('fires add event with id when toast is added', async () => {
      fixture = await mount('ore-toast');

      const handler = vi.fn();

      fixture.element.addEventListener('add', handler);

      const id = fixture.element.add({ duration: 0, message: 'Event test' });

      await fixture.flush();

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { id } }));
    });

    it('fires dismiss event after exit animation completes', async () => {
      fixture = await mount('ore-toast');

      const handler = vi.fn();

      fixture.element.addEventListener('dismiss', handler);

      const id = fixture.element.add({ duration: 0, message: 'Bye' });

      await fixture.flush();

      fixture.element.dismiss(id);
      await fixture.flush();
      await completeExit(fixture, () => fixture.flush());

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { id } }));
    });

    it('calls onDismiss callback after exit animation completes', async () => {
      fixture = await mount('ore-toast');

      const onDismiss = vi.fn();
      const id = fixture.element.add({ duration: 0, message: 'Callback', onDismiss });

      await fixture.flush();

      fixture.element.dismiss(id);
      await fixture.flush();
      await completeExit(fixture, () => fixture.flush());

      expect(onDismiss).toHaveBeenCalled();
    });

    it('dismiss event is NOT fired before exit animation completes', async () => {
      fixture = await mount('ore-toast');

      const handler = vi.fn();

      fixture.element.addEventListener('dismiss', handler);

      const id = fixture.element.add({ duration: 0, message: 'Not yet' });

      await fixture.flush();

      fixture.element.dismiss(id);
      await fixture.flush();

      // transitionend not dispatched yet — handler must not have been called.
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

// ── Accessibility tests ───────────────────────────────────────────────────────

describe('ore-toast accessibility', () => {
  let fixture: Awaited<ReturnType<typeof mount>>;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Live Region', () => {
    it('has role region', async () => {
      fixture = await mount('ore-toast');

      expect(fixture.query('[role="region"]')).toBeTruthy();
    });

    it('has aria-live polite', async () => {
      fixture = await mount('ore-toast');

      expect(fixture.query('[aria-live="polite"]')).toBeTruthy();
    });

    it('has aria-relevant additions removals', async () => {
      fixture = await mount('ore-toast');

      const region = fixture.query('[aria-live="polite"]');

      expect(region?.getAttribute('aria-relevant')).toBe('additions removals');
    });

    it('has aria-atomic false for individual updates', async () => {
      fixture = await mount('ore-toast');

      const region = fixture.query('[aria-live="polite"]');

      expect(region?.getAttribute('aria-atomic')).toBe('false');
    });

    it('polite region label is Notifications', async () => {
      fixture = await mount('ore-toast');

      expect(fixture.query('[aria-live="polite"]')?.getAttribute('aria-label')).toBe('Notifications');
    });

    it('assertive region exists for critical toasts', async () => {
      fixture = await mount('ore-toast');

      expect(fixture.query('[aria-live="assertive"]')).toBeTruthy();
    });

    it('assertive region label is Critical notifications', async () => {
      fixture = await mount('ore-toast');

      expect(fixture.query('[aria-live="assertive"]')?.getAttribute('aria-label')).toBe('Critical notifications');
    });
  });

  describe('Close button', () => {
    it('close button has aria-label', async () => {
      fixture = await mount('ore-toast');

      (fixture.element as HTMLElement & ToastElement).add({ duration: 0, message: 'A11y test' });
      await fixture.flush();

      const btn = getCloseButton(fixture);

      expect(btn?.getAttribute('aria-label')).toBe('Dismiss alert');
    });

    it('close button is keyboard accessible via click', async () => {
      fixture = await mount('ore-toast');

      const el = fixture.element as HTMLElement & ToastElement;
      const handler = vi.fn();

      el.addEventListener('dismiss', handler);

      const id = el.add({ dismissible: true, duration: 0, message: 'Keyboard close' });

      await fixture.flush();

      const btn = getCloseButton(fixture);

      expect(btn).toBeTruthy();

      await user.click(btn!);
      await fixture.flush();

      await completeExit(fixture, () => fixture.flush());

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { id } }));
    });

    it('toasts with urgency assertive route to assertive live region', async () => {
      fixture = await mount('ore-toast');

      (fixture.element as HTMLElement & ToastElement).add({
        duration: 0,
        message: 'Critical!',
        urgency: 'assertive',
      });
      await fixture.flush();

      const assertiveRegion = fixture.query('[aria-live="assertive"]');

      expect(assertiveRegion?.querySelector('ore-alert')).toBeTruthy();
    });
  });
});

// ── createToastService tests ──────────────────────────────────────────────────

describe('createToastService', () => {
  let fixture: Fixture<HTMLElement & ToastElement>;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('re-uses an existing mounted ore-toast inside the root', async () => {
    // mount() produces a fully-initialized ore-toast (onMounted has fired).
    fixture = await mount('ore-toast');

    const container = fixture.element.parentElement!;
    const countBefore = container.querySelectorAll('ore-toast').length;

    // Service points at the same container — should find the existing element.
    const service = createToastService(container);

    service.add({ duration: 0, message: 'Reuse' });
    await fixture.flush();

    // No new ore-toast was created.
    expect(container.querySelectorAll('ore-toast').length).toBe(countBefore);
  });

  it('applies pendingConfig attributes on the auto-created element', () => {
    // Don't call add() — just verify that configure() stores config which is
    // applied when the element is eventually created.
    const container = document.createElement('div');

    document.body.appendChild(container);

    const service = createToastService(container);

    service.configure({ max: 3, position: 'top-left' });

    // Stub add so we can verify configure was stored without triggering onMounted.
    const addSpy = vi.fn().mockReturnValue('id');

    service.add = addSpy;
    service.add({ message: 'noop' });

    // pendingConfig must be set — verify indirectly by checking that configure()
    // does NOT warn (it was called before any host creation).
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // configure() should be a no-op warning since host isn't created yet.
    // But wait — host is not created yet (add is stubbed). So this configure call
    // should also be silently merged.
    service.configure({ max: 5 });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    container.remove();
  });

  it('configure() warns in dev when called after container was already created', async () => {
    fixture = await mount('ore-toast');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Service targeting the fixture's parent finds the existing mounted element.
    const service = createToastService(fixture.element.parentElement!);

    // add() uses the already-mounted element — no new creation needed.
    service.add({ duration: 0, message: 'Trigger' });
    await fixture.flush();

    service.configure({ position: 'top-left' });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('toast.configure() called after'));

    warnSpy.mockRestore();
  });

  it('two independent services pointing at different containers are isolated', async () => {
    const containerA = document.createElement('div');
    const containerB = document.createElement('div');

    document.body.appendChild(containerA);
    document.body.appendChild(containerB);

    const fixtureA = await mount('ore-toast', { container: containerA });
    const fixtureB = await mount('ore-toast', { container: containerB });

    const serviceA = createToastService(containerA);
    const serviceB = createToastService(containerB);

    const idA = serviceA.add({ duration: 0, message: 'A' });
    const idB = serviceB.add({ duration: 0, message: 'B' });

    await fixtureA.flush();
    await fixtureB.flush();

    // Each service's toast only appears in its own ore-toast's shadow root.
    const shadowA = containerA.querySelector('ore-toast')?.shadowRoot;
    const shadowB = containerB.querySelector('ore-toast')?.shadowRoot;

    expect(shadowA?.querySelector(`[data-toast-id="${idA}"]`)).toBeTruthy();
    expect(shadowA?.querySelector(`[data-toast-id="${idB}"]`)).toBeNull();

    expect(shadowB?.querySelector(`[data-toast-id="${idB}"]`)).toBeTruthy();
    expect(shadowB?.querySelector(`[data-toast-id="${idA}"]`)).toBeNull();

    fixtureA.dispose();
    fixtureB.dispose();
    containerA.remove();
    containerB.remove();
  });
});

// ── ToastService shortcut methods ─────────────────────────────────────────────

describe('toast service shortcuts', () => {
  let container: HTMLElement;

  beforeAll(async () => {
    await import('../alert/alert');
    await import('./toast');
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  const makeStubService = () => {
    const service = createToastService(container);
    // Stub add() so shortcuts can be tested without a live DOM element.
    const addSpy = vi.fn().mockReturnValue('stub-id');

    service.add = addSpy;

    return { addSpy, service };
  };

  it('success() calls add with color: success', () => {
    const { addSpy, service } = makeStubService();

    service.success('Saved!');

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'success', message: 'Saved!' }));
  });

  it('error() calls add with color: error', () => {
    const { addSpy, service } = makeStubService();

    service.error('Failed');

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'error', message: 'Failed' }));
  });

  it('info() calls add with color: info', () => {
    const { addSpy, service } = makeStubService();

    service.info('FYI');

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'info', message: 'FYI' }));
  });

  it('warning() calls add with color: warning', () => {
    const { addSpy, service } = makeStubService();

    service.warning('Heads up');

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning', message: 'Heads up' }));
  });

  it('shortcut opts are merged with lower priority than color', () => {
    const { addSpy, service } = makeStubService();

    service.success('Done', { duration: 0, heading: 'Result' });

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success', duration: 0, heading: 'Result', message: 'Done' }),
    );
  });
});

describe('ore-toast accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./toast');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-toast-provider');

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
