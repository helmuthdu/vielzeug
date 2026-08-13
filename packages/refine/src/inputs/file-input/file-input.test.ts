import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-file-input', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./file-input'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders drop zone with correct role', async () => {
      fixture = await mount('ore-file-input');

      expect(fixture.query('[role="button"]')).toBeTruthy();
    });

    it('renders label when provided', async () => {
      fixture = await mount('ore-file-input', {
        attrs: { label: 'Upload files' },
      });

      expect(fixture.query('[part="label"]')?.textContent?.trim()).toBe('Upload files');
    });

    it('renders helper text when provided', async () => {
      fixture = await mount('ore-file-input', { attrs: { helper: 'Max 5MB' } });

      expect(fixture.query('[part="helper"]')?.textContent?.trim()).toBe('Max 5MB');
    });

    it('renders error text when provided', async () => {
      fixture = await mount('ore-file-input', {
        attrs: { error: 'File too large' },
      });

      expect(fixture.query('[part="error"]')?.textContent?.trim()).toBe('File too large');
    });

    it('swaps the dropzone icon to an alert icon when error is set', async () => {
      fixture = await mount('ore-file-input', { attrs: { error: 'File too large' } });

      const icon = fixture.query('.dropzone-icon');

      expect(icon?.getAttribute('data-status')).toBe('error');
      expect(icon?.querySelector('ore-icon[name="alert-circle"]')).toBeTruthy();
    });

    it('shows the default upload icon when there is no error', async () => {
      fixture = await mount('ore-file-input');

      const icon = fixture.query('.dropzone-icon');

      expect(icon?.getAttribute('data-status')).toBeNull();
      expect(icon?.querySelector('ore-icon[name="upload"]')).toBeTruthy();
    });

    it('renders file list container', async () => {
      fixture = await mount('ore-file-input');

      expect(fixture.query('[role="list"]')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('applies disabled state', async () => {
      fixture = await mount('ore-file-input', { attrs: { disabled: '' } });

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.getAttribute('tabindex')).toBe('-1');
    });

    it('applies accept attribute to hidden input', async () => {
      fixture = await mount('ore-file-input', {
        attrs: { accept: '.pdf,.docx' },
      });

      expect(fixture.query('input[type="file"]')?.getAttribute('accept')).toBe('.pdf,.docx');
    });

    it('applies multiple attribute', async () => {
      fixture = await mount('ore-file-input', { attrs: { multiple: '' } });

      expect(fixture.query('input[type="file"]')?.hasAttribute('multiple')).toBe(true);
    });

    it('applies required attribute to input', async () => {
      fixture = await mount('ore-file-input', { attrs: { required: '' } });

      expect(fixture.query('input[type="file"]')?.hasAttribute('required')).toBe(true);
    });

    it('applies color variant', async () => {
      fixture = await mount('ore-file-input', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size variant', async () => {
      fixture = await mount('ore-file-input', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies fullwidth', async () => {
      fixture = await mount('ore-file-input', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });
  });

  describe('File List', () => {
    it('shows no files initially', async () => {
      fixture = await mount('ore-file-input');

      expect(fixture.query('[role="listitem"]')).toBeFalsy();
    });

    it('error message is hidden when no error', async () => {
      fixture = await mount('ore-file-input');

      const error = fixture.query('[part="error"]');

      expect(!error || error.textContent?.trim() === '').toBe(true);
    });
  });

  describe('Gallery', () => {
    function selectFiles(input: HTMLInputElement, files: File[]): void {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: { ...files, item: (i: number) => files[i] ?? null, length: files.length },
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    it('renders the default single-column list when `gallery` is not set', async () => {
      fixture = await mount('ore-file-input', { attrs: { multiple: '' } });

      selectFiles(fixture.query<HTMLInputElement>('input[type="file"]')!, [
        new File(['x'], 'photo.png', { type: 'image/png' }),
      ]);
      await fixture.flush();

      expect(fixture.query('.file-list')).toBeTruthy();
      expect(fixture.query('.file-item')).toBeTruthy();
      expect(fixture.query('.file-grid')).toBeFalsy();
    });

    it('renders a preview grid when `gallery` is set', async () => {
      fixture = await mount('ore-file-input', { attrs: { gallery: '', multiple: '' } });

      selectFiles(fixture.query<HTMLInputElement>('input[type="file"]')!, [
        new File(['x'], 'photo.png', { type: 'image/png' }),
      ]);
      await fixture.flush();

      expect(fixture.query('.file-grid')).toBeTruthy();
      expect(fixture.query('.file-card')).toBeTruthy();
      expect(fixture.query('.file-list')).toBeFalsy();
      expect(fixture.query('[part="gallery"]')).toBeTruthy();
    });

    it('renders an <img> thumbnail with a real src for image files', async () => {
      // Regression: object URLs use the `blob:` scheme, which ore's attribute-level XSS
      // guard blocks unconditionally on `src` when set via a template attribute binding.
      // The component must set `.src` as a DOM property (via `ref`) instead.
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

      fixture = await mount('ore-file-input', { attrs: { gallery: '', multiple: '' } });

      selectFiles(fixture.query<HTMLInputElement>('input[type="file"]')!, [
        new File(['x'], 'photo.png', { type: 'image/png' }),
      ]);
      await fixture.flush();

      const img = fixture.query<HTMLImageElement>('.file-thumb');

      expect(img?.tagName).toBe('IMG');
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(img?.src).toBe('blob:mock-url');
      createObjectURLSpy.mockRestore();
      // Decorative — the name is already shown in the visible `.file-card-name` caption.
      expect(img?.getAttribute('alt')).toBe('');
    });

    it('renders a generic icon (no <img>) for non-image files', async () => {
      fixture = await mount('ore-file-input', { attrs: { gallery: '', multiple: '' } });

      selectFiles(fixture.query<HTMLInputElement>('input[type="file"]')!, [
        new File(['x'], 'resume.pdf', { type: 'application/pdf' }),
      ]);
      await fixture.flush();

      expect(fixture.query('.file-card img')).toBeFalsy();
      expect(fixture.query('.file-thumb-generic')).toBeTruthy();
    });

    it('removes a card and revokes its object URL when the remove button is clicked', async () => {
      fixture = await mount('ore-file-input', { attrs: { gallery: '', multiple: '' } });

      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

      selectFiles(fixture.query<HTMLInputElement>('input[type="file"]')!, [
        new File(['x'], 'photo.png', { type: 'image/png' }),
      ]);
      await fixture.flush();
      expect(fixture.query('.file-card')).toBeTruthy();

      fireClick(fixture.query<HTMLElement>('.file-card-remove')!);

      expect(fixture.query('.file-card')).toBeFalsy();
      expect(revokeSpy).toHaveBeenCalled();
      revokeSpy.mockRestore();
    });

    it('revokes any outstanding object URLs on disconnect', async () => {
      fixture = await mount('ore-file-input', { attrs: { gallery: '', multiple: '' } });

      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

      selectFiles(fixture.query<HTMLInputElement>('input[type="file"]')!, [
        new File(['x'], 'photo.png', { type: 'image/png' }),
      ]);
      await fixture.flush();

      fixture.dispose();

      expect(revokeSpy).toHaveBeenCalled();
      revokeSpy.mockRestore();
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'secondary', 'success', 'warning', 'error']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('ore-file-input', { attrs: { color } });

        const el = fixture.element;

        expect(el.getAttribute('color')).toBe(color);
      });
    }
  });

  describe('Sizes', () => {
    for (const size of ['sm', 'md', 'lg']) {
      it(`applies ${size} size`, async () => {
        fixture = await mount('ore-file-input', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    }
  });

  describe('Variants', () => {
    for (const variant of ['solid', 'outline', 'ghost']) {
      it(`applies ${variant} variant`, async () => {
        fixture = await mount('ore-file-input', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    }
  });

  describe('Events', () => {
    it('dispatches change event when file selected', async () => {
      fixture = await mount('ore-file-input');

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

    it('opens the hidden input on Enter from the dropzone', async () => {
      fixture = await mount('ore-file-input');

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;
      const dropzone = fixture.query<HTMLElement>('[role="button"]')!;
      const clickSpy = vi.spyOn(input, 'click');

      dropzone.focus();
      fireKeyDown(dropzone, { key: 'Enter' });

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ore-file-input accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./file-input'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Semantic Structure', () => {
    it('drop zone has role button', async () => {
      fixture = await mount('ore-file-input');

      expect(fixture.query('[role="button"]')).toBeTruthy();
    });

    it('drop zone has aria-label', async () => {
      fixture = await mount('ore-file-input');

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.getAttribute('aria-label')).toBeTruthy();
    });

    it('file list has role list', async () => {
      fixture = await mount('ore-file-input');

      expect(fixture.query('[role="list"]')).toBeTruthy();
    });

    it('error region has role alert', async () => {
      fixture = await mount('ore-file-input', {
        attrs: { error: 'Invalid file' },
      });

      expect(fixture.query('[role="alert"]')).toBeTruthy();
    });
  });

  describe('Labeling', () => {
    it('drop zone references label via aria-labelledby', async () => {
      fixture = await mount('ore-file-input', { attrs: { label: 'Upload' } });

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.hasAttribute('aria-labelledby')).toBe(true);
    });

    it('drop zone references helper via aria-describedby', async () => {
      fixture = await mount('ore-file-input', { attrs: { helper: 'Max 5MB' } });

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.hasAttribute('aria-describedby')).toBe(true);
    });
  });

  describe('Focus Management', () => {
    it('drop zone is focusable by default', async () => {
      fixture = await mount('ore-file-input');

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.getAttribute('tabindex')).toBe('0');
    });

    it('drop zone is not focusable when disabled', async () => {
      fixture = await mount('ore-file-input', { attrs: { disabled: '' } });

      const dropzone = fixture.query('[role="button"]');

      expect(dropzone?.getAttribute('tabindex')).toBe('-1');
    });

    it('native input is not focusable (hidden)', async () => {
      fixture = await mount('ore-file-input');

      const input = fixture.query<HTMLInputElement>('input[type="file"]');

      expect(input?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-file-input', { attrs: { label: 'Upload file' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks with a populated gallery (image + non-image files)', async () => {
      fixture = await mount('ore-file-input', { attrs: { gallery: '', label: 'Upload file', multiple: '' } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;
      const files = [
        new File(['x'], 'photo.png', { type: 'image/png' }),
        new File(['x'], 'resume.pdf', { type: 'application/pdf' }),
      ];

      Object.defineProperty(input, 'files', {
        configurable: true,
        value: { ...files, item: (i: number) => files[i] ?? null, length: files.length },
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });

  function dispatchFiles(input: HTMLInputElement, files: File[]): void {
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: { ...files, item: (i: number) => files[i] ?? null, length: files.length },
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function makeDragEvent(type: string, files: File[] = []): DragEvent {
    const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;

    Object.defineProperty(event, 'dataTransfer', {
      configurable: true,
      value: { files, items: files.map(() => ({ kind: 'file' })), setData: vi.fn(), setDragImage: vi.fn() },
    });

    return event;
  }

  describe('Drag feedback (Signal 01)', () => {
    it('shows an active drag-over state and shifts the copy on dragenter', async () => {
      fixture = await mount('ore-file-input');

      const dropzone = fixture.query('[role="button"]')!;

      dropzone.dispatchEvent(makeDragEvent('dragenter'));
      await fixture.flush();

      expect(fixture.element.hasAttribute('drag-over')).toBe(true);
      expect(dropzone.textContent).toContain('Release to upload');
      expect(dropzone.textContent).not.toContain('click to browse');
    });

    it('reverts the drag-over state and copy on dragleave', async () => {
      fixture = await mount('ore-file-input');

      const dropzone = fixture.query('[role="button"]')!;

      dropzone.dispatchEvent(makeDragEvent('dragenter'));
      await fixture.flush();
      dropzone.dispatchEvent(makeDragEvent('dragleave'));
      await fixture.flush();

      expect(fixture.element.hasAttribute('drag-over')).toBe(false);
      expect(dropzone.textContent).toContain('click to browse');
    });
  });

  describe('Upload lifecycle', () => {
    it('starts uploading immediately once a file is added, when `upload` is set', async () => {
      const upload = vi.fn(() => new Promise<void>(() => {}));

      fixture = await mount('ore-file-input', { props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['x'], 'video.mp4', { type: 'video/mp4' });

      dispatchFiles(input, [file]);
      await fixture.flush();

      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith(file, expect.objectContaining({ resumeFrom: 0 }));
      expect(fixture.query('.file-item')?.getAttribute('data-status')).toBe('uploading');
    });

    it('reports honest percent/speed/eta from onProgress instead of a generic spinner (Signal 02)', async () => {
      let onProgress!: (loaded: number, total: number) => void;
      const upload = vi.fn(
        (_file: File, ctx: { onProgress: (loaded: number, total: number) => void }) =>
          new Promise<void>(() => {
            onProgress = ctx.onProgress;
          }),
      );

      fixture = await mount('ore-file-input', { props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;

      dispatchFiles(input, [new File(['x'], 'video.mp4', { type: 'video/mp4' })]);
      await fixture.flush();

      await fixture.act(() => onProgress(50, 100));

      const progress = fixture.query('ore-progress');

      expect(progress).toBeTruthy();
      expect(progress?.getAttribute('value')).toBe('50');
      expect(fixture.query('.file-progress-meta')).toBeTruthy();
    });

    it('keeps the file and lets the user retry from the failure point instead of restarting (Signal 03)', async () => {
      let attempt = 0;
      let lastResumeFrom = -1;
      const upload = vi.fn(
        (_file: File, ctx: { onProgress: (loaded: number, total: number) => void; resumeFrom: number }) => {
          attempt += 1;
          lastResumeFrom = ctx.resumeFrom;

          if (attempt === 1) {
            ctx.onProgress(60, 100);

            return Promise.reject(new Error('connection dropped'));
          }

          return Promise.resolve();
        },
      );

      fixture = await mount('ore-file-input', { props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;

      dispatchFiles(input, [new File(['x'], 'doc.pdf', { type: 'application/pdf' })]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());

      expect(fixture.query('.file-item')?.getAttribute('data-status')).toBe('error');
      expect(fixture.query('.file-error-text')?.textContent).toContain('connection dropped');
      // File persistence: still listed, not dropped back to an empty picker.
      expect(fixture.query('.file-name')?.textContent).toContain('doc.pdf');

      fixture.query<HTMLButtonElement>('[aria-label="Retry uploading doc.pdf"]')?.click();
      await fixture.flush();
      await fixture.act(() => Promise.resolve());

      expect(attempt).toBe(2);
      expect(lastResumeFrom).toBe(60);
      expect(fixture.query('.file-item')?.getAttribute('data-status')).toBe('success');
    });

    it('shows a success card with a checkmark and file metadata, with a working Replace action (Signal 04)', async () => {
      const upload = vi.fn(() => Promise.resolve());

      // Replace is only offered in `multiple` mode — in single-file mode the dropzone itself
      // already re-picks-and-replaces the one file, so a second "Replace" affordance would be
      // redundant (see the analysis this refactor implements).
      fixture = await mount('ore-file-input', { attrs: { multiple: '' }, props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;
      const original = new File(['x'.repeat(2048)], 'contract.pdf', { type: 'application/pdf' });

      dispatchFiles(input, [original]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());

      const item = fixture.query('.file-item')!;

      expect(item.getAttribute('data-status')).toBe('success');
      expect(item.querySelector('.file-icon ore-icon')?.getAttribute('name')).toBe('check');
      expect(fixture.query('.file-size')?.textContent).toContain('KB');

      const clickSpy = vi.spyOn(input, 'click');

      fixture.query<HTMLButtonElement>('[aria-label="Replace contract.pdf"]')?.click();
      expect(clickSpy).toHaveBeenCalledTimes(1);

      const replacement = new File(['y'.repeat(4096)], 'contract-v2.pdf', { type: 'application/pdf' });

      dispatchFiles(input, [replacement]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());

      expect(upload).toHaveBeenCalledTimes(2);
      expect(upload).toHaveBeenLastCalledWith(replacement, expect.anything());
      expect(fixture.queryAll('.file-item')).toHaveLength(1);
      expect(fixture.query('.file-name')?.textContent).toContain('contract-v2.pdf');
    });

    it('isolates one failing upload from the rest of a concurrent batch (Signal 05)', async () => {
      const upload = vi.fn((file: File) =>
        file.name === 'bad.txt' ? Promise.reject(new Error('boom')) : Promise.resolve(),
      );

      fixture = await mount('ore-file-input', { attrs: { multiple: '' }, props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;

      dispatchFiles(input, [new File(['x'], 'good.txt'), new File(['x'], 'bad.txt')]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());

      expect(upload).toHaveBeenCalledTimes(2);

      const statuses = fixture
        .queryAll<HTMLElement>('.file-item')
        .map((el) => ({ name: el.querySelector('.file-name')?.textContent, status: el.getAttribute('data-status') }));

      expect(statuses).toContainEqual({ name: 'good.txt', status: 'success' });
      expect(statuses).toContainEqual({ name: 'bad.txt', status: 'error' });
    });

    it('aborts the in-flight upload when its file is removed, without touching other files', async () => {
      const upload = vi.fn(
        (_file: File, ctx: { signal: AbortSignal }) =>
          new Promise<void>((_resolve, reject) => {
            ctx.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );

      fixture = await mount('ore-file-input', { attrs: { multiple: '' }, props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;
      const keep = new File(['x'], 'keep.txt');
      const drop = new File(['x'], 'drop.txt');

      dispatchFiles(input, [keep, drop]);
      await fixture.flush();

      fixture.query<HTMLButtonElement>('[aria-label="Remove drop.txt"]')?.click();
      await fixture.flush();

      expect(fixture.queryAll('.file-item')).toHaveLength(1);
      expect(fixture.query('.file-name')?.textContent).toBe('keep.txt');
    });

    it('ignores remove/retry while disabled — a disabled input is fully non-interactive, not just unable to add files', async () => {
      const upload = vi.fn(() => Promise.reject(new Error('boom')));

      fixture = await mount('ore-file-input', { props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });

      dispatchFiles(input, [file]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());

      expect(fixture.query('.file-item')?.getAttribute('data-status')).toBe('error');

      await fixture.attr('disabled', true);
      upload.mockClear();

      fixture.query<HTMLButtonElement>('[aria-label="Retry uploading doc.pdf"]')?.click();
      await fixture.flush();

      expect(upload).not.toHaveBeenCalled();

      fixture.query<HTMLButtonElement>('[aria-label="Remove doc.pdf"]')?.click();
      await fixture.flush();

      expect(fixture.queryAll('.file-item')).toHaveLength(1);
    });

    const flushAnnounce = () => new Promise((r) => setTimeout(r, 60)); // announce() clear-then-set delay
    const politeRegion = () => document.querySelector('[data-block-announcer="polite"]');
    const assertiveRegion = () => document.querySelector('[data-block-announcer="assertive"]');

    it('announces a successful upload to screen readers (Signal 04 completes the a11y story)', async () => {
      const upload = vi.fn(() => Promise.resolve());

      fixture = await mount('ore-file-input', { props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;

      dispatchFiles(input, [new File(['x'], 'report.pdf', { type: 'application/pdf' })]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());
      await flushAnnounce();

      expect(politeRegion()?.textContent).toContain('report.pdf uploaded successfully');
    });

    it('announces a failed upload assertively', async () => {
      const upload = vi.fn(() => Promise.reject(new Error('connection dropped')));

      fixture = await mount('ore-file-input', { props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;

      dispatchFiles(input, [new File(['x'], 'report.pdf', { type: 'application/pdf' })]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());
      await flushAnnounce();

      expect(assertiveRegion()?.textContent).toContain('report.pdf failed to upload: connection dropped');
    });

    it('passes axe checks while uploading', async () => {
      const upload = vi.fn(() => new Promise<void>(() => {}));

      fixture = await mount('ore-file-input', { attrs: { label: 'Upload file' }, props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;

      dispatchFiles(input, [new File(['x'], 'video.mp4', { type: 'video/mp4' })]);
      await fixture.flush();

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks in the error state (retry button included)', async () => {
      const upload = vi.fn(() => Promise.reject(new Error('boom')));

      fixture = await mount('ore-file-input', { attrs: { label: 'Upload file' }, props: { upload } });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;

      dispatchFiles(input, [new File(['x'], 'doc.pdf', { type: 'application/pdf' })]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks in the success state, including gallery mode (checkmark badge + Replace/Remove)', async () => {
      const upload = vi.fn(() => Promise.resolve());

      fixture = await mount('ore-file-input', {
        attrs: { gallery: '', label: 'Upload file', multiple: '' },
        props: { upload },
      });

      const input = fixture.query<HTMLInputElement>('input[type="file"]')!;

      dispatchFiles(input, [new File(['x'], 'photo.png', { type: 'image/png' })]);
      await fixture.flush();
      await fixture.act(() => Promise.resolve());

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
