import {
  computed,
  createId,
  defineComponent,
  defineField,
  effect,
  handle,
  html,
  onCleanup,
  onMount,
  ref,
  signal,
} from '@vielzeug/craftit';
import { each } from '@vielzeug/craftit/directives';
import { createDropZone } from '@vielzeug/dragit';

import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

import { clearIcon, fileIcon, uploadIcon } from '../../icons';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { FILE_INPUT_SIZE_PRESET } from '../shared/design-presets';

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

function matchesAccept(file: File, accept: string | undefined): boolean {
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

function isFileAccepted(file: File, accept: string | undefined): boolean {
  return !accept || matchesAccept(file, accept);
}

function isFileSizeAllowed(file: File, maxBytes: number | undefined): boolean {
  if (maxBytes == null) return true;

  return maxBytes === 0 || file.size <= maxBytes;
}

// ============================================
// Component Styles
// ============================================

import componentStyles from './file-input.css?inline';

// ============================================
// Types
// ============================================

/** FileInput component properties */

export type BitFileInputEvents = {
  change: { files: File[]; originalEvent?: Event; value: File[] };
  remove: { file: File; files: File[]; originalEvent?: Event; value: File[] };
};

export type BitFileInputProps = {
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
 * @fires change - Emitted when the file selection changes. detail: { value: File[], files: File[], originalEvent?: Event }
 * @fires remove - Emitted when a file is removed from the list. detail: { value: File[], file: File, files: File[], originalEvent?: Event }
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
export const FILE_INPUT_TAG = defineComponent<BitFileInputProps, BitFileInputEvents>({
  formAssociated: true,
  props: {
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
  },
  setup({ emit, host, props }) {
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

    // Sync host attributes for CSS selectors
    const isInvalid = computed(() => Boolean(props.error.value));

    effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      isInvalid.value ? host.setAttribute('invalid', '') : host.removeAttribute('invalid');
    });
    effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      isDragging.value ? host.setAttribute('drag-over', '') : host.removeAttribute('drag-over');
    });

    // ============================================
    // IDs
    // ============================================
    const fileInputId = createId('file-input');
    const labelId = `label-${fileInputId}`;
    const helperId = `helper-${fileInputId}`;
    const errorId = `error-${fileInputId}`;
    // ============================================
    // Refs
    // ============================================
    const dropzoneRef = ref<HTMLDivElement>();
    const inputRef = ref<HTMLInputElement>();
    const hintText = computed(() => {
      const parts: string[] = [];

      if (props.accept.value) {
        parts.push(
          props.accept.value
            .split(',')
            .map((s: string) => s.trim())
            .join(', '),
        );
      }

      const maxSize = props['max-size'].value ?? 0;

      if (maxSize > 0) parts.push(`max ${formatBytes(maxSize)}`);

      const maxFiles = props['max-files'].value ?? 0;

      if (maxFiles > 0) parts.push(`up to ${maxFiles} file${maxFiles !== 1 ? 's' : ''}`);

      return parts.join(' · ');
    });

    // ============================================
    // File Management
    // ============================================
    function addFiles(newFiles: File[], originalEvent?: Event): void {
      if (props.disabled.value) return;

      const maxFilesLimit = props['max-files'].value ?? 0;
      const maxSizeLimit = props['max-size'].value ?? 0;
      const acceptVal = props.accept.value;
      const isMultiple = Boolean(props.multiple.value);
      let incoming = Array.from(newFiles);

      if (!isMultiple) incoming = incoming.slice(0, 1);

      incoming = incoming.filter((f) => isFileAccepted(f, acceptVal) && isFileSizeAllowed(f, maxSizeLimit));

      let updated: File[] = isMultiple ? [...files.value] : [];

      for (const f of incoming) {
        if (!updated.includes(f)) updated.push(f);
      }

      if (maxFilesLimit > 0 && updated.length > maxFilesLimit) {
        updated = updated.slice(0, maxFilesLimit);
      }

      files.value = updated;
      emit('change', { files: files.value, originalEvent, value: files.value });
    }
    function removeFile(file: File, originalEvent?: Event): void {
      files.value = files.value.filter((f) => f !== file);
      emit('remove', { file, files: files.value, originalEvent, value: files.value });
      emit('change', { files: files.value, originalEvent, value: files.value });
    }
    // ============================================
    // Mount
    // ============================================
    onMount(() => {
      const inp = inputRef.value!;
      const dz = dropzoneRef.value!;

      // Native input → add files
      handle(inp, 'change', (e: Event) => {
        const input = e.target as HTMLInputElement;

        if (input.files?.length) addFiles(Array.from(input.files), e);

        input.value = ''; // reset so the same file triggers change again
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
        disabled: () => Boolean(props.disabled.value),
        element: dz,
        onDrop: (droppedFiles, e) => addFiles(droppedFiles, e),
        onHoverChange: (hovered) => {
          isDragging.value = hovered;
        },
      });

      onCleanup(() => dropZone.destroy());
    });

    // ============================================
    // Template
    // ============================================
    return html`
      <div class="file-input-wrapper" part="wrapper">
        <label class="label-outside" id="${labelId}" part="label" ?hidden=${() => !props.label.value}
          >${() => props.label.value}</label
        >
        <div
          class="dropzone"
          part="dropzone"
          ref=${dropzoneRef}
          role="button"
          :tabindex=${() => (props.disabled.value ? '-1' : '0')}
          :aria-disabled=${() => String(props.disabled.value)}
          :aria-label=${() => (!props.label.value ? 'File upload drop zone' : null)}
          :aria-labelledby=${() => (props.label.value ? labelId : null)}
          aria-describedby="${helperId}">
          <input
            type="file"
            ref=${inputRef}
            part="input"
            id="${fileInputId}"
            :accept=${() => props.accept.value}
            ?multiple=${() => props.multiple.value}
            ?required=${() => props.required.value}
            ?disabled=${() => props.disabled.value}
            :name=${() => props.name.value}
            hidden
            inert
            tabindex="-1" />
          <div class="dropzone-content">
            <span class="dropzone-icon" aria-hidden="true"> ${uploadIcon} </span>
            <span class="dropzone-title">Drop files here or <u>click to browse</u></span>
            <span class="dropzone-hint" ?hidden=${() => !hintText.value}>${hintText}</span>
          </div>
        </div>
        <ul class="file-list" role="list" aria-label="Selected files" ?hidden=${() => files.value.length === 0}>
          ${each(
            files,
            (file: File) => html`
              <li class="file-item">
                <span class="file-icon" aria-hidden="true"> ${fileIcon} </span>
                <span class="file-meta">
                  <span class="file-name" title="${file.name}">${file.name}</span>
                  <span class="file-size">${formatBytes(file.size)}</span>
                </span>
                <button
                  class="file-remove"
                  type="button"
                  aria-label="${`Remove ${file.name}`}"
                  @click=${(e: Event) => removeFile(file, e)}>
                  ${clearIcon}
                </button>
              </li>
            `,
            undefined,
            {
              key: (file: File) => `${file.name}:${file.size}:${file.lastModified}`,
            },
          )}
        </ul>
        <div class="helper-text" id="${helperId}" part="helper" ?hidden=${() => isInvalid.value || !props.helper.value}>
          ${() => props.helper.value}
        </div>
        <div
          class="helper-text helper-text-error"
          id="${errorId}"
          role="alert"
          part="error"
          ?hidden=${() => !isInvalid.value}>
          ${() => props.error.value}
        </div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    ...formFieldMixins,
    sizeVariantMixin(FILE_INPUT_SIZE_PRESET),
    disabledLoadingMixin(),
    forcedColorsFocusMixin('.dropzone'),
    componentStyles,
  ],
  tag: 'bit-file-input',
});
