import { createDropZone } from '@vielzeug/dnd';
import {
  createStableId,
  define,
  html,
  inject,
  prop,
  ref,
  bind,
  onCleanup,
  onElement,
  onEvent,
  onMounted,
  useEmit,
} from '@vielzeug/ore';
import { when } from '@vielzeug/ore/directives';
import { useField } from '@vielzeug/ore/forms';
import { computed, signal, watch } from '@vielzeug/ripple';

import '../../content/icon/icon';
import '../../feedback/progress/progress';
import { createInteraction } from '../../headless';
import { FILE_INPUT_SIZE_PRESET } from '../../shared';
import { fieldMixins, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { createFileQueue, formatBytes, type FileUploadFn } from './file-input-upload';
import componentStyles from './file-input.css?inline';

export type { FileUploadFn, FileUploadState, FileUploadStatus } from './file-input-upload';

const isImageFile = (file: File): boolean => file.type.startsWith('image/');

/** File input component properties */
export type OreFileInputProps = {
  /** Accepted file types (comma-separated, e.g. '.jpg, .png, image/*') */
  accept?: string;
  /** Theme color tint */
  color?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Error message text */
  error?: string;
  /**
   * Render selected files as a grid of image thumbnails/previews instead of the default
   * single-column list. Non-image files fall back to a generic file icon in the same grid.
   */
  gallery?: boolean;
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
  /**
   * JS-only callback fired with the inner `<input type="file">` element when it
   * mounts, and with `null` when it unmounts. Intended for composed components
   * that need imperative access to the raw element.
   * Set as a JS property: `bitFileInput.ref = (el) => { ... }`.
   */
  ref?: ((el: HTMLInputElement | null) => void) | null;
  /** Required field */
  required?: boolean;
  /** Field size preset */
  size?: string;
  /**
   * JS-only upload transport (see `FileUploadFn`). When set, every newly added file starts
   * uploading immediately and independently — progress/speed/ETA, retry-on-failure, and a
   * success confirmation card are all driven from here. Omit it to keep the component in its
   * original picker-only mode (select files, no upload lifecycle).
   * Set as a JS property: `fileInput.upload = async (file, { onProgress, signal }) => { ... }`.
   */
  upload?: FileUploadFn | null;
};

/** Events emitted by the file-input component */
export type OreFileInputEvents = {
  /** Emitted when files are added or removed */
  change: { files: File[]; originalEvent?: Event; value: File[] };
  /** Emitted when a specific file is removed */
  remove: { file: File; files: File[]; originalEvent?: Event; value: File[] };
  /** Emitted when `upload` rejects for a file (after a fresh attempt or a retry) */
  'upload-error': { error: unknown; file: File };
  /** Emitted whenever `upload`'s `onProgress` reports new bytes for a file */
  'upload-progress': { file: File; loaded: number; total: number };
  /** Emitted when `upload` resolves for a file */
  'upload-success': { file: File };
};

/**
 * A file upload field with drag-and-drop support, built-in validation messaging, and — once a
 * `upload` transport is wired up — a full per-file upload lifecycle: live progress/speed/ETA,
 * retry-on-failure, a success confirmation card, and fully independent handling of concurrent
 * files (one failing never blocks or cancels the others). Picking files with no `upload` set
 * keeps the original, upload-free selection-only behavior.
 *
 * @element ore-file-input
 *
 * @attr {string} accept - Comma-separated file extensions or MIME types
 * @attr {boolean} multiple - Enable multiple files selection
 * @attr {boolean} gallery - Show selected files as an image thumbnail/preview grid
 * @attr {number} max-files - Max number of files allowed
 * @attr {number} max-size - Max size of each file in bytes
 * @attr {boolean} disabled - Disable interaction
 * @attr {string} error - Show an error state/message
 * @attr {string} helper - Provide helper context below the dropzone
 *
 * @fires change - detail: { files: File[], value: File[] }
 * @fires remove - detail: { file: File, files: File[] }
 * @fires upload-progress - detail: { file: File, loaded: number, total: number }
 * @fires upload-success - detail: { file: File }
 * @fires upload-error - detail: { file: File, error: unknown }
 *
 * @cssprop --file-input-bg - Dropzone background color
 * @cssprop --file-input-border-color - Dropzone border color
 * @cssprop --file-input-font-size - Font size
 * @cssprop --file-input-radius - Dropzone border radius
 * @cssprop --file-input-min-height - Minimum dropzone height
 * @cssprop --file-input-hover-bg - Dropzone background on hover (flat/ghost variants)
 * @cssprop --file-input-hover-border-color - Dropzone border on hover (flat/bordered variants)
 * @cssprop --file-input-focus-bg - Dropzone background when focused/drag-over (flat variant)
 * @cssprop --file-input-focus-border-color - Dropzone border when focused/drag-over (flat variant)
 * @cssprop --file-input-thumb-size - Gallery thumbnail width/height
 * @part wrapper - Root wrapper around the file input field
 * @part label - Visible label rendered above the dropzone
 * @part dropzone - Interactive drag-and-drop target
 * @part input - Native file input element
 * @part gallery - Gallery grid container (rendered instead of `file-list` when `gallery` is set)
 * @part helper - Helper text shown beneath the dropzone
 * @part error - Error message shown beneath the field
 * @example
 * ```html
 * <ore-file-input label="Upload files" accept="image/*" multiple />
 * <ore-file-input label="Photos" accept="image/*" multiple gallery />
 * <ore-file-input label="Resume" accept=".pdf,.doc,.docx" max-size="5242880" />
 * <ore-file-input variant="bordered" color="primary" />
 * ```
 * ```ts
 * // Wire up a real upload transport — progress/retry/success are then handled automatically.
 * // `XMLHttpRequest` is used here (not `fetch`) because it's the only browser API that reports
 * // upload progress; swap in whatever transport the app already uses.
 * const input = document.querySelector('ore-file-input');
 * input.upload = (file, { onProgress, signal, resumeFrom }) =>
 *   new Promise((resolve, reject) => {
 *     const xhr = new XMLHttpRequest();
 *
 *     xhr.upload.addEventListener('progress', (e) => onProgress(resumeFrom + e.loaded, file.size));
 *     xhr.addEventListener('load', () => (xhr.status < 400 ? resolve() : reject(new Error(xhr.statusText))));
 *     xhr.addEventListener('error', () => reject(new Error('Network error')));
 *     signal.addEventListener('abort', () => xhr.abort());
 *
 *     xhr.open('PUT', '/uploads');
 *     if (resumeFrom > 0) xhr.setRequestHeader('Content-Range', `bytes ${resumeFrom}-/${file.size}`);
 *     xhr.send(file);
 *   });
 * ```
 */
export const FILE_INPUT_TAG = 'ore-file-input' as const;
define<OreFileInputProps>(FILE_INPUT_TAG, {
  formAssociated: true,
  props: {
    accept: prop.string(),
    color: prop.string(),
    disabled: prop.bool(false),
    error: prop.string(),
    gallery: prop.bool(false),
    helper: prop.string(),
    label: prop.string(),
    'max-files': prop.number(0),
    'max-size': prop.number(0),
    multiple: prop.bool(false),
    name: prop.string(),
    ref: prop.json(undefined as ((el: HTMLInputElement | null) => void) | null | undefined),
    required: prop.bool(false),
    size: prop.string(),
    upload: prop.data<FileUploadFn>(),
  },
  setup(props) {
    const emit = useEmit<OreFileInputEvents>();

    // ============================================
    // State
    // ============================================

    const isDragging = signal(false);
    // Set while a "Replace" action is waiting for the (shared) native file input's next
    // `change` — routes that selection into `queue.replaceFile()` instead of `queue.addFiles()`.
    const replaceTarget = signal<File | null>(null);

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(props, formCtx);
    const isDisabled = fCtxProps.disabled;
    const maxFilesLimit = computed(() => props['max-files'].value ?? 0);
    const maxSizeLimit = computed(() => props['max-size'].value ?? 0);

    // File selection + the opt-in upload lifecycle (progress, retry, replace, per-file
    // isolation) live in `createFileQueue` — see file-input-upload.ts for why they're one unit.
    const queue = createFileQueue({
      accept: props.accept,
      disabled: isDisabled,
      maxFiles: maxFilesLimit,
      maxSize: maxSizeLimit,
      multiple: computed(() => Boolean(props.multiple.value)),
      onChange: (changedFiles, originalEvent) =>
        emit('change', { files: changedFiles, originalEvent, value: changedFiles }),
      onRemove: (file, remainingFiles, originalEvent) =>
        emit('remove', { file, files: remainingFiles, originalEvent, value: remainingFiles }),
      onUploadError: (file, error) => emit('upload-error', { error, file }),
      onUploadProgress: (file, loaded, total) => emit('upload-progress', { file, loaded, total }),
      onUploadSuccess: (file) => emit('upload-success', { file }),
      upload: computed(() => props.upload.value ?? undefined),
    });

    onCleanup(() => queue.dispose());

    // ============================================
    // Form Integration
    // ============================================

    useField({
      disabled: isDisabled,
      toFormValue: (fi: File[]) => {
        if (fi.length === 0) return null;

        const name = props.name.value || 'file';
        const fd = new FormData();

        for (const file of fi) fd.append(name, file);

        return fd;
      },
      value: queue.files,
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
    // Replace ("swap this one file" — see file-input-upload.ts's `replaceFile`)
    // ============================================
    function beginReplace(file: File): void {
      replaceTarget.value = file;
      inputRef.value?.click();
    }

    // ============================================
    // Gallery Preview URLs
    // ============================================
    // Object URLs are created lazily (only while `gallery` is enabled) and revoked as soon
    // as their file is no longer selected, plus unconditionally on disconnect — otherwise
    // each preview leaks its backing blob for the life of the page.
    const previewUrls = new Map<File, string>();

    function getPreviewUrl(file: File): string {
      let url = previewUrls.get(file);

      if (!url) {
        url = URL.createObjectURL(file);
        previewUrls.set(file, url);
      }

      return url;
    }

    function revokeStalePreviewUrls(activeFiles: File[]): void {
      const keep = new Set(activeFiles);

      for (const [file, url] of previewUrls) {
        if (!keep.has(file)) {
          URL.revokeObjectURL(url);
          previewUrls.delete(file);
        }
      }
    }

    watch(queue.files, revokeStalePreviewUrls);

    onCleanup(() => {
      for (const url of previewUrls.values()) URL.revokeObjectURL(url);

      previewUrls.clear();
    });

    // ============================================
    // Mount
    // ============================================
    // ============================================
    // Template
    // ============================================
    onElement(inputRef, (inp) => {
      props.ref.value?.(inp);

      const sub = watch(props.ref, (cb) => {
        cb?.(inp);
      });

      return () => {
        sub.dispose();
        props.ref.value?.(null);
      };
    });

    onMounted(() => {
      const inp = inputRef.value!;
      const dz = dropzoneRef.value!;
      let skipNextClick = false;
      const pressControl = createInteraction({
        disabled: isDisabled,
        onPress: () => {
          inp.click();
        },
      });

      // Native input → add files, or — if a "Replace" action opened the picker — swap the one
      // file it targeted instead of appending a new entry.
      onEvent(inp, 'change', (e: Event) => {
        const input = e.target as HTMLInputElement;
        const target = replaceTarget.value;

        replaceTarget.value = null;

        if (target && input.files?.[0]) queue.replaceFile(target, input.files[0], e);
        else if (input.files?.length) queue.addFiles(Array.from(input.files), e);

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

      // `createDropZone` has no way to update `disabled` after creation — recreate the zone
      // whenever the prop changes instead of capturing a stale snapshot from this one `onMounted`
      // run. `watch`'s own returned cleanup (not a second `onCleanup`) disposes the current zone
      // both on the next toggle and on final teardown.
      watch(
        isDisabled,
        (disabled) => {
          const dropZone = createDropZone({
            disabled,
            element: dz,
            onDrop: (droppedFiles) => queue.addFiles(droppedFiles),
            onHoverChange: (hovered) => {
              isDragging.value = hovered;
            },
          });

          return () => dropZone.dispose();
        },
        { immediate: true },
      );
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
              <ore-icon name="upload" size="36" stroke-width="1.5" aria-hidden="true"></ore-icon>
            </span>
            <!-- Signal 01: the copy itself shifts on drag-entry (not just border/glow) — a
                 static "Drop files here" during an active drag reads as if the drop target
                 hasn't noticed the file yet. -->
            ${when(
              () => isDragging.value,
              () => html`<span class="dropzone-title dropzone-title-active">Release to upload</span>`,
            )}
            ${when(
              () => !isDragging.value,
              () => html`<span class="dropzone-title">Drop files here or <u>click to browse</u></span>`,
            )}
            <span class="dropzone-hint" ?hidden=${() => !hintText.value}>${hintText}</span>
          </div>
        </div>
        <ul
          class="${() => (props.gallery.value ? 'file-grid' : 'file-list')}"
          part="${() => (props.gallery.value ? 'gallery' : null)}"
          role="list"
          aria-label="Selected files"
          ?hidden=${() => queue.files.value.length === 0}>
          ${() =>
            queue.files.value.map((file: File) =>
              props.gallery.value
                ? html`
                    <li class="file-card" data-status=${() => queue.fileState(file).status}>
                      <span class="file-thumb-frame">
                        ${
                          // Decorative: the file name is already announced via the visible
                          // `.file-card-name` caption below — repeating it as `alt` text would
                          // duplicate it (and often trips redundant-alt checks, since real
                          // filenames commonly contain words like "photo" or "image").
                          isImageFile(file)
                            ? // Object URLs use the `blob:` scheme, which ore's attribute-level
                              // XSS guard blocks unconditionally on `src` (and other
                              // URL-accepting attributes) — set it as a DOM property via `ref`
                              // instead, bypassing that string-based check. Safe here: the value
                              // comes from `URL.createObjectURL(file)` on a real `File` object we
                              // control, never from untrusted text.
                              html`<img
                                class="file-thumb"
                                alt=""
                                ref="${(el: HTMLImageElement | null) => {
                                  if (el) el.src = getPreviewUrl(file);
                                }}" />`
                            : html`<span class="file-thumb file-thumb-generic" aria-hidden="true">
                                <ore-icon name="file" size="28" stroke-width="1.5" aria-hidden="true"></ore-icon>
                              </span>`
                        }
                        ${when(
                          () => queue.fileState(file).status === 'success',
                          () =>
                            html`<span class="file-status-badge file-status-badge-success" aria-hidden="true">
                              <ore-icon name="check" size="11" stroke-width="3" aria-hidden="true"></ore-icon>
                            </span>`,
                        )}
                        ${when(
                          () => queue.fileState(file).status === 'error',
                          () =>
                            html`<span class="file-status-badge file-status-badge-error" aria-hidden="true">
                              <ore-icon name="alert-circle" size="12" stroke-width="2.5" aria-hidden="true"></ore-icon>
                            </span>`,
                        )}
                        <span class="file-card-actions">
                          ${when(
                            () => queue.fileState(file).status === 'error',
                            () =>
                              html`<button
                                class="file-card-action"
                                type="button"
                                aria-label="${`Retry uploading ${file.name}`}"
                                @click=${() => queue.retryUpload(file)}>
                                <ore-icon name="refresh-cw" size="12" stroke-width="2.5" aria-hidden="true"></ore-icon>
                              </button>`,
                          )}
                          ${when(
                            () =>
                              queue.fileState(file).status === 'success' &&
                              Boolean(props.multiple.value) &&
                              Boolean(props.upload.value),
                            () =>
                              html`<button
                                class="file-card-action"
                                type="button"
                                aria-label="${`Replace ${file.name}`}"
                                @click=${() => beginReplace(file)}>
                                <ore-icon name="upload" size="12" stroke-width="2.5" aria-hidden="true"></ore-icon>
                              </button>`,
                          )}
                          <button
                            class="file-card-action file-card-remove"
                            type="button"
                            aria-label="${`Remove ${file.name}`}"
                            @click=${(e: Event) => queue.removeFile(file, e)}>
                            <ore-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></ore-icon>
                          </button>
                        </span>
                      </span>
                      <span class="file-card-name" title="${file.name}">${file.name}</span>
                      ${when(
                        () => queue.fileState(file).status === 'uploading',
                        () => html`
                          <ore-progress
                            type="linear"
                            size="sm"
                            :value=${() => queue.uploadPercent(file)}
                            label=${() => `${queue.uploadPercent(file)}%`}></ore-progress>
                          <span class="file-progress-meta">${() => queue.uploadMetaText(file)}</span>
                        `,
                      )}
                      ${when(
                        () => queue.fileState(file).status === 'error',
                        () => html`<span class="file-error-text">${() => queue.fileState(file).error}</span>`,
                      )}
                    </li>
                  `
                : html`
                    <li class="file-item" data-status=${() => queue.fileState(file).status}>
                      <span class="file-icon" aria-hidden="true">
                        <ore-icon
                          name=${() => queue.statusIconName(file)}
                          size="18"
                          stroke-width="1.75"
                          aria-hidden="true"></ore-icon>
                      </span>
                      <span class="file-meta">
                        <span class="file-name" title="${file.name}">${file.name}</span>
                        ${when(
                          () => queue.fileState(file).status === 'uploading',
                          () => html`
                            <ore-progress
                              type="linear"
                              size="sm"
                              :value=${() => queue.uploadPercent(file)}
                              label=${() => `${queue.uploadPercent(file)}%`}></ore-progress>
                            <span class="file-progress-meta">${() => queue.uploadMetaText(file)}</span>
                          `,
                        )}
                        ${when(
                          () => queue.fileState(file).status === 'error',
                          () => html`<span class="file-error-text">${() => queue.fileState(file).error}</span>`,
                        )}
                        ${when(
                          () => queue.fileState(file).status === 'idle' || queue.fileState(file).status === 'success',
                          () => html`<span class="file-size">${formatBytes(file.size)}</span>`,
                        )}
                      </span>
                      <span class="file-actions">
                        ${when(
                          () => queue.fileState(file).status === 'error',
                          () =>
                            html`<button
                              class="file-action"
                              type="button"
                              aria-label="${`Retry uploading ${file.name}`}"
                              @click=${() => queue.retryUpload(file)}>
                              <ore-icon name="refresh-cw" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
                            </button>`,
                        )}
                        ${when(
                          () =>
                            queue.fileState(file).status === 'success' &&
                            Boolean(props.multiple.value) &&
                            Boolean(props.upload.value),
                          () =>
                            html`<button
                              class="file-action"
                              type="button"
                              aria-label="${`Replace ${file.name}`}"
                              @click=${() => beginReplace(file)}>
                              <ore-icon name="upload" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
                            </button>`,
                        )}
                        <button
                          class="file-remove"
                          type="button"
                          aria-label="${`Remove ${file.name}`}"
                          @click=${(e: Event) => queue.removeFile(file, e)}>
                          <ore-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></ore-icon>
                        </button>
                      </span>
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
    ...fieldMixins,
    sizeVariantMixin(FILE_INPUT_SIZE_PRESET),
    forcedColorsFocusMixin('.dropzone'),
    componentStyles,
  ],
});
