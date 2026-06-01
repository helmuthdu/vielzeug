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
});

describe('createDropZone', () => {
  describe('basic drop', () => {
    it('collects all files when no accept filter is set', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });
      const file = new File(['hello'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      expect(zone.files).toEqual([file]);
      expect(zone.rejected).toEqual([]);

      zone.destroy();
    });

    it('separates accepted and rejected files by accept filter', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onDropRejected = vi.fn();
      const accepted = new File(['hello'], 'a.txt', { type: 'text/plain' });
      const rejected = new File(['img'], 'a.png', { type: 'image/png' });
      const zone = createDropZone({ accept: ['text/plain'], element, onDrop, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [accepted, rejected] }));

      expect(zone.files).toEqual([accepted]);
      expect(zone.rejected).toEqual([rejected]);
      expect(onDrop).toHaveBeenCalledWith([accepted], expect.any(Event));
      expect(onDropRejected).toHaveBeenCalledWith([rejected], expect.any(Event));

      zone.destroy();
    });

    it('does not call onDrop when all files are rejected', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ accept: ['image/*'], element, onDrop });
      const file = new File(['hello'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      expect(onDrop).not.toHaveBeenCalled();

      zone.destroy();
    });

    it('does not call onDropRejected when all files are accepted', () => {
      const element = document.createElement('div');
      const onDropRejected = vi.fn();
      const zone = createDropZone({ accept: ['image/*'], element, onDropRejected });
      const file = new File(['img'], 'a.png', { type: 'image/png' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      expect(onDropRejected).not.toHaveBeenCalled();

      zone.destroy();
    });

    it('matches file extensions case-insensitively', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ accept: ['.PDF'], element });
      const file = new File(['doc'], 'report.pdf', { type: 'application/pdf' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      expect(zone.files).toEqual([file]);

      zone.destroy();
    });

    it('matches MIME wildcards', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ accept: ['image/*'], element });
      const png = new File(['img'], 'a.png', { type: 'image/png' });
      const jpg = new File(['img'], 'b.jpg', { type: 'image/jpeg' });

      element.dispatchEvent(makeDragEvent('drop', { files: [png, jpg] }));

      expect(zone.files).toEqual([png, jpg]);

      zone.destroy();
    });
  });

  describe('maxFiles', () => {
    it('moves excess accepted files to rejected', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onDropRejected = vi.fn();
      const f1 = new File(['a'], '1.txt', { type: 'text/plain' });
      const f2 = new File(['b'], '2.txt', { type: 'text/plain' });
      const f3 = new File(['c'], '3.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, maxFiles: 2, onDrop, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [f1, f2, f3] }));

      expect(onDrop).toHaveBeenCalledWith([f1, f2], expect.any(Event));
      expect(onDropRejected).toHaveBeenCalledWith([f3], expect.any(Event));

      zone.destroy();
    });

    it('combines type-rejected and maxFiles-excess in the same rejection callback', () => {
      const element = document.createElement('div');
      const onDropRejected = vi.fn();
      const img1 = new File(['a'], '1.png', { type: 'image/png' });
      const img2 = new File(['b'], '2.png', { type: 'image/png' });
      const img3 = new File(['c'], '3.png', { type: 'image/png' });
      const text = new File(['d'], '4.txt', { type: 'text/plain' });
      // accept filter: image only; maxFiles: 2 → img1+img2 accepted, img3+text rejected
      const zone = createDropZone({ accept: ['image/*'], element, maxFiles: 2, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [img1, img2, img3, text] }));

      // text rejected by type filter first, then img3 rejected by maxFiles
      const [rejectedFiles] = onDropRejected.mock.calls[0] as [File[]];

      expect(rejectedFiles).toContain(img3);
      expect(rejectedFiles).toContain(text);

      zone.destroy();
    });

    it('accepts all when count is within limit', () => {
      const element = document.createElement('div');
      const onDropRejected = vi.fn();
      const f1 = new File(['a'], '1.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, maxFiles: 5, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [f1] }));

      expect(onDropRejected).not.toHaveBeenCalled();

      zone.destroy();
    });

    it('rejects all files when maxFiles is 0', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onDropRejected = vi.fn();
      const f1 = new File(['a'], '1.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, maxFiles: 0, onDrop, onDropRejected });

      element.dispatchEvent(makeDragEvent('drop', { files: [f1] }));

      expect(onDrop).not.toHaveBeenCalled();
      expect(onDropRejected).toHaveBeenCalledWith([f1], expect.any(Event));

      zone.destroy();
    });
  });

  describe('reactive accept getter', () => {
    it('re-evaluates accept at each drop', () => {
      const element = document.createElement('div');
      let accept = ['image/*'];
      const zone = createDropZone({ accept: () => accept, element });
      const image = new File(['img'], 'x.png', { type: 'image/png' });
      const text = new File(['txt'], 'x.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [image, text] }));

      expect(zone.files).toEqual([image]);
      expect(zone.rejected).toEqual([text]);

      accept = ['text/plain'];
      element.dispatchEvent(makeDragEvent('drop', { files: [image, text] }));

      expect(zone.files).toEqual([text]);
      expect(zone.rejected).toEqual([image]);

      zone.destroy();
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

      zone.destroy();
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

      zone.destroy();
    });

    it('keeps hover false when drag payload is rejected by accept filter', () => {
      const element = document.createElement('div');
      const zone = createDropZone({
        accept: ['image/*'],
        element,
      });

      element.dispatchEvent(makeDragEvent('dragenter', { items: [{ kind: 'file', type: 'text/plain' }] }));

      expect(zone.hovered).toBe(false);

      zone.destroy();
    });

    it('resets hover state on window dragend', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ element });

      element.dispatchEvent(makeDragEvent('dragenter'));

      expect(zone.hovered).toBe(true);

      window.dispatchEvent(new Event('dragend'));

      expect(zone.hovered).toBe(false);

      zone.destroy();
    });

    it('does not leave hover stuck when disabled transitions true after dragenter', () => {
      const element = document.createElement('div');
      let isDisabled = false;
      const zone = createDropZone({ disabled: () => isDisabled, element });

      element.dispatchEvent(makeDragEvent('dragenter'));

      expect(zone.hovered).toBe(true);

      isDisabled = true;

      // dragleave fires while disabled — counter must still decrement
      element.dispatchEvent(makeDragEvent('dragleave'));

      expect(zone.hovered).toBe(false);

      zone.destroy();
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

      zone.destroy();
    });

    it('ignores drag events when disabled: true', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onHoverChange = vi.fn();
      const zone = createDropZone({ disabled: true, element, onDrop, onHoverChange });

      element.dispatchEvent(makeDragEvent('dragenter'));
      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt', { type: 'text/plain' })] }));

      expect(zone.hovered).toBe(false);
      expect(onHoverChange).not.toHaveBeenCalled();
      expect(onDrop).not.toHaveBeenCalled();

      zone.destroy();
    });

    it('ignores drag events when disabled getter returns true', () => {
      const element = document.createElement('div');
      let isDisabled = true;
      const onDrop = vi.fn();
      const zone = createDropZone({ disabled: () => isDisabled, element, onDrop });

      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt')] }));

      expect(onDrop).not.toHaveBeenCalled();

      isDisabled = false;
      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt')] }));

      expect(onDrop).toHaveBeenCalledTimes(1);

      zone.destroy();
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

      zone.destroy();
    });
  });

  describe('cleanup', () => {
    it('removes listeners and resets state on destroy', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const onHoverChange = vi.fn();
      const zone = createDropZone({ element, onDrop, onHoverChange });

      // Establish hover state
      element.dispatchEvent(makeDragEvent('dragenter'));

      expect(zone.hovered).toBe(true);

      zone.destroy();

      // After destroy, events should have no effect
      element.dispatchEvent(makeDragEvent('dragenter'));
      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt')] }));

      // onHoverChange was called during dragenter before destroy, but not after
      const callsBefore = onHoverChange.mock.calls.length;
      const dropCallsBefore = onDrop.mock.calls.length;

      element.dispatchEvent(makeDragEvent('dragenter'));
      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt')] }));

      expect(onHoverChange.mock.calls.length).toBe(callsBefore);
      expect(onDrop.mock.calls.length).toBe(dropCallsBefore);
    });

    it('supports using keyword via [Symbol.dispose]', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();

      {
        createDropZone({ element, onDrop });
      }

      element.dispatchEvent(makeDragEvent('drop', { files: [new File([''], 'a.txt')] }));

      expect(onDrop).not.toHaveBeenCalled();
    });
  });

  describe('paste', () => {
    it('fires onPaste with accepted files when paste: true', () => {
      const element = document.createElement('div');
      const onPaste = vi.fn();
      const file = new File(['data'], 'a.png', { type: 'image/png' });
      const zone = createDropZone({ accept: ['image/*'], element, onPaste, paste: true });

      window.dispatchEvent(makeClipboardEvent([file]));

      expect(onPaste).toHaveBeenCalledWith([file], expect.any(Event));

      zone.destroy();
    });

    it('falls back to onDrop when onPaste is not provided', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const file = new File(['data'], 'a.txt', { type: 'text/plain' });
      const zone = createDropZone({ element, onDrop, paste: true });

      window.dispatchEvent(makeClipboardEvent([file]));

      expect(onDrop).toHaveBeenCalledWith([file], expect.any(Event));

      zone.destroy();
    });

    it('filters pasted files by accept list', () => {
      const element = document.createElement('div');
      const onPaste = vi.fn();
      const onDropRejected = vi.fn();
      const img = new File(['img'], 'a.png', { type: 'image/png' });
      const txt = new File(['txt'], 'b.txt', { type: 'text/plain' });
      const zone = createDropZone({ accept: ['image/*'], element, onDropRejected, onPaste, paste: true });

      window.dispatchEvent(makeClipboardEvent([img, txt]));

      expect(onPaste).toHaveBeenCalledWith([img], expect.any(Event));
      expect(onDropRejected).toHaveBeenCalledWith([txt], expect.any(Event));

      zone.destroy();
    });

    it('ignores paste events when paste: false (default)', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ element, onDrop });

      window.dispatchEvent(makeClipboardEvent([new File([''], 'a.txt')]));

      expect(onDrop).not.toHaveBeenCalled();

      zone.destroy();
    });

    it('ignores paste events when disabled', () => {
      const element = document.createElement('div');
      const onPaste = vi.fn();
      const zone = createDropZone({ disabled: true, element, onPaste, paste: true });

      window.dispatchEvent(makeClipboardEvent([new File([''], 'a.txt')]));

      expect(onPaste).not.toHaveBeenCalled();

      zone.destroy();
    });

    it('removes paste listener on destroy', () => {
      const element = document.createElement('div');
      const onPaste = vi.fn();
      const zone = createDropZone({ element, onPaste, paste: true });

      zone.destroy();
      window.dispatchEvent(makeClipboardEvent([new File([''], 'a.txt')]));

      expect(onPaste).not.toHaveBeenCalled();
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

      expect(onDrop).toHaveBeenCalledWith([file], expect.any(Event));

      zone.destroy();
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
      expect(onDropRejected).toHaveBeenCalledWith([file], expect.any(Event));

      zone.destroy();
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

      zone.destroy();
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

      expect(onDropRejected).toHaveBeenCalledWith([file], expect.any(Event));

      zone.destroy();
    });

    it('skips onValidate when all files are already rejected by type filter', async () => {
      const element = document.createElement('div');
      const onValidate = vi.fn();
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });
      const zone = createDropZone({ accept: ['image/*'], element, onValidate });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      await Promise.resolve();

      expect(onValidate).not.toHaveBeenCalled();

      zone.destroy();
    });

    it('works synchronously when onValidate returns a boolean', () => {
      const element = document.createElement('div');
      const onDrop = vi.fn();
      const zone = createDropZone({ element, onDrop, onValidate: () => true });
      const file = new File(['a'], 'a.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [file] }));

      expect(onDrop).toHaveBeenCalledWith([file], expect.any(Event));

      zone.destroy();
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

      expect(onPaste).toHaveBeenCalledWith([file], expect.any(Event));
      expect(zone.validating).toBe(false);

      zone.destroy();
      element.remove();
    });
  });

  describe('state after destroy', () => {
    it('zone.files and zone.rejected retain last values after destroy', () => {
      const element = document.createElement('div');
      const zone = createDropZone({ accept: ['image/*'], element });
      const accepted = new File(['img'], 'a.png', { type: 'image/png' });
      const rejected = new File(['txt'], 'b.txt', { type: 'text/plain' });

      element.dispatchEvent(makeDragEvent('drop', { files: [accepted, rejected] }));

      expect(zone.files).toEqual([accepted]);
      expect(zone.rejected).toEqual([rejected]);

      zone.destroy();

      expect(zone.files).toEqual([accepted]);
      expect(zone.rejected).toEqual([rejected]);
    });
  });

  describe('reactive accept at dragenter time', () => {
    it('evaluates accept getter on first dragenter of each drag', () => {
      const element = document.createElement('div');
      let accept = ['image/*'];
      const onHoverChange = vi.fn();
      const zone = createDropZone({ accept: () => accept, element, onHoverChange });

      element.dispatchEvent(makeDragEvent('dragenter', { items: [{ kind: 'file', type: 'image/png' }] }));
      expect(zone.hovered).toBe(true);

      element.dispatchEvent(makeDragEvent('dragleave'));
      expect(zone.hovered).toBe(false);

      accept = ['text/plain'];
      element.dispatchEvent(makeDragEvent('dragenter', { items: [{ kind: 'file', type: 'image/png' }] }));
      expect(zone.hovered).toBe(false);

      zone.destroy();
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

      zone.destroy();
    });
  });
});
