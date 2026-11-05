import { type Fixture, mount } from '@vielzeug/ore/testing';

import type { DrawerElement } from './drawer';

const pointer = { bubbles: true, composed: true, isPrimary: true, pointerType: 'touch' } as const;

/**
 * Drive the drawer's release spring to rest. Vitest fake timers would freeze
 * performance.now() (the spring's clock) while still firing animation frames,
 * so frames are driven synchronously with an advancing timestamp instead: the
 * mock runs each callback inline, recursing until the spring settles.
 */
function driveFrames(stepMs = 16): void {
  let now = 0;

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    now += stepMs;
    cb(now);

    return 1;
  });
}

describe('ore-drawer', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }

    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }

    await import('./drawer');
  });

  afterEach(() => {
    fixture?.dispose();
    vi.restoreAllMocks();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a native dialog element', async () => {
      fixture = await mount('ore-drawer');

      expect(fixture.query('dialog')).toBeTruthy();
    });

    it('renders the panel div inside the dialog', async () => {
      fixture = await mount('ore-drawer');

      expect(fixture.query('.panel')).toBeTruthy();
    });

    it('renders a close button', async () => {
      fixture = await mount('ore-drawer');

      expect(fixture.query('[aria-label="Close"]')).toBeTruthy();
    });

    it('renders default slots', async () => {
      fixture = await mount('ore-drawer', {
        html: '<p>Body content</p>',
      });

      expect(fixture.element.textContent).toContain('Body content');
    });

    it('renders header slot content', async () => {
      fixture = await mount('ore-drawer', {
        html: '<span slot="header">Title</span>',
      });

      expect(fixture.element.textContent).toContain('Title');
    });

    it('renders title prop as header fallback text', async () => {
      fixture = await mount('ore-drawer', { attrs: { title: 'Settings' } });

      expect(fixture.query('.header-title')?.textContent?.trim()).toContain('Settings');
    });

    it('renders label prop as header fallback text', async () => {
      fixture = await mount('ore-drawer', { attrs: { label: 'Settings panel' } });

      expect(fixture.query('.header-title')?.textContent?.trim()).toContain('Settings panel');
    });

    it('does not render undefined text in header when no label or title is provided', async () => {
      fixture = await mount('ore-drawer');

      expect(fixture.query('.header')?.textContent).not.toContain('undefined');
    });

    it('renders footer slot content', async () => {
      fixture = await mount('ore-drawer', {
        html: '<button slot="footer">Save</button>',
      });

      expect(fixture.element.textContent).toContain('Save');
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('dialog is hidden when open is false', async () => {
      fixture = await mount('ore-drawer');

      const dialog = fixture.query('dialog');

      expect(dialog?.hasAttribute('open')).toBe(false);
    });

    it('dialog is open when open prop is set', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('initializes an uncontrolled drawer with default-open', async () => {
      fixture = await mount('ore-drawer', { attrs: { 'default-open': '' } });

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('reflects placement attribute on host', async () => {
      fixture = await mount('ore-drawer', { attrs: { placement: 'left' } });

      expect(fixture.element.getAttribute('placement')).toBe('left');
    });

    it('reflects size attribute on host', async () => {
      fixture = await mount('ore-drawer', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('reflects backdrop attribute on host', async () => {
      fixture = await mount('ore-drawer', { attrs: { backdrop: 'transparent' } });

      expect(fixture.element.getAttribute('backdrop')).toBe('transparent');
    });

    it('reflects drag-handle-placement attribute on host', async () => {
      fixture = await mount('ore-drawer', { attrs: { 'drag-handle-placement': 'inset' } });

      expect(fixture.element.getAttribute('drag-handle-placement')).toBe('inset');
    });
  });

  // ─── Open / Close ─────────────────────────────────────────────────────────

  describe('Open / Close', () => {
    it('opens when open attribute is added', async () => {
      fixture = await mount('ore-drawer');

      await fixture.attr('open', '');

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('closes when open attribute is removed', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });

      // Use the close button to trigger close
      const closeBtn = fixture.query<HTMLButtonElement>('[aria-label="Close"]');

      if (closeBtn) {
        closeBtn.click();

        // Manually dispatch transitionend on the panel since jsdom doesn't run transitions
        const panel = fixture.query('.panel');

        panel?.dispatchEvent(new Event('transitionend', { bubbles: true }));
        await fixture.flush();
      }

      expect(fixture.query('dialog[open]')).toBeFalsy();
    });

    it('springs the panel closed and closes the dialog when a swipe crosses the commit line', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });
      driveFrames();

      const panel = fixture.query<HTMLElement>('.panel');
      const dragHandle = fixture.query<HTMLElement>('.drag-handle');

      expect(panel).toBeTruthy();
      expect(dragHandle).toBeTruthy();

      Object.defineProperty(panel!, 'offsetWidth', {
        configurable: true,
        get: () => 200,
      });

      dragHandle?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 1 }));
      dragHandle?.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 120, pointerId: 1 }));

      // The panel tracks the finger exactly during the drag, before release.
      expect(panel?.style.transform).toBe('translateX(120px)');

      dragHandle?.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: 120, pointerId: 1 }));

      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeFalsy();
      // The closed panel stays parked off-screen until the next open cycle.
      expect(panel?.style.visibility).toBe('hidden');
    });

    it('keeps the drawer open when a swipe close is prevented', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });
      fixture.element.addEventListener('close-request', (event) => event.preventDefault());
      driveFrames();

      const panel = fixture.query<HTMLElement>('.panel')!;
      const handle = fixture.query<HTMLElement>('.drag-handle')!;
      expect(handle.getAttribute('aria-hidden')).toBe('true');
      expect(handle.hasAttribute('role')).toBe(false);
      Object.defineProperty(panel, 'offsetWidth', { configurable: true, get: () => 200 });
      handle.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 8 }));
      handle.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 150, pointerId: 8 }));
      handle.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: 150, pointerId: 8 }));
      await fixture.flush();

      expect(fixture.query('dialog')?.hasAttribute('open')).toBe(true);
      // A prevented close must undo the exit state: the settle spring adds `.closing` to fade the
      // backdrop, so leaving it here would keep the veil faded and hide the panel while open.
      expect(fixture.query('dialog')?.classList.contains('closing')).toBe(false);
      expect(panel.style.visibility).toBe('');
      expect(panel.style.transform).toBe('');
    });

    it('commits close on pointerup when release crosses the swipe commit line', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });
      driveFrames();

      const panel = fixture.query<HTMLElement>('.panel');
      const dragHandle = fixture.query<HTMLElement>('.drag-handle');

      expect(panel).toBeTruthy();
      expect(dragHandle).toBeTruthy();

      Object.defineProperty(panel!, 'offsetWidth', {
        configurable: true,
        get: () => 200,
      });

      dragHandle?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 7 }));
      dragHandle?.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 20, pointerId: 7 }));
      dragHandle?.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: 90, pointerId: 7 }));

      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeFalsy();
      // The swipe-close must fade the backdrop in sync with the panel, exactly like the close
      // button: it does so by adding `.closing` (which drives `dialog.closing::backdrop`), the
      // same exit class the CSS animation path uses. Without it the veil lingers at full opacity
      // for the whole spring and only disappears when the dialog finally closes.
      expect(fixture.query('dialog')?.classList.contains('closing')).toBe(true);
    });

    it('snaps back instead of closing when the platform cancels a swipe', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });
      driveFrames();

      const panel = fixture.query<HTMLElement>('.panel');
      const dragHandle = fixture.query<HTMLElement>('.drag-handle');

      expect(panel).toBeTruthy();
      expect(dragHandle).toBeTruthy();

      Object.defineProperty(panel!, 'offsetWidth', {
        configurable: true,
        get: () => 200,
      });

      dragHandle?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 8 }));
      dragHandle?.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 120, pointerId: 8 }));
      dragHandle?.dispatchEvent(new PointerEvent('pointercancel', { ...pointer, clientX: 120, pointerId: 8 }));
      await fixture.flush();

      // The cancel springs back to the open rest position, not closed.
      expect(panel?.style.transform).toBe('');
      expect(panel?.style.opacity).toBe('');
      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('closes on a short flick: release velocity projects past the commit line', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });
      // Controlled clock: the gesture layer samples performance.now() for its
      // velocity window, so the pointer timeline is scripted explicitly.
      let clock = 0;
      const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => clock);
      driveFrames();

      const dragHandle = fixture.query<HTMLElement>('.drag-handle');
      const pointer = { bubbles: true, composed: true, isPrimary: true, pointerType: 'mouse' };

      dragHandle?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 9 }));
      clock += 10;
      dragHandle?.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 10, pointerId: 9 }));
      clock += 10;
      // 20px in 10ms = 2000 px/s fling: the drag itself never crosses the
      // 36px commit line, but the projection (20 + 2000 * 0.25) does.
      dragHandle?.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: 20, pointerId: 9 }));

      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeFalsy();
      nowSpy.mockRestore();
    });

    it('settles a dragged panel at a detent instead of fully open or closed', async () => {
      fixture = await mount('ore-drawer', { attrs: { detents: '0.5', open: '', placement: 'bottom' } });
      driveFrames();

      const panel = fixture.query<HTMLElement>('.panel');
      const dragHandle = fixture.query<HTMLElement>('.drag-handle');

      Object.defineProperty(panel!, 'offsetHeight', { configurable: true, get: () => 400 });

      // Drag down to 180px closed: nearest rest is the 0.5 detent at 200px.
      dragHandle?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, clientY: 0, pointerId: 3 }));
      dragHandle?.dispatchEvent(
        new PointerEvent('pointermove', { ...pointer, clientX: 0, clientY: 180, pointerId: 3 }),
      );
      dragHandle?.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: 0, clientY: 180, pointerId: 3 }));

      await fixture.flush();

      expect(panel?.style.transform).toBe('translateY(200px)');
      // A detent is a reading position, so the panel must not be faded there: the fade begins only
      // below the most-closed detent (here 200px of 400px, exactly where the panel rests).
      expect(panel?.style.opacity).toBe('1');
      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('ignores detents on a side placement and warns once', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      fixture = await mount('ore-drawer', { attrs: { detents: '0.5', open: '', placement: 'right' } });
      driveFrames();

      const panel = fixture.query<HTMLElement>('.panel');
      const dragHandle = fixture.query<HTMLElement>('.drag-handle');

      Object.defineProperty(panel!, 'offsetWidth', { configurable: true, get: () => 200 });

      dragHandle?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 4 }));
      dragHandle?.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: 100, pointerId: 4 }));
      dragHandle?.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: 100, pointerId: 4 }));

      await fixture.flush();

      // No detent stop: the two-state commit line (36px) was crossed, so it closed.
      expect(fixture.query('dialog[open]')).toBeFalsy();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('detents are only supported on bottom or top drawers');
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires open-change when the drawer opens', async () => {
      fixture = await mount('ore-drawer');

      const handler = vi.fn();

      fixture.element.addEventListener('open-change', handler);

      await fixture.attr('open', '');

      expect(handler).toHaveBeenCalled();
    });

    it('open-change detail contains open state and reason', async () => {
      fixture = await mount('ore-drawer', { attrs: { placement: 'left' } });

      let detail: unknown;

      fixture.element.addEventListener('open-change', (e) => {
        detail = (e as CustomEvent).detail;
      });

      await fixture.attr('open', '');

      expect(detail).toEqual({ open: true, reason: 'programmatic' });
    });

    it('fires open-change after the drawer closes', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('open-change', handler);

      const closeBtn = fixture.query<HTMLButtonElement>('[aria-label="Close"]');

      closeBtn?.click();

      const panel = fixture.query('.panel');

      panel?.dispatchEvent(new Event('transitionend', { bubbles: true }));
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
      expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ open: false, reason: 'trigger' });
    });

    it('fires close-request when close button is clicked', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('close-request', handler);

      fixture.query<HTMLButtonElement>('[aria-label="Close"]')?.click();

      expect(handler).toHaveBeenCalled();
    });

    it('close-request detail contains reason and placement', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '', placement: 'left' } });

      let detail: unknown;

      fixture.element.addEventListener('close-request', (e) => {
        detail = (e as CustomEvent).detail;
      });

      fixture.query<HTMLButtonElement>('[aria-label="Close"]')?.click();

      expect((detail as { placement: string; reason: string })?.reason).toBe('trigger');
      expect((detail as { placement: string; reason: string })?.placement).toBe('left');
    });

    it('close-request reason is outsideClick for backdrop clicks', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '', placement: 'left' } });

      let detail: unknown;

      fixture.element.addEventListener('close-request', (e) => {
        detail = (e as CustomEvent).detail;
      });

      fixture.query<HTMLDialogElement>('dialog')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.flush();

      expect((detail as { placement: string; reason: string })?.reason).toBe('outsideClick');
      expect((detail as { placement: string; reason: string })?.placement).toBe('left');
    });

    it('close-request reason is escape for cancel events', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '', placement: 'right' } });

      let detail: unknown;

      fixture.element.addEventListener('close-request', (e) => {
        detail = (e as CustomEvent).detail;
      });

      fixture
        .query<HTMLDialogElement>('dialog')
        ?.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
      await fixture.flush();

      expect((detail as { placement: string; reason: string })?.reason).toBe('escape');
      expect((detail as { placement: string; reason: string })?.placement).toBe('right');
    });

    it('Escape (native cancel event) actually closes the drawer, not just fires close-request', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '', placement: 'right' } });

      const dialog = fixture.query<HTMLDialogElement>('dialog');

      dialog?.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
      await fixture.flush();

      const panel = fixture.query('.panel');

      panel?.dispatchEvent(new Event('transitionend', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeFalsy();
    });

    it('does not close on cancel when persistent', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '', persistent: '', placement: 'right' } });

      fixture
        .query<HTMLDialogElement>('dialog')
        ?.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('close reason is programmatic when open is removed externally', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });

      let detail: unknown;

      fixture.element.addEventListener('open-change', (e) => {
        detail = (e as CustomEvent).detail;
      });

      fixture.element.removeAttribute('open');
      await fixture.flush();

      expect(detail).toEqual({ open: false, reason: 'programmatic' });
    });

    it('preventing close-request keeps the drawer open', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });
      fixture.element.addEventListener('close-request', (e) => e.preventDefault());

      fixture.query<HTMLButtonElement>('[aria-label="Close"]')?.click();
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });
  });

  // ─── Methods ─────────────────────────────────────────────────────────────────

  describe('Methods', () => {
    it('show() opens the drawer', async () => {
      fixture = await mount('ore-drawer');

      const el = fixture.element as DrawerElement;

      el.show();
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('hide() closes the drawer', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '' } });

      const el = fixture.element as DrawerElement;

      el.hide();

      const panel = fixture.query('.panel');

      panel?.dispatchEvent(new Event('transitionend', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeFalsy();
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('ore-drawer accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }

    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }

    await import('./drawer');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Native Dialog Semantics', () => {
    it('uses native <dialog> element for built-in modal semantics', async () => {
      fixture = await mount('ore-drawer');

      expect(fixture.query('dialog')).toBeTruthy();
    });

    it('dialog has aria-label when label prop is set', async () => {
      fixture = await mount('ore-drawer', { attrs: { label: 'Settings panel' } });

      const dialog = fixture.query('dialog');

      expect(dialog?.getAttribute('aria-label')).toBe('Settings panel');
    });

    it('dialog has aria-labelledby when label prop is absent', async () => {
      fixture = await mount('ore-drawer');

      const dialog = fixture.query('dialog');

      expect(dialog?.hasAttribute('aria-labelledby')).toBe(true);
    });

    it('dialog aria-labelledby and aria-label are mutually exclusive', async () => {
      fixture = await mount('ore-drawer', { attrs: { label: 'My drawer' } });

      const dialog = fixture.query('dialog');

      expect(dialog?.getAttribute('aria-label')).toBe('My drawer');
      expect(dialog?.getAttribute('aria-labelledby')).toBeNull();
    });
  });

  describe('aria-modal', () => {
    it('dialog has aria-modal="true"', async () => {
      fixture = await mount('ore-drawer');

      expect(fixture.query('dialog')?.getAttribute('aria-modal')).toBe('true');
    });
  });

  describe('Close Button', () => {
    it('close button has aria-label="Close"', async () => {
      fixture = await mount('ore-drawer');

      expect(fixture.query('[aria-label="Close"]')).toBeTruthy();
    });

    it('close button icon has aria-hidden="true"', async () => {
      fixture = await mount('ore-drawer');

      const icon = fixture.query('button[aria-label="Close"] ore-icon');

      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });

    it('close button is visible by default (dismissible defaults to true)', async () => {
      fixture = await mount('ore-drawer');

      const closeBtn = fixture.query<HTMLButtonElement>('[aria-label="Close"]');

      expect(closeBtn?.hidden).toBe(false);
    });
  });

  describe('persistent', () => {
    it('backdrop click does not close when persistent is set', async () => {
      fixture = await mount('ore-drawer', { attrs: { open: '', persistent: '' } });

      const dialog = fixture.query<HTMLDialogElement>('dialog');

      // Simulate backdrop click: target is the dialog element itself
      dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });
  });

  describe('Placement Variants', () => {
    for (const placement of ['left', 'right', 'top', 'bottom'] as const) {
      it(`reflects placement="${placement}" as host attribute`, async () => {
        fixture = await mount('ore-drawer', { attrs: { placement } });

        expect(fixture.element.getAttribute('placement')).toBe(placement);
      });
    }
  });

  describe('Accessibility', () => {
    it('passes axe checks when closed', async () => {
      fixture = await mount('ore-drawer', {
        attrs: { title: 'Navigation' },
        html: '<p>Drawer content</p>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
