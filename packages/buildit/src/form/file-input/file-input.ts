import {
  aria,
  computed,
  createId,
  css,
  define,
  defineEmits,
  defineField,
  defineProps,
  effect,
  handle,
  html,
  onCleanup,
  onMount,
  ref,
  signal,
} from '@vielzeug/craftit';
import { createDropZone } from '@vielzeug/dragit';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import type {
  AddEventListeners,
  BitFileInputEvents,
  ComponentSize,
  FormValidityMethods,
  RoundedSize,
  ThemeColor,
  VisualVariant,
} from '../../types';

// ============================================
// Helpers
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${units[i]}`;
}

function matchesAccept(file: File, accept: string): boolean {
  if (!accept) return true;
  return accept
    .split(',')
    .map((s) => s.trim())
    .some((pattern) => {
      if (pattern.startsWith('.')) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
      if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1));
      return file.type === pattern;
    });
}

// ============================================
// Component Styles
// ============================================

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_font-size: var(--file-input-font-size, var(--text-sm));
      --_radius: var(--file-input-radius, var(--rounded-md));
      --_bg: var(--file-input-bg, var(--color-contrast-100));
      --_border-color: var(--file-input-border-color, var(--color-contrast-300));
      --_min-height: var(--file-input-min-height, var(--size-36));

      align-items: stretch;
      display: inline-flex;
      flex-direction: column;
    }

    .file-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1-5);
      width: 100%;
    }

    /* ========================================
       Label
       ======================================== */

    .label-outside {
      color: var(--color-contrast-500);
      cursor: default;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      line-height: var(--leading-none);
      transition: color var(--transition-fast);
      user-select: none;
    }

    /* ========================================
       Dropzone
       ======================================== */

    .dropzone {
      align-items: center;
      background: var(--_bg);
      border-radius: var(--_radius);
      border: var(--border-2) dashed var(--_border-color);
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: var(--size-2);
      justify-content: center;
      min-height: var(--_min-height);
      outline: none;
      padding: var(--size-6) var(--size-4);
      position: relative;
      text-align: center;
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);
    }

    .dropzone-content {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: var(--size-2);
      pointer-events: none;
    }

    .dropzone-icon {
      align-items: center;
      color: var(--color-contrast-400);
      display: flex;
      justify-content: center;
      transition: color var(--transition-fast), transform var(--transition-fast);
    }

    .dropzone-title {
      color: var(--color-contrast-700);
      font-size: var(--_font-size);
      font-weight: var(--font-medium);
      line-height: var(--leading-snug);
    }

    .dropzone-title u {
      color: var(--_theme-focus, var(--color-primary));
      text-decoration: underline;
      text-decoration-color: transparent;
      text-underline-offset: 2px;
      transition: text-decoration-color var(--transition-fast);
    }

    .dropzone-hint {
      color: var(--color-contrast-400);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
    }

    /* ========================================
       Helper Text
       ======================================== */

    .helper-text {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      padding-inline: 2px;
    }

    /* ========================================
       File List
       ======================================== */

    .file-list {
      display: flex;
      flex-direction: column;
      gap: var(--size-1);
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .file-item {
      align-items: center;
      background: var(--color-contrast-50);
      border-radius: var(--_radius);
      border: var(--border) solid var(--color-contrast-200);
      box-sizing: border-box;
      display: flex;
      gap: var(--size-3);
      padding: var(--size-2) var(--size-3);
      transition: background var(--transition-fast);
    }

    .file-item:hover {
      background: var(--color-contrast-100);
    }

    .file-icon {
      color: var(--_theme-focus, var(--color-primary));
      flex-shrink: 0;
    }

    .file-meta {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--size-0-5);
      min-width: 0;
    }

    .file-name {
      color: var(--color-contrast-700);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      color: var(--color-contrast-400);
      font-size: var(--text-xs);
    }

    .file-remove {
      align-items: center;
      background: transparent;
      border-radius: var(--rounded-sm);
      border: none;
      color: var(--color-contrast-400);
      cursor: pointer;
      display: flex;
      flex-shrink: 0;
      justify-content: center;
      padding: var(--size-1);
      transition:
        color var(--transition-fast),
        background var(--transition-fast);
    }

    .file-remove:hover {
      background: var(--color-error-backdrop, color-mix(in srgb, var(--color-error) 12%, transparent));
      color: var(--color-error);
    }

    /* ========================================
       Hover & Focus
       ======================================== */

    :host(:not([disabled])) .dropzone:hover {
      border-color: var(--color-contrast-400);
    }

    :host(:not([disabled])) .dropzone:hover .dropzone-title u {
      text-decoration-color: var(--_theme-focus, var(--color-primary));
    }

    :host(:not([disabled])) .dropzone:focus-visible {
      border-color: var(--_theme-focus, var(--color-primary));
      box-shadow: var(--_theme-shadow, var(--color-primary-focus-shadow));
    }

    :host(:not([disabled])) .dropzone:hover .dropzone-icon,
    :host(:not([disabled])) .dropzone:focus-visible .dropzone-icon {
      color: var(--_theme-focus, var(--color-primary));
      transform: translateY(-2px);
    }

    /* ========================================
       Drag-Over State
       ======================================== */

    :host([drag-over]) .dropzone {
      background: color-mix(in srgb, var(--_theme-base, var(--color-primary)) 8%, var(--color-canvas));
      border-color: var(--_theme-focus, var(--color-primary));
      box-shadow: var(--_theme-shadow, var(--color-primary-focus-shadow));
    }

    :host([drag-over]) .dropzone .dropzone-icon {
      color: var(--_theme-focus, var(--color-primary));
      transform: translateY(-4px) scale(1.1);
    }

    /* ========================================
       Error State
       ======================================== */

    :host([error]) .dropzone {
      border-color: var(--color-error);
    }

    :host([error]) .label-outside {
      color: var(--color-error);
    }
  }

  @layer buildit.variants {
    /* Solid (Default) */
    :host(:not([variant])) .dropzone,
    :host([variant='solid']) .dropzone {
      background: var(--color-contrast-50);
      border-color: var(--color-contrast-300);
    }

    /* Flat */
    :host([variant='flat']) .dropzone {
      border-color: var(--_theme-border);
    }

    :host([variant='flat']) .dropzone:hover {
      background: color-mix(in srgb, var(--_theme-base) 6%, var(--color-contrast-100));
      border-color: color-mix(in srgb, var(--_theme-base) 35%, var(--color-contrast-300));
    }

    :host([variant='flat']) .dropzone:focus-visible,
    :host([variant='flat'][drag-over]) .dropzone {
      background: color-mix(in srgb, var(--_theme-base) 8%, var(--color-canvas));
      border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
      box-shadow: var(--_theme-shadow);
    }

    /* Bordered */
    :host([variant='bordered']) .dropzone {
      background: var(--_theme-backdrop);
      border-color: color-mix(in srgb, var(--_theme-focus) 70%, transparent);
    }

    :host([variant='bordered']) .dropzone:hover {
      border-color: var(--_theme-focus);
    }

    /* Outline */
    :host([variant='outline']) .dropzone {
      background: transparent;
    }

    /* Ghost */
    :host([variant='ghost']) .dropzone {
      background: transparent;
      border-color: var(--color-contrast-200);
    }

    :host([variant='ghost']) .dropzone:hover {
      background: var(--color-contrast-100);
    }
  }

  @layer buildit.utilities {
    :host([fullwidth]) {
      width: 100%;
    }
  }
`;

