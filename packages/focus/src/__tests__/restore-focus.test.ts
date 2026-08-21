import { captureFocus, restoreFocus } from '../index';

describe('restoreFocus', () => {
  it('restores focus to a connected target', () => {
    const one = document.createElement('button');
    const two = document.createElement('button');

    document.body.append(one, two);
    two.focus();

    expect(restoreFocus(one)).toBe(true);
    expect(document.activeElement).toBe(one);
  });

  it('returns false when the target is disconnected', () => {
    expect(restoreFocus(document.createElement('button'))).toBe(false);
  });

  it('uses the fallback when the primary target cannot be focused', () => {
    const disabled = document.createElement('button');
    const fallback = document.createElement('button');

    disabled.disabled = true;
    document.body.append(disabled, fallback);

    expect(restoreFocus(disabled, { fallback })).toBe(true);
    expect(document.activeElement).toBe(fallback);
  });

  it('uses the fallback when an eligible target does not accept focus', () => {
    const target = document.createElement('div');
    const fallback = document.createElement('button');

    document.body.append(target, fallback);

    expect(restoreFocus(target, { fallback })).toBe(true);
    expect(document.activeElement).toBe(fallback);
  });

  it('restores focus inside shadow DOM', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');

    shadow.append(button);
    document.body.append(host);

    expect(restoreFocus(button)).toBe(true);
  });
});

describe('captureFocus', () => {
  it('returns a one-shot callback that restores captured focus', () => {
    const trigger = document.createElement('button');
    const panel = document.createElement('button');

    document.body.append(trigger, panel);
    trigger.focus();

    const restore = captureFocus();

    panel.focus();
    expect(restore()).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(restore()).toBe(false);
  });

  it('captures the deepest active element', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const trigger = document.createElement('button');
    const panel = document.createElement('button');

    shadow.append(trigger, panel);
    document.body.append(host);
    trigger.focus();

    const restore = captureFocus();

    panel.focus();
    expect(restore()).toBe(true);
  });

  it('uses a lazy fallback when the captured element disconnects', () => {
    const trigger = document.createElement('button');
    const fallback = document.createElement('button');

    document.body.append(trigger, fallback);
    trigger.focus();

    const restore = captureFocus({ fallback: () => fallback });

    trigger.remove();
    expect(restore()).toBe(true);
    expect(document.activeElement).toBe(fallback);
  });

  it('is cancelled when its signal aborts', () => {
    const trigger = document.createElement('button');
    const controller = new AbortController();

    document.body.append(trigger);
    trigger.focus();

    const restore = captureFocus({ signal: controller.signal });

    controller.abort();
    expect(restore()).toBe(false);
  });

  it('starts cancelled when given an already-aborted signal', () => {
    const controller = new AbortController();
    controller.abort();

    expect(captureFocus({ signal: controller.signal })()).toBe(false);
  });
});
