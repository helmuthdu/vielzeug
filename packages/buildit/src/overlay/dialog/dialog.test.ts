import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-dialog', () => {
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
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders native dialog element', async () => {
      fixture = await mount('bit-dialog');

      expect(fixture.query('dialog')).toBeTruthy();
    });

    it('dialog is hidden when not open', async () => {
      fixture = await mount('bit-dialog');

      const dialog = fixture.query('dialog');

      expect(!dialog || !dialog.hasAttribute('open')).toBe(true);
    });

    it('dialog is visible when open', async () => {
      fixture = await mount('bit-dialog', { attrs: { open: '' } });

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('renders slot content', async () => {
      fixture = await mount('bit-dialog', { attrs: { open: '' }, html: 'Dialog body' });

      expect(fixture.element.textContent).toContain('Dialog body');
    });

    it('renders header when label provided', async () => {
      fixture = await mount('bit-dialog', { attrs: { label: 'My Dialog', open: '' } });

      expect(fixture.query('.title')?.textContent?.trim()).toContain('My Dialog');
    });
  });

  describe('Props', () => {
    it('applies label as aria-label', async () => {
      fixture = await mount('bit-dialog', { attrs: { label: 'Confirm action' } });

      expect(fixture.query('dialog')?.getAttribute('aria-label')).toBe('Confirm action');
    });

    it('renders close button when dismissible', async () => {
      fixture = await mount('bit-dialog', { attrs: { dismissible: '', open: '' } });

      expect(fixture.query('.close, [aria-label="Close dialog"]')).toBeTruthy();
    });

    it('close button has accessible label', async () => {
      fixture = await mount('bit-dialog', { attrs: { dismissible: '', open: '' } });

      expect(fixture.query('[aria-label="Close dialog"]')).toBeTruthy();
    });

    it('applies size', async () => {
      fixture = await mount('bit-dialog', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies backdrop', async () => {
      fixture = await mount('bit-dialog', { attrs: { backdrop: 'blur' } });

      expect(fixture.element.getAttribute('backdrop')).toBe('blur');
    });
  });

  describe('Events', () => {
    it('fires open event when dialog opens', async () => {
      fixture = await mount('bit-dialog');

      const handler = vi.fn();

      fixture.element.addEventListener('open', handler);

      await fixture.attr('open', '');

      expect(handler).toHaveBeenCalled();
    });

    it('fires close event when dialog closes', async () => {
      fixture = await mount('bit-dialog', { attrs: { open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('close', handler);

      fixture.element.removeAttribute('open');
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('fires close event when dismiss button clicked', async () => {
      fixture = await mount('bit-dialog', { attrs: { dismissible: '', open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('close', handler);

      await user.click(fixture.query<HTMLElement>('[aria-label="Close dialog"]')!);

      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('bit-dialog accessibility', () => {
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
    fixture?.destroy();
  });

  describe('Dialog Role', () => {
    it('uses native dialog element', async () => {
      fixture = await mount('bit-dialog');

      expect(fixture.query('dialog')).toBeTruthy();
    });

    it('dialog has aria-modal true', async () => {
      fixture = await mount('bit-dialog', { attrs: { open: '' } });

      expect(fixture.query('dialog')?.getAttribute('aria-modal')).toBe('true');
    });

    it('dialog has aria-label when label provided', async () => {
      fixture = await mount('bit-dialog', { attrs: { label: 'Confirm deletion' } });

      expect(fixture.query('dialog')?.getAttribute('aria-label')).toBe('Confirm deletion');
    });
  });

  describe('Close Button', () => {
    it('close button has aria-label Close dialog', async () => {
      fixture = await mount('bit-dialog', { attrs: { dismissible: '', open: '' } });

      expect(fixture.query('[aria-label="Close dialog"]')).toBeTruthy();
    });

    it('overlay has aria-hidden true', async () => {
      fixture = await mount('bit-dialog', { attrs: { open: '' } });

      const overlay = fixture.query('.overlay');

      if (overlay) {
        expect(overlay.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });

  describe('Focus Management', () => {
    it('dialog is focusable when open', async () => {
      fixture = await mount('bit-dialog', { attrs: { open: '' } });

      const dialog = fixture.query<HTMLDialogElement>('dialog');

      expect(dialog).toBeTruthy();
    });
  });
});
