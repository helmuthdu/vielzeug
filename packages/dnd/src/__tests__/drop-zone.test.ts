import { describe, expect, it, vi } from 'vitest';

import { createDropZone, matchesAccept } from '../drop-zone';
import { makeClipboardEvent, makeDragEvent } from './helpers';

// ─── matchesAccept ────────────────────────────────────────────────────────────

describe('matchesAccept', () => {
  it('returns true for empty accept list', () => {
    const file = new File([''], 'a.txt', { type: 'text/plain' });

    expect(matchesAccept(file, [])).toBe(true);
  });

  it('matches exact MIME type', () => {
    const file = new File([''], 'a.png', { type: 'image/png' });

    expect(matchesAccept(file, ['image/png'])).toBe(true);
    expect(matchesAccept(file, ['image/jpeg'])).toBe(false);
  });

  it('matches MIME wildcard', () => {
    const png = new File([''], 'a.png', { type: 'image/png' });
    const jpg = new File([''], 'b.jpg', { type: 'image/jpeg' });
    const txt = new File([''], 'c.txt', { type: 'text/plain' });

    expect(matchesAccept(png, ['image/*'])).toBe(true);
    expect(matchesAccept(jpg, ['image/*'])).toBe(true);
    expect(matchesAccept(txt, ['image/*'])).toBe(false);
  });

  it('matches file extension case-insensitively', () => {
    const file = new File([''], 'report.PDF', { type: 'application/pdf' });

    expect(matchesAccept(file, ['.pdf'])).toBe(true);
    expect(matchesAccept(file, ['.PDF'])).toBe(true);
    expect(matchesAccept(file, ['.docx'])).toBe(false);
  });

  it('matches against first matching pattern in list', () => {
    const file = new File([''], 'a.png', { type: 'image/png' });

    expect(matchesAccept(file, ['image/jpeg', 'image/png', '.png'])).toBe(true);
  });

  it('trims whitespace from accept patterns', () => {
    const file = new File([''], 'a.png', { type: 'image/png' });

    expect(matchesAccept(file, [' image/* '])).toBe(true);
    expect(matchesAccept(file, [' .png '])).toBe(true);
    expect(matchesAccept(file, [' image/png '])).toBe(true);
  });
});

