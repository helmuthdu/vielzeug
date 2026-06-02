import {
  computed,
  define,
  defineField,
  html,
  inject,
  onCleanup,
  onEvent,
  onMounted,
  prop,
  ref,
  signal,
} from '@vielzeug/craft';
import { createDropZone, matchesAccept } from '@vielzeug/grip';

import { createInteraction, createStableId } from '../../headless';
import { FILE_INPUT_SIZE_PRESET } from '../../shared';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledLoadingMixin,
  forcedColorsFocusMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './file-input.css?inline';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const isFileSizeAllowed = (file: File, maxSize?: number) => !maxSize || file.size <= maxSize;

/** File input component properties */
export type BitFileInputProps = {
  /** Accepted file types (comma-separated, e.g. '.jpg, .png, image/*') */
  accept?: string;
  /** Theme color tint */
  color?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Error message text */
  error?: string;
  /** Helper text displayed below the input */
  helper?: string;
  /** Input label text */
  label?: string;
  /** Max number of files allowed (only used if multiple is true) */
  'max-files'?: number;
  /** Max size of a single file in bytes */
  'max-size'?: number;
  /** Allow multiple files selection */
  multiple?: boolean;
  /** Form field name */
  name?: string;
  /** Required field */
  required?: boolean;
  /** Field size preset */
  size?: string;
};

/** Events emitted by the file-input component */
export type BitFileInputEvents = {
  /** Emitted when files are added or removed */
  change: { files: File[]; originalEvent?: Event; value: File[] };
  /** Emitted when a specific file is removed */
  remove: { file: File; files: File[]; originalEvent?: Event; value: File[] };
};

/**
 * A file upload field with drag-and-drop support and built-in validation messaging.
 *
 * @element bit-file-input
 *
 * @attr {string} accept - Comma-separated file extensions or MIME types
 * @attr {boolean} multiple - Enable multiple files selection
 * @attr {number} max-files - Max number of files allowed
 * @attr {number} max-size - Max size of each file in bytes
 * @attr {boolean} disabled - Disable interaction
 * @attr {string} error - Show an error state/message
 * @attr {string} helper - Provide helper context below the dropzone
 *
 * @fires change - detail: { files: File[], value: File[] }
 * @fires remove - detail: { file: File, files: File[] }
 *
 * @cssprop --border - Border token for the file field and dropzone
 * @cssprop --border-2 - Stronger border token used for hover and focus states
 * @cssprop --color-canvas - Base background for the file input surface
 * @cssprop --color-contrast-100 - Hover background for the dropzone and file list
 * @cssprop --color-contrast-200 - Divider and border contrast color
 * @cssprop --color-contrast-300 - Muted contrast tone for secondary details
 * @cssprop --color-contrast-400 - Secondary text color for helper content
 * @cssprop --color-contrast-50 - Soft background used for the dropzone surface
 * @cssprop --color-contrast-500 - Primary body text color in the field
 * @cssprop --color-contrast-700 - Strong text color for labels and filenames
 * @cssprop --color-error - Error accent color for invalid and rejected states
 * @cssprop --color-error-backdrop - Error tint used behind invalid dropzone states
 * @part wrapper - Root wrapper around the file input field
 * @part label - Visible label rendered above the dropzone
 * @part dropzone - Interactive drag-and-drop target
 * @part input - Native file input element
 * @part helper - Helper text shown beneath the dropzone
 * @part error - Error message shown beneath the field
 * @example
 * ```html
 * <bit-file-input label="Upload files" accept="image/*" multiple />
 * <bit-file-input label="Resume" accept=".pdf,.doc,.docx" max-size="5242880" />
 * <bit-file-input variant="bordered" color="primary" />
 * ```
 */
