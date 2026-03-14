import { type Fixture, fire, mount } from '@vielzeug/craftit/test';

describe('bit-popover', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    if (!HTMLElement.prototype.showPopover) {
      HTMLElement.prototype.showPopover = function () {
        this.setAttribute('popover-open', '');
      };
    }

    if (!HTMLElement.prototype.hidePopover) {
      HTMLElement.prototype.hidePopover = function () {
        this.removeAttribute('popover-open');
      };
    }

    await import('./popover');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a trigger slot', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button><span slot="content">Content</span>',
      });

      expect(fixture.query('slot:not([name])')).toBeTruthy();
    });

    it('renders a panel with role="dialog"', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      expect(fixture.query('[role="dialog"]')).toBeTruthy();
    });

    it('renders a content slot inside the panel', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button><span slot="content">Panel content</span>',
      });

      expect(fixture.query('slot[name="content"]')).toBeTruthy();
    });

    it('panel has popover="manual" attribute', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      expect(fixture.query('[popover="manual"]')).toBeTruthy();
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('reflects label prop as aria-label on panel', async () => {
      fixture = await mount('bit-popover', {
        attrs: { label: 'User options' },
        html: '<button>Open</button>',
      });

      const panel = fixture.query('[role="dialog"]');

      expect(panel?.getAttribute('aria-label')).toBe('User options');
    });

    it('no aria-label on panel when label is absent', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const panel = fixture.query('[role="dialog"]');

      expect(panel?.getAttribute('aria-label')).toBeNull();
    });

    it('falls back to click trigger for invalid trigger values', async () => {
      fixture = await mount('bit-popover', {
        attrs: { trigger: 'unknown' },
        html: '<button>Open</button>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      const panel = fixture.query('[role="dialog"]');

      expect(panel?.getAttribute('aria-hidden')).toBe('false');
    });
  });

  // ─── Open / Close ─────────────────────────────────────────────────────────

  describe('Open / Close', () => {
    it('panel is initially hidden (aria-hidden="true")', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const panel = fixture.query('[role="dialog"]');

      expect(panel?.getAttribute('aria-hidden')).toBe('true');
    });

    it('trigger slot has aria-expanded="false" by default', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });
      await fixture.flush();

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      expect(btn?.getAttribute('aria-expanded')).toBe('false');
    });

    it('clicking trigger opens the popover', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      const panel = fixture.query('[role="dialog"]');

      expect(panel?.getAttribute('aria-hidden')).toBe('false');
    });

    it('trigger slot has aria-expanded="true" when open', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      expect(btn?.getAttribute('aria-expanded')).toBe('true');
    });

    it('clicking trigger again closes the popover', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      if (btn) fire.click(btn);

      await fixture.flush();

      const panel = fixture.query('[role="dialog"]');

      expect(panel?.getAttribute('aria-hidden')).toBe('true');
    });

    it('does not open when disabled', async () => {
      fixture = await mount('bit-popover', {
        attrs: { disabled: '' },
        html: '<button>Open</button>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      const panel = fixture.query('[role="dialog"]');

      expect(panel?.getAttribute('aria-hidden')).toBe('true');
    });

    it('keeps popover open when clicking inside panel content', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button><span slot="content">Panel content</span>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      const panel = fixture.query('[role="dialog"]') as HTMLElement | null;

      if (panel) fire.click(panel);

      await fixture.flush();

      expect(panel?.getAttribute('aria-hidden')).toBe('false');
    });

    it('closes an open popover when disabled at runtime', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      fixture.element.setAttribute('disabled', '');
      await fixture.flush();

      const panel = fixture.query('[role="dialog"]');

      expect(panel?.getAttribute('aria-hidden')).toBe('true');
      expect(btn?.getAttribute('aria-disabled')).toBe('true');
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires open when the popover opens', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const handler = vi.fn();

      fixture.element.addEventListener('open', handler);

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('fires close when the popover closes', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const handler = vi.fn();

      fixture.element.addEventListener('close', handler);

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      if (btn) fire.click(btn);

      await fixture.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('does not fire open when disabled', async () => {
      fixture = await mount('bit-popover', {
        attrs: { disabled: '' },
        html: '<button>Open</button>',
      });

      const handler = vi.fn();

      fixture.element.addEventListener('open', handler);

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('bit-popover accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./popover');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Dialog Role', () => {
    it('panel has role="dialog"', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      expect(fixture.query('[role="dialog"]')).toBeTruthy();
    });

    it('panel aria-hidden is "true" when closed', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      expect(fixture.query('[role="dialog"]')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('panel aria-hidden toggles to "false" when opened', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      expect(fixture.query('[role="dialog"]')?.getAttribute('aria-hidden')).toBe('false');
    });
  });

  describe('Trigger Controls Association', () => {
    it('trigger element receives aria-controls pointing to panel id', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });
      await fixture.flush();

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');
      const panelId = fixture.query('[role="dialog"]')?.id;

      expect(btn?.getAttribute('aria-controls')).toBe(panelId);
    });

    it('trigger element receives aria-haspopup="dialog"', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });
      await fixture.flush();

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      expect(btn?.getAttribute('aria-haspopup')).toBe('dialog');
    });
  });

  describe('Expanded State Announcement', () => {
    it('trigger aria-expanded is "false" when closed', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });
      await fixture.flush();

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      expect(btn?.getAttribute('aria-expanded')).toBe('false');
    });

    it('trigger aria-expanded is "true" when panel is open', async () => {
      fixture = await mount('bit-popover', {
        html: '<button>Open</button>',
      });

      const btn = fixture.element.querySelector<HTMLButtonElement>('button');

      if (btn) fire.click(btn);

      await fixture.flush();

      expect(btn?.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
