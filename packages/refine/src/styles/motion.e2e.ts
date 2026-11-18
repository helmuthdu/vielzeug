import { expect, test } from '../testing/fixtures';

test.describe('Motion Mode', () => {
  test('applies Motion Mode timing to shared dialog transitions', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await refinePage.mountComponent('<ore-dialog open label="Motion preview"><p>Dialog content</p></ore-dialog>');

    const durations = () =>
      page.locator('ore-dialog').evaluate((host) => {
        const panel = host.shadowRoot?.querySelector<HTMLElement>('.panel');

        if (!panel) throw new Error('Expected the dialog panel in its shadow root.');

        return getComputedStyle(panel)
          .transitionDuration.split(',')
          .map((duration) => duration.trim());
      });

    await expect.poll(durations).toEqual(['0.2s', '0.2s']);

    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'reduced'));
    await expect.poll(durations).toEqual(['0s', '0s']);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'full'));
    await expect.poll(durations).toEqual(['0.2s', '0.2s']);
  });

  test('tokenizes typing-indicator stagger delays across motion modes', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await refinePage.mountComponent('<ore-typing-indicator></ore-typing-indicator>');

    const delays = () =>
      page.locator('ore-typing-indicator').evaluate((host) => {
        const dots = host.shadowRoot?.querySelectorAll<HTMLElement>('.dot');

        if (!dots) throw new Error('Expected typing-indicator dots in its shadow root.');

        return Array.from(dots, (dot) => getComputedStyle(dot).animationDelay);
      });

    await expect.poll(delays).toEqual(['0s', '0.15s', '0.3s']);

    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'reduced'));
    await expect.poll(delays).toEqual(['0s', '0s', '0s']);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'full'));
    await expect.poll(delays).toEqual(['0s', '0.15s', '0.3s']);
  });

  test('applies System, Reduced, and Full timing through a shadow boundary', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await refinePage.mountComponent(`
      <ore-accordion-item>
        <span slot="title">Details</span>
        <p>Motion follows the document setting.</p>
      </ore-accordion-item>
    `);

    const timing = () =>
      page.locator('ore-accordion-item').evaluate((host) => {
        const content = host.shadowRoot?.querySelector<HTMLElement>('.content-inner');

        if (!content) throw new Error('Expected accordion content in its shadow root.');

        const style = getComputedStyle(content);

        return { delay: style.transitionDelay, duration: style.transitionDuration };
      });

    const fullMotion = { delay: '0.075s, 0.075s', duration: '0.2s, 0.2s' };
    const reducedMotion = { delay: '0s, 0s', duration: '0s, 0s' };

    await expect.poll(timing).toEqual(fullMotion);

    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'reduced'));
    await expect.poll(timing).toEqual(reducedMotion);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'full'));
    await expect.poll(timing).toEqual(fullMotion);

    await page.locator('html').evaluate((root) => root.removeAttribute('data-motion'));
    await expect.poll(timing).toEqual(reducedMotion);
  });
});
