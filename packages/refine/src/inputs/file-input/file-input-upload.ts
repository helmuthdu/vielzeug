import { matchesAccept } from '@vielzeug/dnd';
import { type Readable, signal } from '@vielzeug/ripple';
import { watch } from '@vielzeug/ripple/watch';

import { announce } from '../../core';

// ── Byte/speed formatting ────────────────────────────────────────────────────

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const isFileSizeAllowed = (file: File, maxSize: number): boolean => !maxSize || file.size <= maxSize;

const formatSpeed = (bytesPerSecond: number): string => (bytesPerSecond > 0 ? `${formatBytes(bytesPerSecond)}/s` : '');

const parseAccept = (accept: string | undefined): string[] => (accept ? accept.split(',').map((t) => t.trim()) : []);

// ── Upload lifecycle types ───────────────────────────────────────────────────

/** Upload lifecycle status for a single file. `idle` covers both "no `upload` handler wired up"
 * (picker-only mode, fully supported) and "not started yet". */
export type FileUploadStatus = 'error' | 'idle' | 'success' | 'uploading';

/** Per-file upload snapshot. One reactive signal per file — see `createFileQueue` — not one
 * signal holding a map, so a progress tick for one file never invalidates another's bindings. */
export type FileUploadState = {
  error: string | null;
  loaded: number;
  speedBps: number;
  status: FileUploadStatus;
  total: number;
};

const IDLE_UPLOAD_STATE: Omit<FileUploadState, 'total'> = { error: null, loaded: 0, speedBps: 0, status: 'idle' };

const formatEta = (state: FileUploadState): string => {
  if (state.speedBps <= 0 || state.status !== 'uploading') return '';

  const remainingSeconds = Math.max(0, Math.round((state.total - state.loaded) / state.speedBps));

  if (remainingSeconds < 60) return `${remainingSeconds}s left`;

  return `${Math.round(remainingSeconds / 60)}m left`;
};

/**
 * Consumer-supplied transport — this component has no built-in network layer (zero-dependency,
 * transport-agnostic by design, same reasoning as `courier`'s own fetch-wrapping-only stance).
 * This function is the seam between the UI's upload lifecycle (progress, retry, per-file
 * isolation) and however the app actually moves bytes (`fetch`, `XMLHttpRequest`, a presigned S3
 * PUT, `@vielzeug/courier`, …).
 *
 * `resumeFrom` is a *hint*, not a guarantee: it's the byte offset the component last observed
 * via `onProgress` before the previous attempt failed (0 on a fresh upload). A transport that
 * supports byte ranges (e.g. an HTTP `Range`/`Content-Range` header, S3 multipart, tus) can use
 * it to genuinely resume from that point; a plain `fetch(url, { body: file })` can ignore it and
 * simply re-send the whole file — the UI still shows a resumed-from-N-bytes experience either
 * way, since the file itself was never dropped from memory.
 */
export type FileUploadFn = (
  file: File,
  ctx: { onProgress: (loaded: number, total: number) => void; resumeFrom: number; signal: AbortSignal },
) => Promise<void>;

// ── Queue ─────────────────────────────────────────────────────────────────────

export type FileQueueOptions = {
  accept: Readable<string | undefined>;
  disabled: Readable<boolean>;
  maxFiles: Readable<number>;
  maxSize: Readable<number>;
  multiple: Readable<boolean>;
  onChange: (files: File[], originalEvent?: Event) => void;
  onRemove: (file: File, files: File[], originalEvent?: Event) => void;
  onUploadError: (file: File, error: unknown) => void;
  onUploadProgress: (file: File, loaded: number, total: number) => void;
  onUploadSuccess: (file: File) => void;
  upload: Readable<FileUploadFn | undefined>;
};

