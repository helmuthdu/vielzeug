import { expect, test } from '../../testing/fixtures';

// The chip sits on the fill's base color, so its ink must ride the theme's
// designed contrast token — hardcoded white fails on the lighter dark-theme
// bases and on bright colors (warning) even in light theme.
test.describe('Floating label contrast', () => {
  async function chipAndTokenInk(page: import('@playwright/test').Page, token: string) {
    return page.evaluate((tokenName: string) => {
      const root = document.querySelector('#p')!.shadowRoot!;
      const probe = document.createElement('span');

      probe.style.color = `var(--${tokenName})`;
      document.body.append(probe);

      const expected = getComputedStyle(probe).color;

      probe.remove();

      return {
        chip: getComputedStyle(root.querySelector<HTMLElement>('.floating-label')!).color,
        expected,
      };
    }, token);
  }

  test('chip takes the neutral contrast ink by default', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-progress id="p" value="40" floating-label="40%"></ore-progress>');

    const { chip, expected } = await chipAndTokenInk(page, 'color-neutral-contrast');

    expect(chip).toBe(expected);
  });

  test('chip takes the color-specific contrast ink', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-progress id="p" value="40" color="warning" floating-label="40%"></ore-progress>',
    );

    const { chip, expected } = await chipAndTokenInk(page, 'color-warning-contrast');

    expect(chip).toBe(expected);
  });
});
