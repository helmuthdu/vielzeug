import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-drawer', () => {
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
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a native dialog element', async () => {
      fixture = await mount('bit-drawer');

      expect(fixture.query('dialog')).toBeTruthy();
    });

    it('renders the panel div inside the dialog', async () => {
      fixture = await mount('bit-drawer');

      expect(fixture.query('.panel')).toBeTruthy();
    });

    it('renders a close button', async () => {
      fixture = await mount('bit-drawer');

      expect(fixture.query('[aria-label="Close"]')).toBeTruthy();
    });

    it('renders default slots', async () => {
      fixture = await mount('bit-drawer', {
        html: '<p>Body content</p>',
      });

      expect(fixture.element.textContent).toContain('Body content');
    });

    it('renders header slot content', async () => {
      fixture = await mount('bit-drawer', {
        html: '<span slot="header">Title</span>',
      });

      expect(fixture.element.textContent).toContain('Title');
    });

    it('renders title prop as header fallback text', async () => {
      fixture = await mount('bit-drawer', { attrs: { title: 'Settings' } });

      expect(fixture.query('.header-title')?.textContent?.trim()).toContain('Settings');
    });

    it('renders footer slot content', async () => {
      fixture = await mount('bit-drawer', {
        html: '<button slot="footer">Save</button>',
      });

      expect(fixture.element.textContent).toContain('Save');
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('dialog is hidden when open is false', async () => {
      fixture = await mount('bit-drawer');

      const dialog = fixture.query('dialog');

      expect(dialog?.hasAttribute('open')).toBe(false);
    });

    it('dialog is open when open prop is set', async () => {
      fixture = await mount('bit-drawer', { attrs: { open: '' } });

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('reflects placement attribute on host', async () => {
      fixture = await mount('bit-drawer', { attrs: { placement: 'left' } });

      expect(fixture.element.getAttribute('placement')).toBe('left');
    });

    it('reflects size attribute on host', async () => {
      fixture = await mount('bit-drawer', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('reflects backdrop attribute on host', async () => {
      fixture = await mount('bit-drawer', { attrs: { backdrop: 'transparent' } });

      expect(fixture.element.getAttribute('backdrop')).toBe('transparent');
    });
  });

  // ─── Open / Close ─────────────────────────────────────────────────────────

  describe('Open / Close', () => {
    it('opens when open attribute is added', async () => {
      fixture = await mount('bit-drawer');

      await fixture.attr('open', '');

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('closes when open attribute is removed', async () => {
      fixture = await mount('bit-drawer', { attrs: { open: '' } });

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
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires open when the drawer opens', async () => {
      fixture = await mount('bit-drawer');

      const handler = vi.fn();

      fixture.element.addEventListener('open', handler);

      await fixture.attr('open', '');

      expect(handler).toHaveBeenCalled();
    });

    it('open event detail contains placement', async () => {
      fixture = await mount('bit-drawer', { attrs: { placement: 'left' } });

      let detail: unknown;

      fixture.element.addEventListener('open', (e) => {
        detail = (e as CustomEvent).detail;
      });

      await fixture.attr('open', '');

      expect((detail as { placement: string })?.placement).toBe('left');
    });

    it('fires close after the drawer closes', async () => {
      fixture = await mount('bit-drawer', { attrs: { open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('close', handler);

      const closeBtn = fixture.query<HTMLButtonElement>('[aria-label="Close"]');

      closeBtn?.click();

      const panel = fixture.query('.panel');

      panel?.dispatchEvent(new Event('transitionend', { bubbles: true }));
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('fires close-request when close button is clicked', async () => {
      fixture = await mount('bit-drawer', { attrs: { open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('close-request', handler);

      fixture.query<HTMLButtonElement>('[aria-label="Close"]')?.click();

      expect(handler).toHaveBeenCalled();
    });

    it('close-request detail contains trigger and placement', async () => {
      fixture = await mount('bit-drawer', { attrs: { open: '', placement: 'left' } });

      let detail: unknown;

      fixture.element.addEventListener('close-request', (e) => {
        detail = (e as CustomEvent).detail;
      });

      fixture.query<HTMLButtonElement>('[aria-label="Close"]')?.click();

      expect((detail as { placement: string; trigger: string })?.trigger).toBe('button');
      expect((detail as { placement: string; trigger: string })?.placement).toBe('left');
    });

    it('preventing close-request keeps the drawer open', async () => {
      fixture = await mount('bit-drawer', { attrs: { open: '' } });
      fixture.element.addEventListener('close-request', (e) => e.preventDefault());

      fixture.query<HTMLButtonElement>('[aria-label="Close"]')?.click();
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });
  });

  // ─── Methods ─────────────────────────────────────────────────────────────────

  describe('Methods', () => {
    it('show() opens the drawer', async () => {
      fixture = await mount('bit-drawer');

      const el = fixture.element as typeof fixture.element & { show(): void };

      el.show();
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('hide() closes the drawer', async () => {
      fixture = await mount('bit-drawer', { attrs: { open: '' } });

      const el = fixture.element as typeof fixture.element & { hide(): void };

      el.hide();

      const panel = fixture.query('.panel');

      panel?.dispatchEvent(new Event('transitionend', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeFalsy();
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('bit-drawer accessibility', () => {
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
    fixture?.destroy();
  });

  describe('Native Dialog Semantics', () => {
    it('uses native <dialog> element for built-in modal semantics', async () => {
      fixture = await mount('bit-drawer');

      expect(fixture.query('dialog')).toBeTruthy();
    });

    it('dialog has aria-label when label prop is set', async () => {
      fixture = await mount('bit-drawer', { attrs: { label: 'Settings panel' } });

      const dialog = fixture.query('dialog');

      expect(dialog?.getAttribute('aria-label')).toBe('Settings panel');
    });

    it('dialog has aria-labelledby when label prop is absent', async () => {
      fixture = await mount('bit-drawer');

      const dialog = fixture.query('dialog');

      expect(dialog?.hasAttribute('aria-labelledby')).toBe(true);
    });

    it('dialog aria-labelledby and aria-label are mutually exclusive', async () => {
      fixture = await mount('bit-drawer', { attrs: { label: 'My drawer' } });

      const dialog = fixture.query('dialog');

      expect(dialog?.getAttribute('aria-label')).toBe('My drawer');
      expect(dialog?.getAttribute('aria-labelledby')).toBeNull();
    });
  });

  describe('aria-modal', () => {
    it('dialog has aria-modal="true"', async () => {
      fixture = await mount('bit-drawer');

      expect(fixture.query('dialog')?.getAttribute('aria-modal')).toBe('true');
    });
  });

  describe('Close Button', () => {
    it('close button has aria-label="Close"', async () => {
      fixture = await mount('bit-drawer');

      expect(fixture.query('[aria-label="Close"]')).toBeTruthy();
    });

    it('close button icon has aria-hidden="true"', async () => {
      fixture = await mount('bit-drawer');

      const icon = fixture.query('[aria-label="Close"] svg');

      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });

    it('close button is visible by default (dismissable defaults to true)', async () => {
      fixture = await mount('bit-drawer');

      const closeBtn = fixture.query<HTMLButtonElement>('[aria-label="Close"]');

      expect(closeBtn?.hidden).toBe(false);
    });
  });

  describe('persistent', () => {
    it('backdrop click does not close when persistent is set', async () => {
      fixture = await mount('bit-drawer', { attrs: { open: '', persistent: '' } });

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
        fixture = await mount('bit-drawer', { attrs: { placement } });

        expect(fixture.element.getAttribute('placement')).toBe(placement);
      });
    }
  });
});
