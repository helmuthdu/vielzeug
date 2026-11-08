import { createBackgroundLock } from './background-lock';

it('keeps an overlay inside nested shadow hosts out of the background lock', () => {
  const container = document.createElement('section');
  const background = document.createElement('main');
  const outerHost = document.createElement('div');
  const innerHost = document.createElement('div');
  const overlay = document.createElement('div');
  container.append(outerHost);
  outerHost.attachShadow({ mode: 'open' }).append(innerHost);
  innerHost.attachShadow({ mode: 'open' }).append(overlay);
  document.body.append(container, background);
  const lock = createBackgroundLock();

  try {
    lock.lock(overlay);
    expect(container.hasAttribute('inert')).toBe(false);
    expect(background.hasAttribute('inert')).toBe(true);
    lock.unlock();
    expect(background.hasAttribute('inert')).toBe(false);
  } finally {
    lock.unlock();
    container.remove();
    background.remove();
  }
});
