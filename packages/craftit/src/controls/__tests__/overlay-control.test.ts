import { signal } from '@vielzeug/stateit';

import { createOverlayControl } from '../../controls';

describe('createOverlayControl', () => {
  it('opens with programmatic reason by default', () => {
    const openState = signal(false);
    const transitions: Array<{ next: boolean; reason: string }> = [];

    const overlay = createOverlayControl({
      getBoundaryElement: () => document.body,
      isOpen: () => openState.value,
      setOpen: (next, { reason }) => {
        openState.value = next;
        transitions.push({ next, reason });
      },
    });

    overlay.open();

    expect(openState.value).toBe(true);
    expect(transitions).toEqual([{ next: true, reason: 'programmatic' }]);
  });

  it('does not call setOpen when trying to open an already open overlay', () => {
    const openState = signal(true);
    const setOpen = vi.fn();

    const overlay = createOverlayControl({
      getBoundaryElement: () => document.body,
      isOpen: () => openState.value,
      setOpen,
    });

    overlay.open({ reason: 'trigger' });

    expect(setOpen).not.toHaveBeenCalled();
  });

  it('does not call setOpen when trying to close an already closed overlay', () => {
    const openState = signal(false);
    const setOpen = vi.fn();

    const overlay = createOverlayControl({
      getBoundaryElement: () => document.body,
      isOpen: () => openState.value,
      setOpen,
    });

    overlay.close({ reason: 'programmatic' });

    expect(setOpen).not.toHaveBeenCalled();
  });

  it('closes with explicit reason and can skip focus restoration per call', () => {
    const openState = signal(true);
    const other = document.createElement('input');
    const trigger = document.createElement('button');

    document.body.appendChild(trigger);
    document.body.appendChild(other);

    const onClose = vi.fn();
    const overlay = createOverlayControl({
      getBoundaryElement: () => document.body,
      getTriggerElement: () => trigger,
      isOpen: () => openState.value,
      onClose,
      restoreFocus: true,
      setOpen: (next) => {
        openState.value = next;
      },
    });

    other.focus();
    overlay.close({ reason: 'escape', restoreFocus: false });

    expect(openState.value).toBe(false);
    expect(onClose).toHaveBeenCalledWith('escape');
    expect(document.activeElement).toBe(other);

    trigger.remove();
    other.remove();
  });

  it('restores focus to trigger by default on close', () => {
    const openState = signal(true);
    const other = document.createElement('input');
    const trigger = document.createElement('button');

    document.body.appendChild(trigger);
    document.body.appendChild(other);

    const overlay = createOverlayControl({
      getBoundaryElement: () => document.body,
      getTriggerElement: () => trigger,
      isOpen: () => openState.value,
      setOpen: (next) => {
        openState.value = next;
      },
    });

    other.focus();
    overlay.close({ reason: 'programmatic' });

    expect(document.activeElement).toBe(trigger);

    trigger.remove();
    other.remove();
  });

  it('toggle uses trigger reason for both directions', () => {
    const openState = signal(false);
    const reasons: string[] = [];

    const overlay = createOverlayControl({
      getBoundaryElement: () => document.body,
      isOpen: () => openState.value,
      setOpen: (next, { reason }) => {
        openState.value = next;
        reasons.push(reason);
      },
    });

    overlay.toggle();
    overlay.toggle();

    expect(reasons).toEqual(['trigger', 'trigger']);
  });

  it('ignores open when disabled', () => {
    const openState = signal(false);

    const overlay = createOverlayControl({
      getBoundaryElement: () => document.body,
      isDisabled: () => true,
      isOpen: () => openState.value,
      setOpen: (next) => {
        openState.value = next;
      },
    });

    overlay.open({ reason: 'trigger' });

    expect(openState.value).toBe(false);
  });

  it('closes on outside click and keeps open on boundary/panel clicks', () => {
    const openState = signal(false);
    const host = document.createElement('div');
    const insideBoundary = document.createElement('button');
    const insidePanel = document.createElement('button');
    const outside = document.createElement('button');
    const panel = document.createElement('div');

    host.appendChild(insideBoundary);
    panel.appendChild(insidePanel);
    document.body.appendChild(host);
    document.body.appendChild(panel);
    document.body.appendChild(outside);

    const closeReasons: string[] = [];
    const overlay = createOverlayControl({
      getBoundaryElement: () => host,
      getPanelElement: () => panel,
      isOpen: () => openState.value,
      onClose: (reason) => {
        closeReasons.push(reason);
      },
      setOpen: (next) => {
        openState.value = next;
      },
    });

    const cleanup = overlay.bindOutsideClick(document);

    overlay.open({ reason: 'trigger' });
    insideBoundary.click();
    expect(openState.value).toBe(true);

    insidePanel.click();
    expect(openState.value).toBe(true);

    outside.click();
    expect(openState.value).toBe(false);
    expect(closeReasons.at(-1)).toBe('outside-click');

    cleanup();
    host.remove();
    panel.remove();
    outside.remove();
  });

  it('uses event.target fallback when composedPath is unavailable', () => {
    const openState = signal(false);
    const host = document.createElement('div');
    const outside = document.createElement('button');

    document.body.appendChild(host);
    document.body.appendChild(outside);

    const overlay = createOverlayControl({
      getBoundaryElement: () => host,
      isOpen: () => openState.value,
      setOpen: (next) => {
        openState.value = next;
      },
    });

    const cleanup = overlay.bindOutsideClick(document);

    overlay.open({ reason: 'trigger' });

    const click = new MouseEvent('click', { bubbles: true });

    Object.defineProperty(click, 'composedPath', { value: undefined });
    outside.dispatchEvent(click);

    expect(openState.value).toBe(false);

    cleanup();
    host.remove();
    outside.remove();
  });
});
