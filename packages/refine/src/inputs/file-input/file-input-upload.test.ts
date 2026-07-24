import { signal } from '@vielzeug/ripple';

import { createFileQueue, type FileQueueOptions, type FileUploadFn } from './file-input-upload';

function makeQueue(overrides: Partial<FileQueueOptions> = {}) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const onUploadError = vi.fn();
  const onUploadProgress = vi.fn();
  const onUploadSuccess = vi.fn();

  const queue = createFileQueue({
    accept: signal<string | undefined>(undefined),
    disabled: signal(false),
    maxFiles: signal(0),
    maxSize: signal(0),
    multiple: signal(true),
    onChange,
    onRemove,
    onUploadError,
    onUploadProgress,
    onUploadSuccess,
    upload: signal<FileUploadFn | undefined>(undefined),
    ...overrides,
  });

  return { onChange, onRemove, onUploadError, onUploadProgress, onUploadSuccess, queue };
}

const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('createFileQueue', () => {
  describe('addFiles', () => {
    it('adds accepted files and calls onChange', () => {
      const { onChange, queue } = makeQueue();
      const file = new File(['x'], 'a.txt', { type: 'text/plain' });

      queue.addFiles([file]);

      expect(queue.files.value).toEqual([file]);
      expect(onChange).toHaveBeenCalledWith([file], undefined);
    });

    it('filters out files that fail the accept list', () => {
      const { queue } = makeQueue({ accept: signal('image/*') });
      const file = new File(['x'], 'a.txt', { type: 'text/plain' });

      queue.addFiles([file]);

      expect(queue.files.value).toEqual([]);
    });

    it('filters out files over max-size', () => {
      const { queue } = makeQueue({ maxSize: signal(10) });
      const file = new File(['x'.repeat(100)], 'big.txt', { type: 'text/plain' });

      queue.addFiles([file]);

      expect(queue.files.value).toEqual([]);
    });

    it('keeps only the first file when not multiple', () => {
      const { queue } = makeQueue({ multiple: signal(false) });
      const a = new File(['x'], 'a.txt');
      const b = new File(['x'], 'b.txt');

      queue.addFiles([a]);
      queue.addFiles([b]);

      expect(queue.files.value).toEqual([b]);
    });

    it('caps at max-files', () => {
      const { queue } = makeQueue({ maxFiles: signal(2) });
      const files = [new File(['x'], 'a'), new File(['x'], 'b'), new File(['x'], 'c')];

      queue.addFiles(files);

      expect(queue.files.value).toHaveLength(2);
    });

    it('does nothing while disabled', () => {
      const { onChange, queue } = makeQueue({ disabled: signal(true) });

      queue.addFiles([new File(['x'], 'a.txt')]);

      expect(queue.files.value).toEqual([]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('starts an upload for every newly added file when `upload` is set', () => {
      const upload = vi.fn(() => new Promise<void>(() => {}));
      const { queue } = makeQueue({ upload: signal<FileUploadFn | undefined>(upload) });
      const a = new File(['x'], 'a.txt');
      const b = new File(['x'], 'b.txt');

      queue.addFiles([a, b]);

      expect(upload).toHaveBeenCalledTimes(2);
      expect(queue.fileState(a).status).toBe('uploading');
      expect(queue.fileState(b).status).toBe('uploading');
    });
  });

  describe('removeFile', () => {
    it('removes the file and calls onRemove + onChange', () => {
      const { onChange, onRemove, queue } = makeQueue();
      const file = new File(['x'], 'a.txt');

      queue.addFiles([file]);
      queue.removeFile(file);

      expect(queue.files.value).toEqual([]);
      expect(onRemove).toHaveBeenCalledWith(file, [], undefined);
      expect(onChange).toHaveBeenLastCalledWith([], undefined);
    });

    it('aborts an in-flight upload for the removed file, without affecting others', async () => {
      const upload = vi.fn(
        (_file: File, ctx: { signal: AbortSignal }) =>
          new Promise<void>((_resolve, reject) => {
            ctx.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );
      const { queue } = makeQueue({ upload: signal<FileUploadFn | undefined>(upload) });
      const keep = new File(['x'], 'keep.txt');
      const drop = new File(['x'], 'drop.txt');

      queue.addFiles([keep, drop]);
      queue.removeFile(drop);
      await flush();

      expect(queue.files.value).toEqual([keep]);
      expect(queue.fileState(keep).status).toBe('uploading');
    });

    it('does nothing while disabled', () => {
      const disabled = signal(false);
      const { onRemove, queue } = makeQueue({ disabled });
      const file = new File(['x'], 'a.txt');

      queue.addFiles([file]);
      disabled.value = true;
      queue.removeFile(file);

      expect(queue.files.value).toEqual([file]);
      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('replaceFile', () => {
    it('swaps the file in place, fires onRemove for the old file, and restarts the upload', () => {
      const upload = vi.fn(() => new Promise<void>(() => {}));
      const { onChange, onRemove, queue } = makeQueue({ upload: signal<FileUploadFn | undefined>(upload) });
      const original = new File(['x'], 'a.txt');
      const replacement = new File(['y'], 'a-v2.txt');

      queue.addFiles([original]);

      const accepted = queue.replaceFile(original, replacement);

      expect(accepted).toBe(true);
      expect(queue.files.value).toEqual([replacement]);
      expect(onRemove).toHaveBeenCalledWith(original, [replacement], undefined);
      expect(onChange).toHaveBeenLastCalledWith([replacement], undefined);
      expect(upload).toHaveBeenCalledTimes(2);
      expect(upload).toHaveBeenLastCalledWith(replacement, expect.objectContaining({ resumeFrom: 0 }));
    });

    it('rejects a replacement that fails the accept list, leaving the original file in place', () => {
      const { onChange, queue } = makeQueue({ accept: signal('image/*') });
      const original = new File(['x'], 'a.png', { type: 'image/png' });
      const invalidReplacement = new File(['x'], 'a.txt', { type: 'text/plain' });

      queue.addFiles([original]);
      onChange.mockClear();

      const accepted = queue.replaceFile(original, invalidReplacement);

      expect(accepted).toBe(false);
      expect(queue.files.value).toEqual([original]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('rejects a replacement over max-size, leaving the original file in place', () => {
      const { queue } = makeQueue({ maxSize: signal(10) });
      const original = new File(['x'], 'a.txt');
      const tooBig = new File(['x'.repeat(100)], 'a.txt');

      queue.addFiles([original]);

      expect(queue.replaceFile(original, tooBig)).toBe(false);
      expect(queue.files.value).toEqual([original]);
    });

    it('does nothing while disabled', () => {
      const disabled = signal(false);
      const { queue } = makeQueue({ disabled });
      const original = new File(['x'], 'a.txt');

      queue.addFiles([original]);
      disabled.value = true;

      expect(queue.replaceFile(original, new File(['y'], 'b.txt'))).toBe(false);
      expect(queue.files.value).toEqual([original]);
    });
  });

  describe('retryUpload', () => {
    it('resumes from the last byte offset reached, not from 0', () => {
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

          return new Promise<void>(() => {});
        },
      );
      const { queue } = makeQueue({ upload: signal<FileUploadFn | undefined>(upload) });
      const file = new File(['x'], 'a.txt');

      queue.addFiles([file]);

      return flush().then(() => {
        expect(queue.fileState(file).status).toBe('error');

        queue.retryUpload(file);

        expect(attempt).toBe(2);
        expect(lastResumeFrom).toBe(60);
        expect(queue.fileState(file).status).toBe('uploading');
      });
    });

    it('does nothing while disabled', () => {
      const disabled = signal(false);
      const upload = vi.fn(() => Promise.reject(new Error('boom')));
      const { queue } = makeQueue({ disabled, upload: signal<FileUploadFn | undefined>(upload) });
      const file = new File(['x'], 'a.txt');

      queue.addFiles([file]);

      return flush().then(() => {
        upload.mockClear();
        disabled.value = true;
        queue.retryUpload(file);

        expect(upload).not.toHaveBeenCalled();
      });
    });
  });

  describe('per-file signal isolation (Signal 05)', () => {
    it('one failing upload does not affect another file in the same batch', async () => {
      const upload = vi.fn((file: File) =>
        file.name === 'bad.txt' ? Promise.reject(new Error('boom')) : Promise.resolve(),
      );
      const { queue } = makeQueue({ upload: signal<FileUploadFn | undefined>(upload) });
      const good = new File(['x'], 'good.txt');
      const bad = new File(['x'], 'bad.txt');

      queue.addFiles([good, bad]);
      await flush();

      expect(queue.fileState(good).status).toBe('success');
      expect(queue.fileState(bad).status).toBe('error');
    });

    it('progress on one file leaves another file object reference untouched', () => {
      let onProgressA!: (loaded: number, total: number) => void;
      const upload = vi.fn((file: File, ctx: { onProgress: (loaded: number, total: number) => void }) => {
        if (file.name === 'a.txt') onProgressA = ctx.onProgress;

        return new Promise<void>(() => {});
      });
      const { queue } = makeQueue({ upload: signal<FileUploadFn | undefined>(upload) });
      const a = new File(['x'], 'a.txt');
      const b = new File(['x'], 'b.txt');

      queue.addFiles([a, b]);

      const bStateBefore = queue.fileState(b);

      onProgressA(50, 100);

      expect(queue.fileState(b)).toEqual(bStateBefore);
      expect(queue.uploadPercent(a)).toBe(50);
    });
  });

  describe('dispose', () => {
    it('aborts every in-flight upload', async () => {
      const abortedFiles: string[] = [];
      const upload = vi.fn(
        (file: File, ctx: { signal: AbortSignal }) =>
          new Promise<void>((_resolve, reject) => {
            ctx.signal.addEventListener('abort', () => {
              abortedFiles.push(file.name);
              reject(new Error('aborted'));
            });
          }),
      );
      const { queue } = makeQueue({ upload: signal<FileUploadFn | undefined>(upload) });

      queue.addFiles([new File(['x'], 'a.txt'), new File(['x'], 'b.txt')]);
      queue.dispose();
      await flush();

      expect(abortedFiles.sort()).toEqual(['a.txt', 'b.txt']);
    });
  });
});
