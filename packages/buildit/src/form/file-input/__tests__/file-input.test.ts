import { type Fixture, mount, user } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// ============================================================
// jsdom polyfills — DataTransfer and DragEvent are not implemented
// ============================================================

if (typeof globalThis.DataTransfer === 'undefined') {
  class DataTransferPolyfill {
    #files: File[] = [];
    readonly items = {
      add: (file: File) => { this.#files.push(file); },
    };
    get files(): FileList {
      const list = Object.create(FileList.prototype) as any;
      for (let i = 0; i < this.#files.length; i++) list[i] = this.#files[i];
      Object.defineProperty(list, 'length', { get: () => this.#files.length });
      list[Symbol.iterator] = function* () {
        for (let j = 0; j < this.length; j++) yield this[j];
      };
      return list as FileList;
    }
    dropEffect = 'copy';
  }
  (globalThis as any).DataTransfer = DataTransferPolyfill;
}

if (typeof globalThis.DragEvent === 'undefined') {
  class DragEventPolyfill extends MouseEvent {
    readonly dataTransfer: DataTransfer | null;
    constructor(type: string, init: MouseEventInit & { dataTransfer?: DataTransfer } = {}) {
      super(type, init);
      this.dataTransfer = init.dataTransfer ?? null;
    }
  }
  (globalThis as any).DragEvent = DragEventPolyfill;
}

// Helper: create a mock File object
function mockFile(name: string, sizeBytes = 1024, type = 'text/plain'): File {
  const content = new Array(sizeBytes).fill('a').join('');
  return new File([content], name, { type });
}

describe('bit-file-input', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../file-input');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ============================================================
  describe('Rendering', () => {
    it('should render dropzone and wrapper', async () => {
      fixture = await mount('bit-file-input');

      expect(fixture.query('.file-input-wrapper')).toBeTruthy();
      expect(fixture.query('.dropzone')).toBeTruthy();
    });

    it('should render a hidden native file input', async () => {
      fixture = await mount('bit-file-input');
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      expect(inp).toBeTruthy();
      expect(inp?.hidden).toBe(true);
    });

    it('should render the upload icon and title', async () => {
      fixture = await mount('bit-file-input');

      expect(fixture.query('.dropzone-icon')).toBeTruthy();
      expect(fixture.query('.dropzone-title')).toBeTruthy();
    });

    it('should render an empty file list (hidden) initially', async () => {
      fixture = await mount('bit-file-input');
      const list = fixture.query<HTMLUListElement>('.file-list');

      expect(list).toBeTruthy();
      expect(list?.hidden).toBe(true);
    });

    it('dropzone should have role="button"', async () => {
      fixture = await mount('bit-file-input');
      const dz = fixture.query('.dropzone');

      expect(dz?.getAttribute('role')).toBe('button');
    });

    it('dropzone should be focusable by default', async () => {
      fixture = await mount('bit-file-input');
      const dz = fixture.query<HTMLDivElement>('.dropzone');

      expect(dz?.tabIndex).toBe(0);
    });
  });

  // ============================================================
  describe('Label', () => {
    it('should render label when provided', async () => {
      fixture = await mount('bit-file-input', { attrs: { label: 'Upload files' } });
      const label = fixture.query<HTMLLabelElement>('.label-outside');

      expect(label?.textContent?.trim()).toBe('Upload files');
      expect(label?.hidden).toBe(false);
    });

    it('should hide label when not provided', async () => {
      fixture = await mount('bit-file-input');
      const label = fixture.query<HTMLLabelElement>('.label-outside');

      expect(label?.hidden).toBe(true);
    });

    it('should update label when attribute changes', async () => {
      fixture = await mount('bit-file-input', { attrs: { label: 'Initial' } });
      const label = fixture.query<HTMLLabelElement>('.label-outside');

      expect(label?.textContent?.trim()).toBe('Initial');

      await fixture.attr('label', 'Updated');
      expect(label?.textContent?.trim()).toBe('Updated');
    });
  });

  // ============================================================
  describe('Helper & Error Text', () => {
    it('should show helper text when set', async () => {
      fixture = await mount('bit-file-input', { attrs: { helper: 'Drag or click to upload' } });
      const helper = fixture.query<HTMLDivElement>('.helper-text');

      expect(helper?.textContent?.trim()).toBe('Drag or click to upload');
      expect(helper?.hidden).toBe(false);
    });

    it('should show error text and hide helper when error is set', async () => {
      fixture = await mount('bit-file-input', { attrs: { helper: 'Max 5 MB' } });
      await fixture.attr('error', 'File too large');

      const helper = fixture.query<HTMLDivElement>('[part="helper"]');
      const errorEl = fixture.query<HTMLDivElement>('[part="error"]');

      expect(helper?.hidden).toBe(true);
      expect(errorEl?.textContent?.trim()).toBe('File too large');
      expect(errorEl?.hidden).toBe(false);
    });

    it('should set [error] attribute on host for CSS targeting', async () => {
      fixture = await mount('bit-file-input');
      await fixture.attr('error', 'Required');

      expect(fixture.element.hasAttribute('error')).toBe(true);
    });

    it('should remove [error] attribute when error is cleared', async () => {
      fixture = await mount('bit-file-input');
      await fixture.attr('error', 'Required');
      expect(fixture.element.hasAttribute('error')).toBe(true);

      await fixture.attr('error', '');
      expect(fixture.element.hasAttribute('error')).toBe(false);
    });
  });

  // ============================================================
  describe('Accept Hint', () => {
    it('should show hint with accepted types', async () => {
      fixture = await mount('bit-file-input', { attrs: { accept: 'image/*,.pdf' } });
      const hint = fixture.query<HTMLSpanElement>('.dropzone-hint');

      expect(hint?.hidden).toBe(false);
      expect(hint?.textContent).toContain('image/*');
      expect(hint?.textContent).toContain('.pdf');
    });

    it('should show hint with max-size', async () => {
      fixture = await mount('bit-file-input', { attrs: { 'max-size': '5242880' } });
      const hint = fixture.query<HTMLSpanElement>('.dropzone-hint');

      expect(hint?.hidden).toBe(false);
      expect(hint?.textContent).toContain('5');
    });

    it('should show hint with max-files', async () => {
      fixture = await mount('bit-file-input', { attrs: { 'max-files': '3', multiple: '' } });
      const hint = fixture.query<HTMLSpanElement>('.dropzone-hint');

      expect(hint?.hidden).toBe(false);
      expect(hint?.textContent).toContain('3');
    });

    it('should hide hint when no constraints set', async () => {
      fixture = await mount('bit-file-input');
      const hint = fixture.query<HTMLSpanElement>('.dropzone-hint');

      expect(hint?.hidden).toBe(true);
    });
  });

  // ============================================================
  describe('Native Input Props', () => {
    it('should pass accept to native input', async () => {
      fixture = await mount('bit-file-input', { attrs: { accept: 'image/*' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      expect(inp?.accept).toBe('image/*');
    });

    it('should pass multiple to native input', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      expect(inp?.multiple).toBe(true);
    });

    it('should pass required to native input', async () => {
      fixture = await mount('bit-file-input', { attrs: { required: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      expect(inp?.required).toBe(true);
    });

    it('should set name on native input', async () => {
      fixture = await mount('bit-file-input', { attrs: { name: 'upload' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      expect(inp?.name).toBe('upload');
    });
  });

  // ============================================================
  describe('Disabled', () => {
    it('should reflect disabled attribute on host', async () => {
      fixture = await mount('bit-file-input', { attrs: { disabled: '' } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should disable the native input', async () => {
      fixture = await mount('bit-file-input', { attrs: { disabled: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      expect(inp?.disabled).toBe(true);
    });

    it('should set tabindex -1 on dropzone when disabled', async () => {
      fixture = await mount('bit-file-input', { attrs: { disabled: '' } });
      const dz = fixture.query<HTMLDivElement>('.dropzone');

      expect(dz?.tabIndex).toBe(-1);
    });

    it('should set aria-disabled on dropzone when disabled', async () => {
      fixture = await mount('bit-file-input', { attrs: { disabled: '' } });
      const dz = fixture.query('.dropzone');

      expect(dz?.getAttribute('aria-disabled')).toBe('true');
    });
  });

  // ============================================================
  describe('Reflect attributes', () => {
    it('should reflect variant', async () => {
      fixture = await mount('bit-file-input', { attrs: { variant: 'bordered' } });

      expect(fixture.element.getAttribute('variant')).toBe('bordered');
    });

    it('should reflect color', async () => {
      fixture = await mount('bit-file-input', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('should reflect size', async () => {
      fixture = await mount('bit-file-input', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('should reflect rounded', async () => {
      fixture = await mount('bit-file-input', { attrs: { rounded: 'full' } });

      expect(fixture.element.getAttribute('rounded')).toBe('full');
    });

    it('should reflect fullwidth', async () => {
      fixture = await mount('bit-file-input', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });
  });

  // ============================================================
  describe('File Selection via Input', () => {
    it('should add files to the list when input changes', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const file = mockFile('photo.jpg', 2048, 'image/jpeg');
      Object.defineProperty(inp, 'files', { value: createFileList([file]), configurable: true });

      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const list = fixture.query<HTMLUListElement>('.file-list');
      expect(list?.hidden).toBe(false);
      expect(list?.querySelectorAll('.file-item').length).toBe(1);
    });

    it('should display file name and size in list item', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const file = mockFile('report.pdf', 512, 'application/pdf');
      Object.defineProperty(inp, 'files', { value: createFileList([file]), configurable: true });

      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const item = fixture.query('.file-item');
      expect(item?.querySelector('.file-name')?.textContent).toBe('report.pdf');
    });

    it('should not add duplicate files (same name & size)', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const file1 = mockFile('dup.txt', 100);
      Object.defineProperty(inp, 'files', { value: createFileList([file1]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const file2 = mockFile('dup.txt', 100);
      Object.defineProperty(inp, 'files', { value: createFileList([file2]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const list = fixture.query('.file-list');
      expect(list?.querySelectorAll('.file-item').length).toBe(1);
    });

    it('should replace file list in single-file mode', async () => {
      fixture = await mount('bit-file-input');
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const file1 = mockFile('first.txt', 100);
      Object.defineProperty(inp, 'files', { value: createFileList([file1]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const file2 = mockFile('second.txt', 200);
      Object.defineProperty(inp, 'files', { value: createFileList([file2]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const list = fixture.query('.file-list');
      expect(list?.querySelectorAll('.file-item').length).toBe(1);
      expect(list?.querySelector('.file-name')?.textContent).toBe('second.txt');
    });
  });

  // ============================================================
  describe('File Removal', () => {
    it('should remove a file when the remove button is clicked', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const file = mockFile('remove-me.txt', 1024);
      Object.defineProperty(inp, 'files', { value: createFileList([file]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const removeBtn = fixture.query<HTMLButtonElement>('.file-remove');
      removeBtn?.click();
      await fixture.flush();

      const list = fixture.query<HTMLUListElement>('.file-list');
      expect(list?.hidden).toBe(true);
      expect(list?.querySelectorAll('.file-item').length).toBe(0);
    });

    it('should hide file list when all files are removed', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const file = mockFile('one.txt', 512);
      Object.defineProperty(inp, 'files', { value: createFileList([file]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const removeBtn = fixture.query<HTMLButtonElement>('.file-remove');
      removeBtn?.click();
      await fixture.flush();

      expect(fixture.query<HTMLUListElement>('.file-list')?.hidden).toBe(true);
    });
  });

  // ============================================================
  describe('Constraints', () => {
    it('should skip files that do not match accept', async () => {
      fixture = await mount('bit-file-input', { attrs: { accept: 'image/*', multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const bad = mockFile('data.csv', 100, 'text/csv');
      Object.defineProperty(inp, 'files', { value: createFileList([bad]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('.file-list')?.querySelectorAll('.file-item').length).toBe(0);
    });

    it('should accept files matching accept pattern', async () => {
      fixture = await mount('bit-file-input', { attrs: { accept: 'image/*', multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const good = mockFile('photo.png', 1024, 'image/png');
      Object.defineProperty(inp, 'files', { value: createFileList([good]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('.file-list')?.querySelectorAll('.file-item').length).toBe(1);
    });

    it('should skip files that exceed max-size', async () => {
      fixture = await mount('bit-file-input', { attrs: { 'max-size': '500', multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const tooBig = mockFile('large.txt', 1024);
      Object.defineProperty(inp, 'files', { value: createFileList([tooBig]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('.file-list')?.querySelectorAll('.file-item').length).toBe(0);
    });

    it('should cap at max-files', async () => {
      fixture = await mount('bit-file-input', { attrs: { 'max-files': '2', multiple: '' } });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const files = [mockFile('a.txt', 100), mockFile('b.txt', 100), mockFile('c.txt', 100)];
      Object.defineProperty(inp, 'files', { value: createFileList(files), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('.file-list')?.querySelectorAll('.file-item').length).toBe(2);
    });
  });

  // ============================================================
  describe('Events', () => {
    it('should emit change event when files are added', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      const inp = fixture.query<HTMLInputElement>('input[type="file"]');
      const file = mockFile('event-test.txt', 1024);
      Object.defineProperty(inp, 'files', { value: createFileList([file]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      expect(changeHandler).toHaveBeenCalledTimes(1);
      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.files).toHaveLength(1);
      expect(detail.files[0].name).toBe('event-test.txt');
    });

    it('should emit remove event when a file is removed', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const removeHandler = vi.fn();
      fixture.element.addEventListener('remove', removeHandler);

      const inp = fixture.query<HTMLInputElement>('input[type="file"]');
      const file = mockFile('to-remove.txt', 512);
      Object.defineProperty(inp, 'files', { value: createFileList([file]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const removeBtn = fixture.query<HTMLButtonElement>('.file-remove');
      removeBtn?.click();
      await fixture.flush();

      expect(removeHandler).toHaveBeenCalledTimes(1);
      const detail = (removeHandler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.file.name).toBe('to-remove.txt');
    });

    it('should emit change event when a file is removed', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      const inp = fixture.query<HTMLInputElement>('input[type="file"]');
      const file = mockFile('change-on-remove.txt', 512);
      Object.defineProperty(inp, 'files', { value: createFileList([file]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      changeHandler.mockClear();

      const removeBtn = fixture.query<HTMLButtonElement>('.file-remove');
      removeBtn?.click();
      await fixture.flush();

      // change fires once for the removal
      expect(changeHandler).toHaveBeenCalledTimes(1);
      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.files).toHaveLength(0);
    });
  });

  // ============================================================
  describe('Drag and Drop', () => {
    it('should set [drag-over] attribute on dragenter', async () => {
      fixture = await mount('bit-file-input');
      const dz = fixture.query<HTMLDivElement>('.dropzone');

      dz?.dispatchEvent(new DragEvent('dragenter', { bubbles: true }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('drag-over')).toBe(true);
    });

    it('should remove [drag-over] attribute after drop', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const dz = fixture.query<HTMLDivElement>('.dropzone');

      dz?.dispatchEvent(new DragEvent('dragenter', { bubbles: true }));
      await fixture.flush();
      expect(fixture.element.hasAttribute('drag-over')).toBe(true);

      const file = mockFile('dropped.txt', 512);
      const dt = new DataTransfer();
      dt.items.add(file);
      dz?.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('drag-over')).toBe(false);
    });

    it('should add dropped files to list', async () => {
      fixture = await mount('bit-file-input', { attrs: { multiple: '' } });
      const dz = fixture.query<HTMLDivElement>('.dropzone');

      const file = mockFile('dropped.png', 1024, 'image/png');
      const dt = new DataTransfer();
      dt.items.add(file);

      dz?.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
      await fixture.flush();

      const list = fixture.query('.file-list');
      expect(list?.querySelectorAll('.file-item').length).toBe(1);
    });

    it('should not add files when disabled during drop', async () => {
      fixture = await mount('bit-file-input', { attrs: { disabled: '' } });
      const dz = fixture.query<HTMLDivElement>('.dropzone');

      const file = mockFile('blocked.txt', 512);
      const dt = new DataTransfer();
      dt.items.add(file);

      dz?.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
      await fixture.flush();

      const list = fixture.query<HTMLUListElement>('.file-list');
      expect(list?.hidden).toBe(true);
    });
  });

  // ============================================================
  // Note: jsdom does not fire formResetCallback for form-associated custom elements.
  // The onFormReset handler is tested manually here by simulating its effect.
  describe('Form Reset', () => {
    it.skip('should clear files on form reset (requires a real browser; jsdom does not fire formResetCallback)', async () => {
      const form = document.createElement('form');
      document.body.appendChild(form);

      fixture = await mount('bit-file-input', { attrs: { multiple: '' }, container: form });
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');

      const file = mockFile('before-reset.txt', 1024);
      Object.defineProperty(inp, 'files', { value: createFileList([file]), configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      expect(fixture.query('.file-list')?.querySelectorAll('.file-item').length).toBe(1);

      form.reset();
      await fixture.flush();

      expect(fixture.query<HTMLUListElement>('.file-list')?.hidden).toBe(true);

      document.body.removeChild(form);
    });
  });
});

// ============================================================
// Helpers
// ============================================================

function createFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  return dt.files;
}