export type FileQueue = {
  addFiles(newFiles: File[], originalEvent?: Event): void;
  dispose(): void;
  readonly files: Readable<File[]>;
  fileState(file: File): FileUploadState;
  removeFile(file: File, originalEvent?: Event): void;
  /** Validates `newFile` (accept/max-size) and, if accepted, swaps it in for `oldFile` in place
   * and starts its upload. Returns whether the replacement was accepted. Also fires `onRemove`
   * for `oldFile` — a replace is a removal-and-add that happen to land in the same slot, and a
   * consumer listening only for removal (e.g. to clean up a server-side record) still needs to
   * hear that the old file is gone. */
  replaceFile(oldFile: File, newFile: File, originalEvent?: Event): boolean;
  retryUpload(file: File): void;
  statusIconName(file: File): string;
  uploadMetaText(file: File): string;
  uploadPercent(file: File): number;
};

/**
 * Owns file selection *and* the opt-in upload lifecycle together — they were never really
 * separable (adding a file starts its upload; removing one must abort it; replacing one is both
 * at once). Independent of `html`/rendering, following the same shape as `datagrid`'s
 * `createDataGridControls` and `combobox`'s `combobox-options.ts`: a factory `file-input.ts`
 * wires into drag/drop/native-input events and the template, directly unit-testable without
 * mounting a component.
 *
 * Every file-level rule (accept, max-size, max-files, disabled) and every upload-lifecycle rule
 * (progress, retry-from-offset, per-file isolation) lives here in one place.
 */
