import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('animates surviving options when a filter reflows the list', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-combobox label="Country">' +
        '<ore-combobox-option value="us">United States</ore-combobox-option>' +
        '<ore-combobox-option value="gb">United Kingdom</ore-combobox-option>' +
        '<ore-combobox-option value="de">Germany</ore-combobox-option>' +
        '<ore-combobox-option value="ca">Canada</ore-combobox-option>' +
        '</ore-combobox>',
    );

    await page.locator('ore-combobox').getByRole('combobox', { name: 'Country' }).click();
    await expect(page.getByRole('option')).toHaveCount(4);

    // Type a query that keeps one option that was last in the list: its slot
    // moves, so the FLIP must animate it. Everything runs inside one evaluate
    // so the check lands while the 200ms reflow is still running.
    const running = await page.evaluate(async () => {
      const host = document.querySelector('ore-combobox')!;
      // The search input lives one shadow root deeper, inside ore-input.
      const input = host.shadowRoot!.querySelector('ore-input')!.shadowRoot!.querySelector('input')!;

      input.value = 'king';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // The reflow animates from a requestAnimationFrame after the mutation.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const option = host.shadowRoot!.querySelector('.option')!;

      // The FLIP animates the `translate` property; a hover/selection
      // background transition on the same row must not count.
      return option.getAnimations().filter((animation) => {
        if (animation.playState !== 'running') return false;

        const keyframes = (animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [];

        return keyframes.some((frame) => 'translate' in frame && frame.translate !== '0px 0px');
      }).length;
    });

    expect(running).toBeGreaterThan(0);
  });
});

test.describe('Disabled reason', () => {
  test('shows and announces why an option is unavailable', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-combobox label="Country">' +
        '<ore-combobox-option value="us">United States</ore-combobox-option>' +
        '<ore-combobox-option value="restricted" disabled disabled-reason="Requires regional access">Restricted</ore-combobox-option>' +
        '</ore-combobox>',
    );

    const combobox = page.locator('ore-combobox');
    await combobox.getByRole('combobox', { name: 'Country' }).click();
    const option = page.getByRole('option', { name: 'Restricted Requires regional access' });
    await expect(option).toBeVisible();
    await expect(option.locator('.disabled-reason')).toHaveAttribute('title', 'Requires regional access');
    await option.click({ force: true });
    await expect(combobox).toHaveJSProperty('value', '');

    const results = await axeCheck(page);
    expect(results.violations).toEqual([]);
  });
});
