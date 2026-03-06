import { mount } from '@vielzeug/craftit/test';
import axe from 'axe-core';

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

/**
 * Accessibility tests for bit-file-input component using axe-core
 * Tests WCAG 2.1 Level AA compliance
 */
describe('bit-file-input accessibility', () => {
  beforeAll(async () => {
    await import('../file-input');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: {
          label: 'Upload documents',
          name: 'documents',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations with all common props set', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: {
          accept: '.pdf,.docx',
          helper: 'PDF or Word documents only, max 10 MB',
          label: 'Resume',
          'max-size': '10485760',
          multiple: '',
          name: 'resume',
          required: '',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when disabled', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: {
          disabled: '',
          label: 'Disabled upload',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations in error state', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: {
          error: 'File type not supported',
          label: 'Upload photo',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations without a label (aria-label present)', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: {
          'aria-label': 'Upload files',
        },
      });

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard focusable by default', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: { label: 'Upload' },
      });

      const dropzone = fixture.query<HTMLDivElement>('.dropzone');
      expect(dropzone?.tabIndex).toBe(0);

      fixture.destroy();
    });

    it('should not be keyboard focusable when disabled', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: { disabled: '', label: 'Upload' },
      });

      const dropzone = fixture.query<HTMLDivElement>('.dropzone');
      expect(dropzone?.tabIndex).toBe(-1);

      fixture.destroy();
    });

    it('should have aria-disabled on dropzone when disabled', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: { disabled: '', label: 'Upload' },
      });

      const dropzone = fixture.query('.dropzone');
      expect(dropzone?.getAttribute('aria-disabled')).toBe('true');

      fixture.destroy();
    });

    it('dropzone should have role button', async () => {
      const fixture = await mount('bit-file-input');

      const dropzone = fixture.query('.dropzone');
      expect(dropzone?.getAttribute('role')).toBe('button');

      fixture.destroy();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have aria-describedby on dropzone', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: {
          helper: 'Upload your files here',
          label: 'Files',
          name: 'files',
        },
      });

      const dropzone = fixture.query('.dropzone');
      const describedBy = dropzone?.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();

      fixture.destroy();
    });

    it('should have aria-labelledby on dropzone when label is set', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: { label: 'Upload', name: 'upload' },
      });

      const dropzone = fixture.query('.dropzone');
      const labelledBy = dropzone?.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      const label = fixture.element.shadowRoot?.getElementById(labelledBy!);
      expect(label?.textContent?.trim()).toBe('Upload');

      fixture.destroy();
    });

    it('file remove buttons should have descriptive aria-label', async () => {
      const fixture = await mount('bit-file-input', { attrs: { multiple: '' } });

      // Simulate file selection
      const inp = fixture.query<HTMLInputElement>('input[type="file"]');
      const dt = new DataTransfer();
      dt.items.add(new File(['content'], 'test-doc.pdf', { type: 'application/pdf' }));
      Object.defineProperty(inp, 'files', { value: dt.files, configurable: true });
      inp?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      const removeBtn = fixture.query<HTMLButtonElement>('[data-action="remove"]');
      expect(removeBtn?.getAttribute('aria-label')).toBe('Remove test-doc.pdf');

      fixture.destroy();
    });

    it('file list should have aria-label', async () => {
      const fixture = await mount('bit-file-input', { attrs: { multiple: '' } });

      const list = fixture.query('.file-list');
      expect(list?.getAttribute('aria-label')).toBe('Selected files');

      fixture.destroy();
    });

    it('error region should have role alert', async () => {
      const fixture = await mount('bit-file-input', {
        attrs: { error: 'Too many files' },
      });

      const errorEl = fixture.query('[role="alert"]');
      expect(errorEl).toBeTruthy();

      fixture.destroy();
    });
  });

  describe('Variant Accessibility', () => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost'] as const;

    for (const variant of variants) {
      it(`should have no violations with variant="${variant}"`, async () => {
        const fixture = await mount('bit-file-input', {
          attrs: { label: `Upload (${variant})`, variant },
        });

        const results = await axe.run(fixture.element);
        expect(results.violations).toHaveLength(0);

        fixture.destroy();
      });
    }
  });
});