export function createFileQueue(options: FileQueueOptions): FileQueue {
  const files = signal<File[]>([]);
  const stateSignals = new Map<File, ReturnType<typeof signal<FileUploadState>>>();
  const controllers = new Map<File, AbortController>();

  function stateSignal(file: File): ReturnType<typeof signal<FileUploadState>> {
    let s = stateSignals.get(file);

    if (!s) {
      s = signal<FileUploadState>({ ...IDLE_UPLOAD_STATE, total: file.size });
      stateSignals.set(file, s);
    }

    return s;
  }

  function fileState(file: File): FileUploadState {
    return stateSignal(file).value;
  }

  function patchState(file: File, patch: Partial<FileUploadState>): void {
    const s = stateSignal(file);

    s.value = { ...s.value, ...patch };
  }

  // Each file gets its own `AbortController` and its own promise chain — nothing here `await`s
  // another file's upload, so one file's rejection can never block, freeze, or cancel the others.
  function startUpload(file: File, resumeFrom = 0): void {
    if (options.disabled.value) return;

    const uploadFn = options.upload.value;

    if (!uploadFn) return;

    controllers.get(file)?.abort();

    const controller = new AbortController();

    controllers.set(file, controller);
    patchState(file, { error: null, loaded: resumeFrom, speedBps: 0, status: 'uploading', total: file.size });

    // Rolling (exponential-moving-average) speed estimate rather than a naive
    // `loaded / elapsedSinceStart` average — the latter drags heavily behind the file's actual
    // *current* rate right after a slow start or a mid-transfer stall.
    let lastSampleAt = performance.now();
    let lastSampleLoaded = resumeFrom;

    uploadFn(file, {
      onProgress: (loaded, total) => {
        if (controller.signal.aborted) return;

        const now = performance.now();
        const elapsedSeconds = (now - lastSampleAt) / 1000;
        const instantBps = elapsedSeconds > 0 ? Math.max(0, (loaded - lastSampleLoaded) / elapsedSeconds) : 0;
        const previousBps = fileState(file).speedBps;
        const speedBps = previousBps > 0 ? previousBps * 0.7 + instantBps * 0.3 : instantBps;

        lastSampleAt = now;
        lastSampleLoaded = loaded;
        patchState(file, { loaded, speedBps, total: total || file.size });
        options.onUploadProgress(file, loaded, total || file.size);
      },
      resumeFrom,
      signal: controller.signal,
    })
      .then(() => {
        if (controller.signal.aborted) return;

        patchState(file, { loaded: file.size, speedBps: 0, status: 'success' });
        announce(`${file.name} uploaded successfully.`);
        options.onUploadSuccess(file);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        const message = error instanceof Error ? error.message : String(error);

        patchState(file, { error: message, speedBps: 0, status: 'error' });
        announce(`${file.name} failed to upload: ${message}`, { politeness: 'assertive' });
        options.onUploadError(file, error);
      });
  }

  // Resumes from the last byte offset this file actually reached, not from 0 — see
  // `FileUploadFn`'s doc comment on what "resume" honestly means when the transport is
  // consumer-supplied.
  function retryUpload(file: File): void {
    if (options.disabled.value) return;

    startUpload(file, fileState(file).loaded);
  }

  // Aborts + drops upload state for any file no longer in `files` — covers plain removal, a
  // non-`multiple` selection replacing the previous file, and `replaceFile()` swapping one File
  // for another. One cleanup path instead of duplicating it at every call site that can shrink
  // `files`.
  function dropOrphanedState(activeFiles: File[]): void {
    const keep = new Set(activeFiles);

    for (const file of stateSignals.keys()) {
      if (keep.has(file)) continue;

      controllers.get(file)?.abort();
      controllers.delete(file);
      stateSignals.delete(file);
    }
  }

  const filesWatch = watch(files, dropOrphanedState);

  function addFiles(newFiles: File[], originalEvent?: Event): void {
    if (options.disabled.value) return;

    const isMultiple = options.multiple.value;
    let incoming = Array.from(newFiles);

    if (!isMultiple) incoming = incoming.slice(0, 1);

    const acceptList = parseAccept(options.accept.value);
    const maxSize = options.maxSize.value;

    incoming = incoming.filter((f) => matchesAccept(f, acceptList) && isFileSizeAllowed(f, maxSize));

    let updated: File[] = isMultiple ? [...files.value] : [];
    const added: File[] = [];

    for (const f of incoming) {
      if (!updated.includes(f)) {
        updated.push(f);
        added.push(f);
      }
    }

    const maxFiles = options.maxFiles.value;

    if (maxFiles > 0 && updated.length > maxFiles) updated = updated.slice(0, maxFiles);

    files.value = updated;
    options.onChange(files.value, originalEvent);

    for (const f of added) {
      if (files.value.includes(f)) startUpload(f);
    }
  }

  function removeFile(file: File, originalEvent?: Event): void {
    if (options.disabled.value) return;

    files.value = files.value.filter((f) => f !== file);
    options.onRemove(file, files.value, originalEvent);
    options.onChange(files.value, originalEvent);
  }

  function replaceFile(oldFile: File, newFile: File, originalEvent?: Event): boolean {
    if (options.disabled.value) return false;

    const acceptList = parseAccept(options.accept.value);

    if (!matchesAccept(newFile, acceptList) || !isFileSizeAllowed(newFile, options.maxSize.value)) return false;

    files.value = files.value.map((f) => (f === oldFile ? newFile : f));
    options.onRemove(oldFile, files.value, originalEvent);
    options.onChange(files.value, originalEvent);
    startUpload(newFile);

    return true;
  }

  function uploadPercent(file: File): number {
    const state = fileState(file);

    if (state.total <= 0) return 0;

    return Math.min(100, Math.round((state.loaded / state.total) * 100));
  }

  // Speed + ETA on one line — percent itself is rendered separately (e.g. `<ore-progress>`'s
  // own `label`), so this only needs the two metrics that wouldn't otherwise fit there.
  function uploadMetaText(file: File): string {
    const state = fileState(file);

    return [formatSpeed(state.speedBps), formatEta(state)].filter(Boolean).join(' · ');
  }

  function statusIconName(file: File): string {
    const status = fileState(file).status;

    if (status === 'success') return 'check';

    if (status === 'error') return 'alert-circle';

    return 'file';
  }

  function dispose(): void {
    filesWatch.dispose();

    for (const controller of controllers.values()) controller.abort();

    controllers.clear();
    stateSignals.clear();
  }

  return {
    addFiles,
    dispose,
    files,
    fileState,
    removeFile,
    replaceFile,
    retryUpload,
    statusIconName,
    uploadMetaText,
    uploadPercent,
  };
}
