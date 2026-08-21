import { captureFocus, restoreFocus } from '../restore-focus';

describe('restoreFocus', () => {
  it('restores focus to a connected target', () => {
    const one = document.createElement('button');
    const two = document.createElement('button');

    document.body.append(one, two);
    two.focus();

    expect(restoreFocus(one)).toBe(true);
    expect(document.activeElement).toBe(one);
  });

  it('returns false when target is disconnected', () => {
    const button = document.createElement('button');

    expect(restoreFocus(button)).toBe(false);
  });

  it('uses fallback when primary target cannot be focused', () => {
    const disabled = document.createElement('button');
    const fallback = document.createElement('button');

    disabled.disabled = true;
    document.body.append(disabled, fallback);

    expect(restoreFocus(disabled, { fallback })).toBe(true);
    expect(document.activeElement).toBe(fallback);
  });

  it('returns true for targets focused inside shadow DOM', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');

    shadow.append(button);
    document.body.append(host);

    expect(restoreFocus(button)).toBe(true);
  });
});

describe('captureFocus', () => {
  it('captures current focus and restores it later', () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('button');

    document.body.append(trigger, panel);
    trigger.focus();

    const restore = captureFocus();

    panel.focus();
    expect(document.activeElement).toBe(panel);
    expect(restore.restore()).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('returns false after dispose', () => {
    const trigger = document.createElement('button');

    document.body.append(trigger);
    trigger.focus();

    const restore = captureFocus();

    restore.dispose();
    expect(restore.restore()).toBe(false);
    expect(restore.disposed).toBe(true);
    expect(restore.disposalSignal.aborted).toBe(true);
  });

  it('captures deep active element by default', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const trigger = document.createElement('button');
    const panel = document.createElement('button');

    shadow.append(trigger, panel);
    document.body.append(host);
    trigger.focus();

    const restore = captureFocus();

    panel.focus();
    expect(restore.restore()).toBe(true);
  });
});