// ============================================
// Types
// ============================================

/** FileInput component properties */
export type FileInputProps = {
  /** Accepted file types (MIME types or extensions, comma-separated) */
  accept?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Error message (marks field as invalid) */
  error?: string;
  /** Full width mode */
  fullwidth?: boolean;
  /** Helper text */
  helper?: string;
  /** Label text */
  label?: string;
  /** Maximum number of files (0 = unlimited) */
  'max-files'?: number;
  /** Maximum file size in bytes (0 = unlimited) */
  'max-size'?: number;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Form field name */
  name?: string;
  /** Mark as required */
  required?: boolean;
  /** Border radius */
  rounded?: Exclude<RoundedSize, 'full'>;
  /** Component size */
  size?: ComponentSize;
  /** Visual variant */
  variant?: Exclude<VisualVariant, 'glass' | 'text' | 'frost'>;
};

// ============================================
// Component Definition
// ============================================

/**
 * A file upload component with drag-and-drop support, file list management,
 * and full form integration.
 *
 * @element bit-file-input
 *
 * @attr {string} accept - Accepted file types (MIME types or extensions, e.g. "image/*,.pdf")
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {boolean} disabled - Disable all interaction
 * @attr {string} error - Error message
 * @attr {boolean} fullwidth - Full width mode
 * @attr {string} helper - Helper text below the dropzone
 * @attr {string} label - Label text displayed above the dropzone
 * @attr {number} max-files - Maximum number of files (0 = unlimited)
 * @attr {number} max-size - Maximum file size in bytes (0 = unlimited)
 * @attr {boolean} multiple - Allow selecting multiple files
 * @attr {string} name - Form field name
 * @attr {boolean} required - Mark as required
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost'
 *
 * @fires change - Emitted when the file selection changes. detail: { files: File[], originalEvent?: Event }
 * @fires remove - Emitted when a file is removed from the list. detail: { file: File, files: File[] }
 *
 * @part wrapper - The outer wrapper div
 * @part label - The label element
 * @part dropzone - The drag-and-drop zone
 * @part input - The hidden native file input
 * @part helper - The helper text element
 * @part error - The error text element
 *
 * @cssprop --file-input-bg - Dropzone background color
 * @cssprop --file-input-border-color - Dropzone border color
 * @cssprop --file-input-radius - Border radius
 * @cssprop --file-input-min-height - Minimum dropzone height
 * @cssprop --file-input-font-size - Font size
 *
 * @example
 * ```html
 * <bit-file-input label="Upload files" accept="image/*" multiple />
 * <bit-file-input label="Resume" accept=".pdf,.doc,.docx" max-size="5242880" />
 * <bit-file-input variant="bordered" color="primary" />
 * ```
 */
