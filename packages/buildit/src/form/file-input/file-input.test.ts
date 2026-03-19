import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-file-input', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./file-input'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders drop zone with correct role', async () => {
      fixture = await mount('bit-file-input');

      expect(fixture.query('[role="button"]')).toBeTruthy();
    });

    it('renders label when provided', async () => {
      fixture = await mount('bit-file-input', {
        attrs: { label: 'Upload files' },
      });

      expect(fixture.query('[part="label"]')?.textContent?.trim()).toBe('Upload files');
    });

    it('renders helper text when provided', async () => {
      fixture = await mount('bit-file-input', { attrs: { helper: 'Max 5MB' } });

      expect(fixture.query('[part="helper"]')?.textContent?.trim()).toBe('Max 5MB');
    });

    it('renders error text when provided', async () => {
      fixture = await mount('bit-file-input', {
        attrs: { error: 'File too large' },
      });

      expect(fixture.query('[part="error"]')?.textContent?.trim()).toBe('File too large');
    });

    it('renders file list container', async () => {
      fixture = await mount('bit-file-input');

      expect(fixture.query('[role="list"]')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('applies disabled state', async () => {
      fixture = await mount('bit-file-input', { attrs: { disabled: '' } });

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.getAttribute('tabindex')).toBe('-1');
    });

    it('applies accept attribute to hidden input', async () => {
      fixture = await mount('bit-file-input', {
        attrs: { accept: '.pdf,.docx' },
      });

      expect(fixture.query('input[type="file"]')?.getAttribute('accept')).toBe('.pdf,.docx');
    });

    it('applies multiple attribute', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });

      expect(fixture.query('input[type="file"]')?.hasAttribute('multiple')).toBe(true);
    });

    it('applies required attribute to input', async () => {
      fixture = await mount('bit-file-input', { attrs: { required: '' } });

      expect(fixture.query('input[type="file"]')?.hasAttribute('required')).toBe(true);
    });

    it('applies color variant', async () => {
      fixture = await mount('bit-file-input', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size variant', async () => {
      fixture = await mount('bit-file-input', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies fullwidth', async () => {
      fixture = await mount('bit-file-input', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });
  });

  describe('File List', () => {
    it('shows no files initially', async () => {
      fixture = await mount('bit-file-input');

      expect(fixture.query('[role="listitem"]')).toBeFalsy();
    });

    it('error message is hidden when no error', async () => {
      fixture = await mount('bit-file-input');

      const error = fixture.query('[part="error"]');

      expect(!error || error.textContent?.trim() === '').toBe(true);
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'secondary', 'success', 'warning', 'error']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-file-input', { attrs: { color } });

        const el = fixture.element;

        expect(el.getAttribute('color')).toBe(color);
      });
    }
  });

  describe('Sizes', () => {
    for (const size of ['sm', 'md', 'lg']) {
      it(`applies ${size} size`, async () => {
        fixture = await mount('bit-file-input', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    }
  });

  describe('Variants', () => {
    for (const variant of ['solid', 'outline', 'ghost']) {
      it(`applies ${variant} variant`, async () => {
        fixture = await mount('bit-file-input', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    }
  });

  describe('Events', () => {
    it('dispatches change event when file selected', async () => {
      fixture = await mount('bit-file-input');

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      Object.defineProperty(input, 'files', {
        configurable: true,
        value: { 0: file, item: () => file, length: 1 },
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      await new Promise((r) => setTimeout(r, 10));
      expect(handler).toHaveBeenCalled();

      const detail = (handler.mock.calls[0][0] as CustomEvent).detail;

      expect(Array.isArray(detail.files)).toBe(true);
      expect(detail.value).toEqual(detail.files);
      expect(detail.originalEvent).toBeDefined();
    });
  });
});

describe('bit-file-input accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./file-input'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Semantic Structure', () => {
    it('drop zone has role button', async () => {
      fixture = await mount('bit-file-input');

      expect(fixture.query('[role="button"]')).toBeTruthy();
    });

    it('drop zone has aria-label', async () => {
      fixture = await mount('bit-file-input');

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.getAttribute('aria-label')).toBeTruthy();
    });

    it('file list has role list', async () => {
      fixture = await mount('bit-file-input');

      expect(fixture.query('[role="list"]')).toBeTruthy();
    });

    it('error region has role alert', async () => {
      fixture = await mount('bit-file-input', {
        attrs: { error: 'Invalid file' },
      });

      expect(fixture.query('[role="alert"]')).toBeTruthy();
    });
  });

  describe('Labeling', () => {
    it('drop zone references label via aria-labelledby', async () => {
      fixture = await mount('bit-file-input', { attrs: { label: 'Upload' } });

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.hasAttribute('aria-labelledby')).toBe(true);
    });

    it('drop zone references helper via aria-describedby', async () => {
      fixture = await mount('bit-file-input', { attrs: { helper: 'Max 5MB' } });

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.hasAttribute('aria-describedby')).toBe(true);
    });
  });

  describe('Focus Management', () => {
    it('drop zone is focusable by default', async () => {
      fixture = await mount('bit-file-input');

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.getAttribute('tabindex')).toBe('0');
    });

    it('drop zone is not focusable when disabled', async () => {
      fixture = await mount('bit-file-input', { attrs: { disabled: '' } });

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.getAttribute('tabindex')).toBe('-1');
    });

    it('native input is not focusable (hidden)', async () => {
      fixture = await mount('bit-file-input');

      const input = fixture.query<HTMLInputElement>('input[type="file"]');

      expect(input?.getAttribute('tabindex')).toBe('-1');
    });
  });
});
