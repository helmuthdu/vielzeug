import { axeCheck, expect, test } from '../../testing/fixtures';

/** Mounts a bar with the two-key test vocabulary. */
async function mountBar(
  page: import('@playwright/test').Page,
  refinePage: { mountComponent(html: string): Promise<void> },
) {
  await refinePage.mountComponent(
    '<ore-query-bar id="bar" label="Search issues" placeholder="Title, author or label…"></ore-query-bar>',
  );
  await page.evaluate(() => {
    const bar = document.getElementById('bar') as HTMLElement & { vocabulary: unknown };
    bar.vocabulary = [
      {
        key: 'author',
        label: 'Author',
        options: [
          { label: 'Alice', value: 'alice' },
          { label: 'Bob', value: 'bob' },
        ],
      },
      {
        key: 'label',
        label: 'Label',
        options: [
          { label: 'Bug', value: 'bug' },
          { label: 'Enhancement', value: 'enhancement' },
        ],
      },
    ];
  });
}

const input = (page: import('@playwright/test').Page) =>
  page.locator('ore-query-bar').locator('ore-input').getByRole('combobox');

test.describe('Accessibility', () => {
  test('passes the full axe scan closed, open, and with pills', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const bar = page.locator('ore-query-bar');

    expect((await axeCheck(page)).violations).toEqual([]);

    await input(page).click();
    await expect(bar.locator('[role="option"]')).toHaveCount(2);
    expect((await axeCheck(page)).violations).toEqual([]);

    await input(page).fill('author:alice label:bug');
    await expect(bar.locator('ore-chip')).toHaveCount(2);
    expect((await axeCheck(page)).violations).toEqual([]);

    // The dead-draft row is part of the surface too.
    await input(page).pressSequentially(' author:zzz');
    await expect(bar.locator('.no-match')).toBeVisible();
    expect((await axeCheck(page)).violations).toEqual([]);
  });

  test('carries combobox semantics on the focused input', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const field = input(page);

    await expect(field).toHaveAttribute('role', 'combobox');
    await expect(field).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(field).toHaveAttribute('aria-expanded', 'false');
    await expect(
      field.evaluate((input) => {
        const controls = (input as HTMLInputElement & { ariaControlsElements?: Element[] }).ariaControlsElements;
        const listbox = document.querySelector('ore-query-bar')?.shadowRoot?.querySelector('[role="listbox"]');

        return Boolean(listbox && controls?.includes(listbox));
      }),
    ).resolves.toBe(true);

    await field.click();
    await expect(field).toHaveAttribute('aria-expanded', 'true');

    await field.press('ArrowDown');
    await expect
      .poll(() =>
        field.evaluate((input) => {
          const active = (input as HTMLInputElement & { ariaActiveDescendantElement?: Element | null })
            .ariaActiveDescendantElement;
          const focused = document.querySelector('ore-query-bar')?.shadowRoot?.querySelector('[data-focused]');

          return active === focused;
        }),
      )
      .toBe(true);
  });
});

test.describe('Interaction', () => {
  test('a typed complete token commits to a pill and rewrites out of the field', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await input(page).fill('bug author:alice');
    await expect(page.locator('ore-query-bar ore-chip')).toHaveCount(1);
    await expect(input(page)).toHaveValue('bug');
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: 'bug',
      tokens: [{ key: 'author', value: 'alice' }],
    });
  });

  test('picking a key starts composing and picking a value commits', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await input(page).click();
    await page.locator('.option', { hasText: 'Author' }).first().click();
    await expect(input(page)).toHaveValue('author:');

    await page.locator('.option', { hasText: 'Alice' }).first().click();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [{ key: 'author', value: 'alice' }],
    });
    await expect(input(page)).toBeFocused();
  });

  test('pill removal and backspace both update the state', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await input(page).fill('author:alice label:bug');
    await expect(page.locator('ore-query-bar ore-chip')).toHaveCount(2);

    await page.locator('ore-chip', { hasText: 'Label' }).locator('[part="remove-btn"]').click();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [{ key: 'author', value: 'alice' }],
    });

    await input(page).click();
    await input(page).press('Backspace');
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [],
    });
  });

  test('typing after Escape reopens the dropdown', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const field = input(page);
    await field.click();
    await expect(page.locator('[role="option"]')).toHaveCount(2);

    await field.press('Escape');
    await expect(page.locator('[role="option"]')).toHaveCount(0);

    await field.pressSequentially('al');
    await expect(page.locator('[role="option"]')).toHaveCount(1);
    await expect(field).toHaveAttribute('aria-expanded', 'true');
  });

  test('an unresolvable draft shows a dead-draft row instead of closing', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const field = input(page);
    await field.click();
    await field.pressSequentially('author:zzz');
    await expect(page.locator('.no-match')).toContainText('No matching Author');
    await expect(field).toHaveAttribute('aria-expanded', 'true');
  });

  test('Escape dismisses the dropdown and keeps the query', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await input(page).click();
    await expect(page.locator('[role="option"]')).toHaveCount(2);

    await input(page).press('Escape');
    await expect(page.locator('[role="option"]')).toHaveCount(0);
    await expect(input(page)).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Layout', () => {
  test('wrapped pills grow the field instead of clipping', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-query-bar id="bar" label="Search" style="width: 320px"></ore-query-bar>');
    await page.evaluate(() => {
      const bar = document.getElementById('bar') as HTMLElement & { vocabulary: unknown };
      bar.vocabulary = [
        { key: 'author', label: 'Author', options: [{ label: 'Alice', value: 'alice' }] },
        { key: 'label', label: 'Label', options: [{ label: 'Bug', value: 'bug' }] },
        { key: 'milestone', label: 'Milestone', options: [{ label: 'October Release', value: 'october' }] },
      ];
    });

    const field = page.locator('ore-query-bar ore-input [part="field"]');
    const before = await field.boundingBox();

    await input(page).fill('author:alice label:bug milestone:october');
    await expect(page.locator('ore-query-bar ore-chip')).toHaveCount(3);

    const after = await field.boundingBox();
    expect(after?.height).toBeGreaterThan(before?.height ?? 0);

    const host = await page.locator('ore-query-bar').evaluate((el) => el.getBoundingClientRect());
    const chips = await page
      .locator('ore-query-bar ore-chip')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    expect(chips.length).toBe(3);
    for (const chip of chips) {
      expect(chip.bottom).toBeLessThanOrEqual(host.bottom + 1);
    }
  });

  test('suggestion rows share one fixed height', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await input(page).click();
    const rows = await page.locator('.option').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(Math.round(row.height)).toBe(36);
    }
  });
});