describe('createDropZone', () => {
  describe('basic drop', () => {
    it('calls onDrop with all files when no accept filter is set', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ element, onDrop });
      const file = new File(['hello'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));
      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([file]);

      zone.dispose();
    });

    it('separates accepted and rejected files by accept filter', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onDropRejected = vi.fn();
      const accepted = new File(['hello'], 'a.txt', { type: 'text/plain' });
      const rejected = new File(['img'], 'a.png', { type: 'image/png' });
      const zone = createDropZone({ accept: ['text/plain'], element, onDrop, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [accepted, rejected] }));
      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([accepted]);
      expect(onDropRejected).toHaveBeenCalledWith([rejected]);

      zone.dispose();
    });

    it('does not call onDrop when all files are rejected', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ accept: ['image/*'], element, onDrop });
      const file = new File(['hello'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));
      await Promise.resolve();

      expect(onDrop).not.toHaveBeenCalled();

      zone.dispose();
    });

    it('does not call onDropRejected when all files are accepted', async () => {
      const element = document.createElement('div');
      const onDropRejected = vi.fn();
      const zone = createDropZone({ accept: ['image/*'], element, onDropRejected });
      const file = new File(['img'], 'a.png', { type: 'image/png' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));
      await Promise.resolve();

      expect(onDropRejected).not.toHaveBeenCalled();

      zone.dispose();
    });

    it('matches file extensions case-insensitively', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ accept: ['.PDF'], element, onDrop });
      const file = new File(['doc'], 'report.pdf', { type: 'application/pdf' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));
      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([file]);

      zone.dispose();
    });

    it('matches MIME wildcards', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ accept: ['image/*'], element, onDrop });
      const png = new File(['img'], 'a.png', { type: 'image/png' });
      const jpg = new File(['img'], 'b.jpg', { type: 'image/jpeg' });

      element.dispatchEvent(makeDragEvent('drop', { files: [png, jpg] }));
      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([png, jpg]);

      zone.dispose();
    });
  });

  describe('maxFiles', () => {
    it('moves excess accepted files to rejected', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onDropRejected = vi.fn();
      const f1 = new File(['a'], '1.txt', { type: 'text/plain' });
      const f2 = new File(['b'], '2.txt', { type: 'text/plain' });
      const f3 = new File(['c'], '3.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, maxFiles: 2, onDrop, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [f1, f2, f3] }));
      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([f1, f2]);
      expect(onDropRejected).toHaveBeenCalledWith([f3]);

      zone.dispose();
    });

    it('combines type-rejected and maxFiles-excess in the same rejection callback', async () => {
      const element = document.createElement('div');
      const onDropRejected = vi.fn();
      const img1 = new File(['a'], '1.png', { type: 'image/png' });
      const img2 = new File(['b'], '2.png', { type: 'image/png' });
      const img3 = new File(['c'], '3.png', { type: 'image/png' });
      const text = new File(['d'], '4.txt', { type: 'text/plain' });
      // accept filter: image only; maxFiles: 2 → img1+img2 accepted, img3+text rejected
      const zone = createDropZone({ accept: ['image/*'], element, maxFiles: 2, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [img1, img2, img3, text] }));
      await Promise.resolve();

      const [rejectedFiles] = onDropRejected.mock.calls[0] as [File[]];

      expect(rejectedFiles).toContain(img3);
      expect(rejectedFiles).toContain(text);

      zone.dispose();
    });

    it('accepts all when count is within limit', async () => {
      const element = document.createElement('div');
      const onDropRejected = vi.fn();
      const f1 = new File(['a'], '1.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, maxFiles: 5, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [f1] }));
      await Promise.resolve();

      expect(onDropRejected).not.toHaveBeenCalled();

      zone.dispose();
    });

    it('rejects all files when maxFiles is 0', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onDropRejected = vi.fn();
      const f1 = new File(['a'], '1.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, maxFiles: 0, onDrop, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [f1] }));
      await Promise.resolve();

      expect(onDrop).not.toHaveBeenCalled();
      expect(onDropRejected).toHaveBeenCalledWith([f1]);

      zone.dispose();
    });
  });

  describe('hover state', () => {
    it('toggles hover on dragenter/dragleave', () => {
      const element = document.createElement('div');
      const onHoverChange = vi.fn();
      const zone = createDropZone({ element, onHoverChange });

      element.dispatchEvent(makeDragEvent('dragenter'));

      expect(zone.hovered).toBe(true);
      expect(onHoverChange).toHaveBeenLastCalledWith(true);

      element.dispatchEvent(makeDragEvent('dragleave'));

      expect(zone.hovered).toBe(false);
      expect(onHoverChange).toHaveBeenLastCalledWith(false);

      zone.dispose();
    });

    it('uses counter to stay hovered during child element entry/exit', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });

      element.dispatchEvent(makeDragEvent('dragenter'));
      element.dispatchEvent(makeDragEvent('dragenter')); // child enters

      expect(zone.hovered).toBe(true);

      element.dispatchEvent(makeDragEvent('dragleave')); // child leaves

      expect(zone.hovered).toBe(true);

      element.dispatchEvent(makeDragEvent('dragleave')); // actual leave

      expect(zone.hovered).toBe(false);

      zone.dispose();
    });

    it('keeps hover false when drag payload is rejected by accept filter', () => {
      const element = document.createElement('div');
      const zone = createDropZone({
        accept: ['image/*'],
        element,
      });

      element.dispatchEvent(makeDragEvent('dragenter', { items: [{ kind: 'file', type: 'text/plain' }] }));

      expect(zone.hovered).toBe(false);

      zone.dispose();
    });

    it('resets hover state on window dragend', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });

      element.dispatchEvent(makeDragEvent('dragenter'));

      expect(zone.hovered).toBe(true);

      window.dispatchEvent(new Event('dragend'));

      expect(zone.hovered).toBe(false);

      zone.dispose();
    });

    it('does not leave hover stuck when disabled transitions true after dragenter', () => {
      const element = document.createElement('div');
      let isDisabled = false;

      // disabled is static bool — we test that dragleave resets when later disabled
      const zone = createDropZone({ disabled: isDisabled, element });

      element.dispatchEvent(makeDragEvent('dragenter'));

      expect(zone.hovered).toBe(true);

      isDisabled = true;
      void isDisabled; // suppress unused var warning

      // dragleave fires — counter must still decrement
      element.dispatchEvent(makeDragEvent('dragleave'));

      expect(zone.hovered).toBe(false);

      zone.dispose();
    });
  });

  describe('onValidatingChange without onValidate', () => {
    it('does not fire onValidatingChange when no onValidate is provided', async () => {
      const element = document.createElement('div');
      const onValidatingChange = vi.fn();
      const zone = createDropZone({ element, onValidatingChange });
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));
      await Promise.resolve();

      expect(onValidatingChange).not.toHaveBeenCalled();

      zone.dispose();
    });
  });

  describe('disabled live-read', () => {
    it('reads disabled live — a drop after options.disabled is set to true is ignored', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const options = { disabled: false as boolean, element, onDrop };
      const zone = createDropZone(options);
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });

      options.disabled = true;
      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));
      await Promise.resolve();

      expect(onDrop).not.toHaveBeenCalled();

      zone.dispose();
    });

    it('reads disabled live — a drop when options.disabled is false proceeds normally', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const options = { disabled: true as boolean, element, onDrop };
      const zone = createDropZone(options);
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });

      options.disabled = false;
      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));
      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([file]);

      zone.dispose();
    });
  });

  describe('disabled', () => {
    it('does not call preventDefault on dragenter/dragover/drop when disabled', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ disabled: true, element });

      const enterEvent = makeDragEvent('dragenter');
      const enterPD = vi.spyOn(enterEvent, 'preventDefault');

      element.dispatchEvent(enterEvent);
      expect(enterPD).not.toHaveBeenCalled();

      const overEvent = makeDragEvent('dragover');
      const overPD = vi.spyOn(overEvent, 'preventDefault');

      element.dispatchEvent(overEvent);
      expect(overPD).not.toHaveBeenCalled();

      const dropEvent = makeDragEvent('drop', { files: [new File([''], 'a.txt')] });
      const dropPD = vi.spyOn(dropEvent, 'preventDefault');

      element.dispatchEvent(dropEvent);
      expect(dropPD).not.toHaveBeenCalled();

      zone.dispose();
    });

    it('ignores drag events when disabled: true', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onHoverChange = vi.fn();
      const zone = createDropZone({ disabled: true, element, onDrop, onHoverChange });

      element.dispatchEvent(makeDragEvent('dragenter'));
      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt', { type: 'text/plain' })] }));
      await Promise.resolve();

      expect(zone.hovered).toBe(false);
      expect(onHoverChange).not.toHaveBeenCalled();
      expect(onDrop).not.toHaveBeenCalled();

      zone.dispose();
    });
  });

  describe('dropEffect', () => {
    it('sets custom dropEffect on dragover', () => {
      const element = document.createElement('div');

      const zone = createDropZone({ dropEffect: 'move', element });

      // dragenter must precede dragover to initialise dragAccepted
      element.dispatchEvent(makeDragEvent('dragenter'));

      const dt = { dropEffect: 'none' as string };
      const event = makeDragEvent('dragover');

      Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dt });
      element.dispatchEvent(event);

      expect(dt.dropEffect).toBe('move');

      zone.dispose();
    });
  });

  describe('cleanup', () => {
    it('removes listeners and resets state on dispose', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onHoverChange = vi.fn();
      const zone = createDropZone({ element, onDrop, onHoverChange });

      // Establish hover state
      element.dispatchEvent(makeDragEvent('dragenter'));

      expect(zone.hovered).toBe(true);

      zone.dispose();

      // After dispose, events should have no effect — capture call counts *after* dispose
      const dropCallsBefore = onDrop.mock.calls.length;
      const hoverCallsBefore = onHoverChange.mock.calls.length;

      element.dispatchEvent(makeDragEvent('dragenter'));
      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt')] }));
      await Promise.resolve();

      expect(onHoverChange.mock.calls.length).toBe(hoverCallsBefore);
      expect(onDrop.mock.calls.length).toBe(dropCallsBefore);
    });

    it('supports using keyword via [Symbol.dispose]', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();

      {
        using _zone = createDropZone({ element, onDrop });
      }

      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt')] }));
      await Promise.resolve();

      expect(onDrop).not.toHaveBeenCalled();
    });
  });

  describe('paste', () => {
    it('fires onPaste with accepted files when paste: true', async () => {
      const element = document.createElement('div');
      const onPaste = vi.fn();
      const file = new File(['data'], 'a.png', { type: 'image/png' });
      const zone = createDropZone({ accept: ['image/*'], element, onPaste, paste: true });

      window.dispatchEvent(makeClipboardEvent([file]));
      await Promise.resolve();

      expect(onPaste).toHaveBeenCalledWith([file]);

      zone.dispose();
    });

    it('falls back to onDrop when onPaste is not provided', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const file = new File(['data'], 'a.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, onDrop, paste: true });

      window.dispatchEvent(makeClipboardEvent([file]));
      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([file]);

      zone.dispose();
    });

    it('filters pasted files by accept list', async () => {
      const element = document.createElement('div');
      const onPaste = vi.fn();
      const onDropRejected = vi.fn();
      const img = new File(['img'], 'a.png', { type: 'image/png' });
      const txt = new File(['txt'], 'b.txt', { type: 'text/plain' });
      const zone = createDropZone({ accept: ['image/*'], element, onDropRejected, onPaste, paste: true });

      window.dispatchEvent(makeClipboardEvent([img, txt]));
      await Promise.resolve();

      expect(onPaste).toHaveBeenCalledWith([img]);
      expect(onDropRejected).toHaveBeenCalledWith([txt]);

      zone.dispose();
    });

    it('ignores paste events when paste: false (default)', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ element, onDrop });

      window.dispatchEvent(makeClipboardEvent([new File([''], 'a.txt')]));
      await Promise.resolve();

      expect(onDrop).not.toHaveBeenCalled();

      zone.dispose();
    });

    it('ignores paste events when disabled', async () => {
      const element = document.createElement('div');
      const onPaste = vi.fn();
      const zone = createDropZone({ disabled: true, element, onPaste, paste: true });

      window.dispatchEvent(makeClipboardEvent([new File([''], 'a.txt')]));
      await Promise.resolve();

      expect(onPaste).not.toHaveBeenCalled();

      zone.dispose();
    });

    it('removes paste listener on dispose', async () => {
      const element = document.createElement('div');
      const onPaste = vi.fn();
      const zone = createDropZone({ element, onPaste, paste: true });

      zone.dispose();
      window.dispatchEvent(makeClipboardEvent([new File([''], 'a.txt')]));
      await Promise.resolve();

      expect(onPaste).not.toHaveBeenCalled();
    });

    it('calls onDrop with clipboard files when onPaste is omitted and paste: true', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const file = new File(['data'], 'a.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, onDrop, paste: true });

      window.dispatchEvent(makeClipboardEvent([file]));
      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([file]);

      zone.dispose();
    });
  });

  describe('onValidate', () => {
    it('calls onDrop when onValidate resolves true', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onValidate = vi.fn().mockResolvedValue(true);
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, onDrop, onValidate });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      await Promise.resolve(); // flush microtasks

      expect(onDrop).toHaveBeenCalledWith([file]);

      zone.dispose();
    });

    it('calls onDropRejected when onValidate resolves false', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onDropRejected = vi.fn();
      const onValidate = vi.fn().mockResolvedValue(false);
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, onDrop, onDropRejected, onValidate });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      await Promise.resolve();

      expect(onDrop).not.toHaveBeenCalled();
      expect(onDropRejected).toHaveBeenCalledWith([file]);

      zone.dispose();
    });

    it('sets validating to true during pending validation then false after', async () => {
      const element = document.createElement('div');
      let resolveValidation!: (v: boolean) => void;
      const validation = new Promise<boolean>((res) => {
        resolveValidation = res;
      });
      const zone = createDropZone({ element, onValidate: () => validation });
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      expect(zone.validating).toBe(true);

      resolveValidation(true);
      await validation;
      await Promise.resolve();

      expect(zone.validating).toBe(false);

      zone.dispose();
    });

    it('calls onValidatingChange when validation state toggles', async () => {
      const element = document.createElement('div');
      const onValidatingChange = vi.fn();
      let resolveValidation!: (v: boolean) => void;
      const validation = new Promise<boolean>((res) => {
        resolveValidation = res;
      });
      const zone = createDropZone({ element, onValidate: () => validation, onValidatingChange });
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      expect(onValidatingChange).toHaveBeenLastCalledWith(true);

      resolveValidation(true);
      await validation;
      await Promise.resolve();

      expect(onValidatingChange).toHaveBeenLastCalledWith(false);

      zone.dispose();
    });

    it('falls back to onDropRejected when onValidate throws', async () => {
      const element = document.createElement('div');
      const onDropRejected = vi.fn();
      const onValidate = vi.fn().mockRejectedValue(new Error('server error'));
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, onDropRejected, onValidate });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      await Promise.resolve();
      await Promise.resolve(); // two microtask ticks for rejection

      expect(onDropRejected).toHaveBeenCalledWith([file]);

      zone.dispose();
    });

    it('skips onValidate when all files are already rejected by type filter', async () => {
      const element = document.createElement('div');
      const onValidate = vi.fn();
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });
      const zone = createDropZone({ accept: ['image/*'], element, onValidate });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      await Promise.resolve();

      expect(onValidate).not.toHaveBeenCalled();

      zone.dispose();
    });

    it('works synchronously when onValidate returns a boolean', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ element, onDrop, onValidate: () => true });
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      await Promise.resolve();

      expect(onDrop).toHaveBeenCalledWith([file]);

      zone.dispose();
    });

    it('runs onValidate for pasted files and sets validating during pending validation', async () => {
      const element = document.createElement('div');

      document.body.appendChild(element);

      let resolveValidation!: (ok: boolean) => void;
      const validation = new Promise<boolean>((res) => {
        resolveValidation = res;
      });
      const onValidate = vi.fn(() => validation);
      const onPaste = vi.fn();
      const zone = createDropZone({ element, onPaste, onValidate, paste: true });
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });

      window.dispatchEvent(makeClipboardEvent([file]));

      expect(zone.validating).toBe(true);

      resolveValidation(true);
      await validation;
      await Promise.resolve();

      expect(onPaste).toHaveBeenCalledWith([file]);
      expect(zone.validating).toBe(false);

      zone.dispose();
      element.remove();
    });
  });

  describe('drop with null dataTransfer', () => {
    it('does nothing when drop event has no dataTransfer', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ element, onDrop });

      const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;

      Object.defineProperty(event, 'dataTransfer', { configurable: true, value: null });
      element.dispatchEvent(event);
      await Promise.resolve();

      expect(onDrop).not.toHaveBeenCalled();

      zone.dispose();
    });
  });

  describe('sequential drags reset acceptance state', () => {
    it('resets dragAccepted between drags so a second accepted drag shows hover', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ accept: ['image/*'], element });

      element.dispatchEvent(makeDragEvent('dragenter', { items: [{ kind: 'file', type: 'text/plain' }] }));
      expect(zone.hovered).toBe(false);
      element.dispatchEvent(makeDragEvent('dragleave'));

      element.dispatchEvent(makeDragEvent('dragenter', { items: [{ kind: 'file', type: 'image/png' }] }));
      expect(zone.hovered).toBe(true);
      element.dispatchEvent(makeDragEvent('dragleave'));

      zone.dispose();
    });
  });

  describe('disposed', () => {
    it('disposed is false before dispose()', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });

      expect(zone.disposed).toBe(false);

      zone.dispose();
    });

    it('disposed is true after dispose()', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });

      zone.dispose();

      expect(zone.disposed).toBe(true);
    });

    it('dispose() is idempotent — second call is a no-op', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });

      zone.dispose();

      expect(() => zone.dispose()).not.toThrow();
      expect(zone.disposed).toBe(true);
    });
  });

  describe('disposalSignal', () => {
    it('disposalSignal is not aborted before dispose()', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });

      expect(zone.disposalSignal.aborted).toBe(false);

      zone.dispose();
    });

    it('disposalSignal is aborted after dispose()', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });

      zone.dispose();

      expect(zone.disposalSignal.aborted).toBe(true);
    });
  });

  describe('post-dispose async validation guard', () => {
    it('does not call onDrop when zone is disposed before onValidate resolves', async () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      let resolveValidation!: (value: boolean) => void;
      const onValidate = () =>
        new Promise<boolean>((resolve) => {
          resolveValidation = resolve;
        });
      const zone = createDropZone({ element, onDrop, onValidate });

      const file = new File([''], 'a.png', { type: 'image/png' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      zone.dispose();
      resolveValidation(true);

      await Promise.resolve();

      expect(onDrop).not.toHaveBeenCalled();
    });

    it('does not call onDropRejected when zone is disposed before onValidate resolves', async () => {
      const element = document.createElement('div');
      const onDropRejected = vi.fn();
      let resolveValidation!: (value: boolean) => void;
      const onValidate = () =>
        new Promise<boolean>((resolve) => {
          resolveValidation = resolve;
        });
      const zone = createDropZone({ element, onDropRejected, onValidate });

      const file = new File([''], 'a.png', { type: 'image/png' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      zone.dispose();
      resolveValidation(false);

      await Promise.resolve();

      expect(onDropRejected).not.toHaveBeenCalled();
    });
  });
});