export const TAG = define(
  'bit-file-input',
  ({ host }) => {
    const emit = defineEmits<{
      change: { files: File[]; originalEvent?: Event };
      remove: { file: File; files: File[] };
    }>();

    const props = defineProps<FileInputProps>({
      accept: { default: '' },
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '', omit: true },
      fullwidth: { default: false },
      helper: { default: '' },
      label: { default: '' },
      'max-files': { default: 0, type: Number },
      'max-size': { default: 0, type: Number },
      multiple: { default: false },
      name: { default: '' },
      required: { default: false },
      rounded: { default: undefined },
      size: { default: undefined },
      variant: { default: undefined },
    });

    // ============================================
    // State
    // ============================================

    const files = signal<File[]>([]);
    const isDragging = signal(false);

    // ============================================
    // Form Integration
    // ============================================

    defineField(
      {
        disabled: computed(() => Boolean(props.disabled.value)),
        toFormValue: (fi: File[]) => {
          if (fi.length === 0) return null;
          const name = props.name.value || 'file';
          const fd = new FormData();
          for (const file of fi) fd.append(name, file);
          return fd;
        },
        value: files,
      },
      {
        onReset: () => {
          files.value = [];
        },
      },
    );

    // Sync boolean host attributes for CSS selectors
    effect(() => {
      const errVal = props.error.value;
      // Set attr to the actual error string to avoid changing the attribute value
      // when it was already set externally. This prevents the feedback cycle
      // (setAttribute('', '') would change the attr value → re-trigger prop update → loop).
      if (errVal) {
        if (host.getAttribute('error') !== errVal) host.setAttribute('error', errVal);
      } else {
        host.removeAttribute('error');
      }
    });

    effect(() => {
      isDragging.value ? host.setAttribute('drag-over', '') : host.removeAttribute('drag-over');
    });

    // ============================================
    // IDs
    // ============================================

    const fileInputId = props.name.value ? `file-input-${props.name.value}` : createId('file-input');
    const labelId = `label-${fileInputId}`;
    const helperId = `helper-${fileInputId}`;
    const errorId = `error-${fileInputId}`;

    // ============================================
    // Refs
    // ============================================

    const dropzoneRef = ref<HTMLDivElement>();
    const inputRef = ref<HTMLInputElement>();
    const labelRef = ref<HTMLLabelElement>();
    const hintRef = ref<HTMLSpanElement>();
    const fileListRef = ref<HTMLUListElement>();
    const helperRef = ref<HTMLDivElement>();
    const errorRef = ref<HTMLDivElement>();

    // ============================================
    // File Management
    // ============================================

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: File validation requires checking multiple constraints (accept, size, count limits)
    function addFiles(newFiles: File[], originalEvent?: Event): void {
      if (props.disabled.value) return;

      const maxFilesLimit = props['max-files'].value;
      const maxSizeLimit = props['max-size'].value;
      const acceptVal = props.accept.value;
      const isMultiple = props.multiple.value;

      let incoming = Array.from(newFiles);

      // Single-file mode: only take the first
      if (!isMultiple) incoming = incoming.slice(0, 1);

      // Filter by accepted types
      if (acceptVal) incoming = incoming.filter((f) => matchesAccept(f, acceptVal));

      // Filter by max size
      if (maxSizeLimit > 0) incoming = incoming.filter((f) => f.size <= maxSizeLimit);

      // Build updated list (replace in single mode, append in multiple mode)
      let updated: File[] = isMultiple ? [...files.value] : [];
      for (const f of incoming) {
        if (!updated.some((existing) => existing.name === f.name && existing.size === f.size)) {
          updated.push(f);
        }
      }

      // Enforce max-files cap
      if (maxFilesLimit > 0 && updated.length > maxFilesLimit) {
        updated = updated.slice(0, maxFilesLimit);
      }

      files.value = updated;
      emit('change', { files: files.value, originalEvent });
    }

    function removeFile(file: File): void {
      const updated = files.value.filter((f) => f !== file);
      files.value = updated;
      emit('remove', { file, files: files.value });
      emit('change', { files: files.value });
    }

    // ============================================
    // Mount
    // ============================================

    onMount(() => {
      // ── Props → DOM sync effect ─────────────────
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form component requires synchronizing many props to DOM elements reactively
      effect(() => {
        const inp = inputRef.value;
        if (!inp) return;

        inp.accept = props.accept.value;
        inp.multiple = props.multiple.value;
        inp.required = props.required.value;
        inp.disabled = props.disabled.value;
        if (props.name.value) inp.name = props.name.value;

        // Dropzone tabindex
        const dz = dropzoneRef.value;
        if (dz) {
          dz.tabIndex = props.disabled.value ? -1 : 0;
        }

        // Label
        if (labelRef.value) {
          labelRef.value.textContent = props.label.value;
          labelRef.value.hidden = !props.label.value;
        }

        // Accept / size hint
        if (hintRef.value) {
          const parts: string[] = [];
          if (props.accept.value) {
            const types = props.accept.value
              .split(',')
              .map((s) => s.trim())
              .join(', ');
            parts.push(types);
          }
          if (props['max-size'].value > 0) parts.push(`max ${formatBytes(props['max-size'].value)}`);
          if (props['max-files'].value > 0)
            parts.push(`up to ${props['max-files'].value} file${props['max-files'].value !== 1 ? 's' : ''}`);
          hintRef.value.textContent = parts.join(' · ');
          hintRef.value.hidden = parts.length === 0;
        }

        // Helper / error text
        if (helperRef.value) {
          helperRef.value.textContent = props.helper.value;
          helperRef.value.hidden = !!props.error.value || !props.helper.value;
        }
        if (errorRef.value) {
          errorRef.value.textContent = props.error.value;
          errorRef.value.hidden = !props.error.value;
        }
      });

      // ── File list render effect ─────────────────
      effect(() => {
        const list = fileListRef.value;
        if (!list) return;

        const currentFiles = files.value;
        list.hidden = currentFiles.length === 0;
        list.innerHTML = '';

        for (const file of currentFiles) {
          const item = document.createElement('li');
          item.className = 'file-item';
          item.dataset.fileName = file.name;
          item.dataset.fileSize = String(file.size);

          const icon = document.createElement('span');
          icon.className = 'file-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

          const meta = document.createElement('span');
          meta.className = 'file-meta';

          const name = document.createElement('span');
          name.className = 'file-name';
          name.textContent = file.name;
          name.title = file.name;

          const size = document.createElement('span');
          size.className = 'file-size';
          size.textContent = formatBytes(file.size);

          meta.append(name, size);

          const removeBtn = document.createElement('button');
          removeBtn.className = 'file-remove';
          removeBtn.type = 'button';
          removeBtn.setAttribute('aria-label', `Remove ${file.name}`);
          removeBtn.setAttribute('data-action', 'remove');
          removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

          item.append(icon, meta, removeBtn);
          list.appendChild(item);
        }
      });

      // ── Event bindings ──────────────────────────
      const inp = inputRef.value!;
      const dz = dropzoneRef.value!;
      aria(dz, { disabled: () => String(props.disabled.value) });
      const list = fileListRef.value!;

      // Native input → add files
      handle(inp, 'change', (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.files?.length) addFiles(Array.from(input.files), e);
        input.value = ''; // reset so same file triggers change again
      });

      // Click dropzone → open file picker
      handle(dz, 'click', () => {
        if (!props.disabled.value) inp.click();
      });

      // Keyboard: Enter / Space → open picker
      handle(dz, 'keydown', (e: KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && !props.disabled.value) {
          e.preventDefault();
          inp.click();
        }
      });

      const dropZone = createDropZone({
        accept: props.accept.value ? props.accept.value.split(',').map((s) => s.trim()) : [],
        disabled: () => props.disabled.value,
        element: dz,
        onDrop: (droppedFiles, e) => addFiles(droppedFiles, e),
        onHoverChange: (hovered) => {
          isDragging.value = hovered;
        },
      });
      onCleanup(() => dropZone.destroy());

      // File list: delegated remove click
      handle(list, 'click', (e: MouseEvent) => {
        const btn = (e.target as Element).closest<HTMLElement>('[data-action="remove"]');
        if (!btn) return;
        const item = btn.closest<HTMLElement>('.file-item');
        if (!item) return;
        const { fileName, fileSize } = item.dataset;
        const file = files.value.find((f) => f.name === fileName && String(f.size) === fileSize);
        if (file) removeFile(file);
      });
    });

    // ============================================
    // Template
    // ============================================

    return {
      styles: [
        ...formFieldMixins,
        sizeVariantMixin({
          lg: { '--_min-height': 'var(--size-40)', fontSize: 'var(--text-base)' },
          sm: { '--_min-height': 'var(--size-28)', fontSize: 'var(--text-xs)' },
        }),
        disabledLoadingMixin(),
        forcedColorsFocusMixin('.dropzone'),
        componentStyles,
      ],
      template: html`
        <div class="file-input-wrapper" part="wrapper">
          <label class="label-outside" id="${labelId}" part="label" ref=${labelRef} hidden></label>
          <div
            class="dropzone"
            part="dropzone"
            ref=${dropzoneRef}
            role="button"
            tabindex="0"
            aria-label="File upload drop zone"
            aria-labelledby="${labelId}"
            aria-describedby="${helperId}">
            <input
              type="file"
              ref=${inputRef}
              part="input"
              id="${fileInputId}"
              hidden
              inert
              tabindex="-1" />
            <div class="dropzone-content">
              <span class="dropzone-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </span>
              <span class="dropzone-title">Drop files here or <u>click to browse</u></span>
              <span class="dropzone-hint" ref=${hintRef} hidden></span>
            </div>
          </div>
          <ul
            class="file-list"
            ref=${fileListRef}
            role="list"
            aria-label="Selected files"
            hidden></ul>
          <div class="helper-text" id="${helperId}" part="helper" ref=${helperRef} hidden></div>
          <div
            class="helper-text"
            id="${errorId}"
            role="alert"
            style="color: var(--color-error);"
            part="error"
            ref=${errorRef}
            hidden></div>
        </div>
      `,
    };
  },
  { formAssociated: true, shadow: { delegatesFocus: true } },
);

declare global {
  interface HTMLElementTagNameMap {
    'bit-file-input': HTMLElement & FileInputProps & FormValidityMethods & AddEventListeners<BitFileInputEvents>;
  }
}