export const FILE_INPUT_TAG = 'bit-file-input' as const;
define<BitFileInputProps, BitFileInputEvents>(FILE_INPUT_TAG, {
  formAssociated: true,
  props: {
    accept: prop.string(),
    color: prop.string(),
    disabled: prop.bool(false),
    error: prop.string(),
    helper: prop.string(),
    label: prop.string(),
    'max-files': prop.number(0),
    'max-size': prop.number(0),
    multiple: prop.bool(false),
    name: prop.string(),
    required: prop.bool(false),
    size: prop.string(),
  },
  setup(props, { bind, el: _el, emit }) {
    // ============================================
    // State
    // ============================================

    const files = signal<File[]>([]);
    const isDragging = signal(false);
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const isDisabled = fCtxProps.disabled;
    const maxFilesLimit = computed(() => props['max-files'].value ?? 0);
    const maxSizeLimit = computed(() => props['max-size'].value ?? 0);

    // ============================================
    // Form Integration
    // ============================================

    defineField({
      disabled: isDisabled,
      toFormValue: (fi: File[]) => {
        if (fi.length === 0) return null;

        const name = props.name.value || 'file';
        const fd = new FormData();

        for (const file of fi) fd.append(name, file);

        return fd;
      },
      value: files,
    });

    // Sync host attributes for CSS selectors
    const isInvalid = computed(() => Boolean(props.error.value));

    bind({
      attr: {
        'drag-over': () => (isDragging.value ? true : undefined),
        invalid: () => (isInvalid.value ? true : undefined),
        size: fCtxProps.size,
      },
    });

    // ============================================
    // IDs
    // ============================================
    const fileInputId = createStableId('file-input');
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

      const maxSize = maxSizeLimit.value;

      if (maxSize > 0) parts.push(`max ${formatBytes(maxSize)}`);

      const maxFiles = maxFilesLimit.value;

      if (maxFiles > 0) parts.push(`up to ${maxFiles} file${maxFiles !== 1 ? 's' : ''}`);

      return parts.join(' · ');
    });

    // ============================================
    // File Management
    // ============================================
    function addFiles(newFiles: File[], originalEvent?: Event): void {
      if (isDisabled.value) return;

      const acceptVal = props.accept.value;
      const isMultiple = Boolean(props.multiple.value);
      let incoming = Array.from(newFiles);

      if (!isMultiple) incoming = incoming.slice(0, 1);

      incoming = incoming.filter(
        (f) =>
          matchesAccept(f, acceptVal ? acceptVal.split(',').map((t) => t.trim()) : []) &&
          isFileSizeAllowed(f, maxSizeLimit.value),
      );

      let updated: File[] = isMultiple ? [...files.value] : [];

      for (const f of incoming) {
        if (!updated.includes(f)) updated.push(f);
      }

      if (maxFilesLimit.value > 0 && updated.length > maxFilesLimit.value) {
        updated = updated.slice(0, maxFilesLimit.value);
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
    // ============================================
    // Template
    // ============================================
    onMounted(() => {
      const inp = inputRef.value!;
      const dz = dropzoneRef.value!;
      let skipNextClick = false;
      const pressControl = createInteraction({
        disabled: () => isDisabled.value,
        onPress: () => {
          inp.click();
        },
      });

      // Native input → add files
      onEvent(inp, 'change', (e: Event) => {
        const input = e.target as HTMLInputElement;

        if (input.files?.length) addFiles(Array.from(input.files), e);

        input.value = ''; // reset so the same file triggers change again
      });
      // Click dropzone → open file picker
      onEvent(dz, 'click', (e: MouseEvent) => {
        if (e.target === inp) return;

        if (skipNextClick) {
          skipNextClick = false;

          return;
        }

        if (!isDisabled.value) inp.click();
      });
      // Keyboard: Enter / Space → open picker
      onEvent(dz, 'keydown', (e: KeyboardEvent) => {
        skipNextClick = pressControl.handleKeydown(e) && e.key === 'Enter';
      });

      const dropZone = createDropZone({
        disabled: () => isDisabled.value,
        element: dz,
        onDrop: (droppedFiles, e) => addFiles(droppedFiles, e),
        onHoverChange: (hovered) => {
          isDragging.value = hovered;
        },
      });

      onCleanup(() => dropZone.destroy());
    });

    return html`
      <div class="file-input-wrapper" part="wrapper">
        <label class="label-outside" id="${labelId}" part="label" ?hidden=${() => !props.label.value}
          >${props.label}</label
        >
        <div
          class="dropzone"
          part="dropzone"
          ref=${dropzoneRef}
          role="button"
          :tabindex="${() => (isDisabled.value ? '-1' : '0')}"
          :aria-disabled="${() => String(isDisabled.value)}"
          :aria-label="${() => (!props.label.value ? 'File upload drop zone' : null)}"
          :aria-labelledby="${() => (props.label.value ? labelId : null)}"
          aria-describedby="${helperId}">
          <input
            type="file"
            ref=${inputRef}
            part="input"
            id="${fileInputId}"
            :accept="${props.accept}"
            ?multiple="${props.multiple}"
            ?required="${props.required}"
            ?disabled="${isDisabled}"
            :name="${props.name}"
            hidden
            inert
            tabindex="-1" />
          <div class="dropzone-content">
            <span class="dropzone-icon" aria-hidden="true">
              <bit-icon name="upload" size="36" stroke-width="1.5" aria-hidden="true"></bit-icon>
            </span>
            <span class="dropzone-title">Drop files here or <u>click to browse</u></span>
            <span class="dropzone-hint" ?hidden=${() => !hintText.value}>${hintText}</span>
          </div>
        </div>
        <ul class="file-list" role="list" aria-label="Selected files" ?hidden=${() => files.value.length === 0}>
          ${() =>
            files.value.map(
              (file: File) => html`
                <li class="file-item">
                  <span class="file-icon" aria-hidden="true">
                    <bit-icon name="file" size="18" stroke-width="1.75" aria-hidden="true"></bit-icon>
                  </span>
                  <span class="file-meta">
                    <span class="file-name" title="${file.name}">${file.name}</span>
                    <span class="file-size">${formatBytes(file.size)}</span>
                  </span>
                  <button
                    class="file-remove"
                    type="button"
                    aria-label="${`Remove ${file.name}`}"
                    @click=${(e: Event) => removeFile(file, e)}>
                    <bit-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></bit-icon>
                  </button>
                </li>
              `,
            )}
        </ul>
        <div class="helper-text" id="${helperId}" part="helper" ?hidden=${() => isInvalid.value || !props.helper.value}>
          ${props.helper}
        </div>
        <div
          class="helper-text helper-text-error"
          id="${errorId}"
          role="alert"
          part="error"
          ?hidden=${() => !isInvalid.value}>
          ${() => props.error.value ?? ''}
        </div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    colorThemeMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    roundedVariantMixin,
    sizeVariantMixin(FILE_INPUT_SIZE_PRESET),
    disabledLoadingMixin(),
    forcedColorsFocusMixin('.dropzone'),
    componentStyles,
  ],
});
