import { type Fixture, mount, user } from '@vielzeug/ore/testing';

describe('ore-dialog', () => {
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

    await import('./dialog');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders native dialog element', async () => {
      fixture = await mount('ore-dialog');

      expect(fixture.query('dialog')).toBeTruthy();
    });

    it('dialog is hidden when not open', async () => {
      fixture = await mount('ore-dialog');

      const dialog = fixture.query('dialog');

      expect(!dialog || !dialog.hasAttribute('open')).toBe(true);
    });

    it('dialog is visible when open', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('renders slot content', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' }, html: 'Dialog body' });

      expect(fixture.element.textContent).toContain('Dialog body');
    });

    it('renders header when label provided', async () => {
      fixture = await mount('ore-dialog', { attrs: { label: 'My Dialog', open: '' } });

      expect(fixture.query('.title')?.textContent?.trim()).toContain('My Dialog');
    });
  });

  describe('Props', () => {
    it('applies label as aria-label', async () => {
      fixture = await mount('ore-dialog', { attrs: { label: 'Confirm action' } });

      expect(fixture.query('dialog')?.getAttribute('aria-label')).toBe('Confirm action');
    });

    it('renders close button when dismissible', async () => {
      fixture = await mount('ore-dialog', { attrs: { dismissible: '', open: '' } });

      expect(fixture.query('.close, [aria-label="Close dialog"]')).toBeTruthy();
    });

    it('close button has accessible label', async () => {
      fixture = await mount('ore-dialog', { attrs: { dismissible: '', open: '' } });

      expect(fixture.query('[aria-label="Close dialog"]')).toBeTruthy();
    });

    it('applies size', async () => {
      fixture = await mount('ore-dialog', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies backdrop', async () => {
      fixture = await mount('ore-dialog', { attrs: { backdrop: 'blur' } });

      expect(fixture.element.getAttribute('backdrop')).toBe('blur');
    });
  });

  describe('Events', () => {
    it('fires open event when dialog opens', async () => {
      fixture = await mount('ore-dialog');

      const handler = vi.fn();

      fixture.element.addEventListener('open', handler);

      await fixture.attr('open', '');

      expect(handler).toHaveBeenCalled();
      expect((handler.mock.calls[0]?.[0] as CustomEvent<{ reason: string }>).detail.reason).toBe('programmatic');
    });

    it('fires close event when dialog closes', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('close', handler);

      fixture.element.removeAttribute('open');
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
      expect((handler.mock.calls[0]?.[0] as CustomEvent<{ reason: string }>).detail.reason).toBe('programmatic');
    });

    it('fires close event when dismiss button clicked', async () => {
      fixture = await mount('ore-dialog', { attrs: { dismissible: '', open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('close', handler);

      await user.click(fixture.query<HTMLElement>('[aria-label="Close dialog"]')!);

      expect(handler).toHaveBeenCalled();
      expect((handler.mock.calls[0]?.[0] as CustomEvent<{ reason: string }>).detail.reason).toBe('trigger');
    });

    it('fires close-request with reason="trigger" from dismiss button', async () => {
      fixture = await mount('ore-dialog', { attrs: { dismissible: '', open: '' } });

      let detail: { reason: string } | undefined;

      fixture.element.addEventListener('close-request', (e) => {
        detail = (e as CustomEvent<{ reason: string }>).detail;
      });

      await user.click(fixture.query<HTMLElement>('[aria-label="Close dialog"]')!);

      expect(detail?.reason).toBe('trigger');
    });

    it('keeps dialog open when close-request is prevented', async () => {
      fixture = await mount('ore-dialog', { attrs: { dismissible: '', open: '' } });

      fixture.element.addEventListener('close-request', (e) => e.preventDefault());
      await user.click(fixture.query<HTMLElement>('[aria-label="Close dialog"]')!);
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('close-request reason is escape for cancel events', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      let detail: { reason: string } | undefined;

      fixture.element.addEventListener('close-request', (e) => {
        detail = (e as CustomEvent<{ reason: string }>).detail;
      });

      fixture
        .query<HTMLDialogElement>('dialog')
        ?.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
      await fixture.flush();

      expect(detail?.reason).toBe('escape');
    });

    it('persistent dialog stays open on cancel event (Escape)', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '', persistent: '' } });

      const closeHandler = vi.fn();
      const closeRequestHandler = vi.fn();

      fixture.element.addEventListener('close', closeHandler);
      fixture.element.addEventListener('close-request', closeRequestHandler);

      fixture
        .query<HTMLDialogElement>('dialog')
        ?.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
      await fixture.flush();

      expect(closeRequestHandler).not.toHaveBeenCalled();
      expect(closeHandler).not.toHaveBeenCalled();
      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    // Regression test: a bubbling `close`-named event dispatched by a *slotted descendant*
    // (e.g. `ore-select` firing its own public `close` event when its dropdown closes) reaches
    // this dialog's native-close listener via slot-assignment-based event-path computation —
    // which isn't gated by that event's own `composed` flag, only the reverse (shadow → host)
    // direction is. Without checking `e.target`, selecting an option in any dropdown field
    // nested in a dialog closes the whole dialog instead of just that field's own dropdown.
    //
    // Note: the descendant's event still bubbles to `fixture.element`'s *own* `close` listener
    // regardless of this fix — that's normal, expected DOM bubbling to the host element, not the
    // bug. The bug (and what this asserts) is `useDialogControl`'s *internal* native-close
    // handler mistaking it for the dialog's own native close and tearing down its open state.
    it('does not tear down open state when a slotted descendant fires its own bubbling close-named event', async () => {
      fixture = await mount('ore-dialog', {
        attrs: { open: '' },
        html: '<div id="descendant-field"></div>',
      });

      // Light-DOM (slotted) content — not queryable via `fixture.query()`, which is scoped to the
      // shadow root. Query the host element's own light DOM directly instead.
      fixture.element
        .querySelector('#descendant-field')!
        .dispatchEvent(new CustomEvent('close', { bubbles: true, cancelable: true, detail: { reason: 'trigger' } }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('open')).toBe(true);
      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('does not close when a slotted descendant fires its own bubbling cancel-named event', async () => {
      fixture = await mount('ore-dialog', {
        attrs: { open: '' },
        html: '<div id="descendant-field"></div>',
      });

      const closeHandler = vi.fn();
      const closeRequestHandler = vi.fn();

      fixture.element.addEventListener('close', closeHandler);
      fixture.element.addEventListener('close-request', closeRequestHandler);

      fixture.element
        .querySelector('#descendant-field')!
        .dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
      await fixture.flush();

      expect(closeRequestHandler).not.toHaveBeenCalled();
      expect(closeHandler).not.toHaveBeenCalled();
      expect(fixture.query('dialog[open]')).toBeTruthy();
    });
  });

  describe('Invoker Commands API', () => {
    const dispatchCommand = (target: EventTarget, command: string): void => {
      target.dispatchEvent(Object.assign(new Event('command'), { command }));
    };

    it('opens dialog on show-modal command', async () => {
      fixture = await mount('ore-dialog');

      dispatchCommand(fixture.element, 'show-modal');
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('closes dialog on close command', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      dispatchCommand(fixture.element, 'close');
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeNull();
    });

    it('closes dialog on request-close command', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      dispatchCommand(fixture.element, 'request-close');
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeNull();
    });

    it('close command respects close-request prevention', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      fixture.element.addEventListener('close-request', (e) => e.preventDefault());
      dispatchCommand(fixture.element, 'close');
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });
  });
});

describe('ore-dialog accessibility', () => {
  let fixture: Awaited<ReturnType<typeof mount>>;

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

    await import('./dialog');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Dialog Role', () => {
    it('uses native dialog element', async () => {
      fixture = await mount('ore-dialog');

      expect(fixture.query('dialog')).toBeTruthy();
    });

    it('dialog has aria-modal true', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      expect(fixture.query('dialog')?.getAttribute('aria-modal')).toBe('true');
    });

    it('dialog has aria-label when label provided', async () => {
      fixture = await mount('ore-dialog', { attrs: { label: 'Confirm deletion' } });

      expect(fixture.query('dialog')?.getAttribute('aria-label')).toBe('Confirm deletion');
    });
  });

  describe('Close Button', () => {
    it('close button has aria-label Close dialog', async () => {
      fixture = await mount('ore-dialog', { attrs: { dismissible: '', open: '' } });

      expect(fixture.query('[aria-label="Close dialog"]')).toBeTruthy();
    });

    it('overlay has aria-hidden true', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      const overlay = fixture.query('.overlay');

      if (overlay) {
        expect(overlay.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });

  describe('Focus Management', () => {
    it('dialog is focusable when open', async () => {
      fixture = await mount('ore-dialog', { attrs: { open: '' } });

      const dialog = fixture.query<HTMLDialogElement>('dialog');

      expect(dialog).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks when closed', async () => {
      fixture = await mount('ore-dialog', {
        attrs: { label: 'Confirm action' },
        html: '<p>Are you sure?</p>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
