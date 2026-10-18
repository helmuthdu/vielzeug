import { readFileSync } from 'node:fs';
import { axeCheck, expect, test } from '../../testing/fixtures';

const reader = 'ore-speed-reading';
const viewport = `${reader} [part="viewport"]`;
const focal = `${reader} [part="focal"]`;
const word = `${reader} [part="word"]`;

test.describe('Layout', () => {
  test('renders the actual documentation examples without autoplay', async ({ page, refinePage }) => {
    const docs = readFileSync(
      new URL('../../../../../docs/refine/components/speed-reading.md', import.meta.url),
      'utf8',
    );
    const examples = [...docs.matchAll(/```html\n([\s\S]*?)```/g)];
    expect(examples).toHaveLength(2);
    for (const example of examples) {
      await refinePage.mountComponent(example[1]!);
      for (const script of example[1]!.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
        await page.addScriptTag({ content: script[1]!, type: 'module' });
      }
      await expect(page.locator(reader)).toHaveAttribute('state', 'idle');
      await expect(page.locator(word)).toBeVisible();
      await expect(page.getByRole('button', { exact: true, name: 'Start reading' })).toBeVisible();
      await expect(page.getByRole('spinbutton')).toBeVisible();
    }
  });

  test('keeps the focal grapheme centered for proportional words and both directions', async ({ page, refinePage }) => {
    for (const dir of ['ltr', 'rtl']) {
      await refinePage.mountComponent(
        `<ore-speed-reading dir="${dir}" text="a four hello extraordinary é" style="font-family:serif"></ore-speed-reading>`,
      );
      const box = (await page.locator(viewport).boundingBox())!;
      for (let index = 0; index < 5; index++) {
        await page.locator(reader).evaluate((el, index) => el.seek(index), index);
        await expect(page.locator(focal)).toHaveText(['a', 'o', 'e', 'r', 'é'][index]!);
        await expect
          .poll(async () => {
            const anchor = (await page.locator(focal).boundingBox())!;
            return Math.abs(anchor.x + anchor.width / 2 - (box.x + box.width / 2));
          })
          .toBeLessThan(1);
      }
    }
  });

  test('fits ordinary words and keeps controls in a narrow, enlarged-text layout', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 320 });
    await refinePage.mountComponent(
      '<ore-speed-reading text="Hello extraordinary" style="--speed-reading-font-size:var(--text-4xl)"></ore-speed-reading>',
    );
    await page.locator(reader).evaluate((el) => el.seek(1));
    await expect(page.locator(word)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    await expect(page.getByRole('button', { exact: true, name: 'Next word' })).toBeVisible();
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  });

  test('pauses and reveals untruncated text when a word cannot fit readably', async ({ page, refinePage }) => {
    const long = 'extraordinary'.repeat(30);
    await refinePage.mountComponent(
      `<ore-speed-reading text="Hello ${long}" style="max-width:240px"></ore-speed-reading>`,
    );
    await page.locator(reader).evaluate((el) => el.play());
    await expect(page.locator(reader)).toHaveAttribute('word-index', '1');
    await expect(page.locator(reader)).toHaveAttribute('state', 'paused');
    await expect(page.locator(`${reader} [part="full-text"]`)).toBeVisible();
    await expect(page.locator(`${reader} [part="full-text"]`)).toHaveText(`Hello ${long}`);
    await expect(page.locator(word)).toBeHidden();
    await expect(page.locator(`${reader} ore-accordion-item`)).toHaveAttribute('expanded');
    await page.getByRole('button', { exact: true, name: 'Previous word' }).click();
    await expect(page.locator(word)).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Resume' }).click();
    await expect(page.locator(reader)).toHaveAttribute('state', 'playing');
  });

  test('shows non-Latin text as complete centered tokens', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-speed-reading lang="ar" dir="rtl" text="مرحبا بالعالم"></ore-speed-reading>');
    await expect(page.locator(word)).toHaveAttribute('data-centered', '');
    await expect(page.locator(word)).toContainText('مرحبا');
    const box = (await page.locator(viewport).boundingBox())!;
    const token = (await page.locator(`${word} .suffix`).boundingBox())!;
    expect(Math.abs(token.x + token.width / 2 - (box.x + box.width / 2))).toBeLessThan(1);
  });
});

test.describe('Interaction', () => {
  test('plays, pauses, steps and restarts with stable focus', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-speed-reading text="One two three four five six seven eight nine ten"></ore-speed-reading>',
    );
    await page.locator(viewport).focus();
    await page.keyboard.press('Space');
    await expect(page.locator(reader)).toHaveAttribute('state', 'playing');
    await page.keyboard.press('Space');
    await expect(page.locator(reader)).toHaveAttribute('state', 'paused');
    await page.getByRole('button', { exact: true, name: 'Restart' }).click();
    await page.locator(viewport).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator(reader)).toHaveAttribute('word-index', '1');
    await expect(page.locator(viewport)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator(reader)).toHaveAttribute('word-index', '0');
  });

  test('pauses for full text and preserves the original literal content', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-speed-reading text="One two three four five six seven eight"></ore-speed-reading>',
    );
    await page.getByRole('button', { exact: true, name: 'Start reading' }).click();
    await page.getByText('Read full text', { exact: true }).click();
    await expect(page.locator(reader)).toHaveAttribute('state', 'paused');
    await expect(page.locator(`${reader} [part="full-text"]`)).toBeVisible();
    await page.getByText('Read full text', { exact: true }).click();
    await expect(page.locator(reader)).toHaveAttribute('state', 'paused');
  });

  test('changes numeric WPM without stealing editing keys', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-speed-reading text="One two three"></ore-speed-reading>');
    const input = page.getByRole('spinbutton');
    await input.fill('450');
    await input.press('Tab');
    await expect(page.locator(reader)).toHaveAttribute('wpm', '450');
    await input.focus();
    await input.press('ArrowRight');
    await expect(page.locator(reader)).toHaveAttribute('word-index', '0');
  });

  test('recovers explicitly from oversized middle and final words', async ({ page, refinePage }) => {
    const long = 'extraordinary'.repeat(30);
    await refinePage.mountComponent(`<ore-speed-reading text="${long} hello ${long}"></ore-speed-reading>`);
    await expect(page.locator(`${reader} [part="full-text"] mark`)).toHaveText(long);
    await page.getByRole('button', { exact: true, name: 'Continue after this word' }).click();
    await expect(page.locator(reader)).toHaveAttribute('word-index', '1');
    await expect(page.locator(reader)).toHaveAttribute('state', 'paused');
    await expect(page.locator(word)).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Next word' }).click();
    await page.getByRole('button', { exact: true, name: 'Finish reading' }).click();
    await expect(page.locator(reader)).toHaveAttribute('state', 'ended');
    await expect(page.getByRole('button', { exact: true, name: 'Read again' })).toBeEnabled();
    await expect(page.locator(`${reader} [part="status"]`)).toContainText('Reading finished.');
  });

  test('keeps one type size when stepping through ordinary words', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 320 });
    await refinePage.mountComponent('<ore-speed-reading text="a four hello extraordinary"></ore-speed-reading>');
    const sizes = [];
    for (let index = 0; index < 4; index++) {
      await page.locator(reader).evaluate((el, index) => el.seek(index), index);
      await expect(page.locator(word)).toBeVisible();
      sizes.push(await page.locator(word).evaluate((el) => getComputedStyle(el).fontSize));
    }
    expect(new Set(sizes).size).toBe(1);
  });

  test('restores overflow recovery after restarting or seeking the same completed word', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(`<ore-speed-reading text="${'extraordinary'.repeat(30)}"></ore-speed-reading>`);
    const finish = page.getByRole('button', { exact: true, name: 'Finish reading' });
    await finish.click();
    await expect(page.locator(reader)).toHaveAttribute('state', 'ended');
    await page.getByRole('button', { exact: true, name: 'Restart' }).click();
    await expect(page.locator(reader)).toHaveAttribute('state', 'idle');
    await expect(finish).toBeVisible();
    await expect(page.locator(word)).toBeHidden();
    await finish.click();
    await page.locator(reader).evaluate((el) => el.seek(0));
    await expect(page.locator(reader)).toHaveAttribute('state', 'paused');
    await expect(finish).toBeVisible();
    await expect(page.locator(word)).toBeHidden();
  });

  test('locates the current word and resumes from a keyboard-selected sentence', async ({ page, refinePage }) => {
    const text = Array.from({ length: 60 }, (_, index) => `Sentence ${index} has context.`).join('\n');
    await refinePage.mountComponent(`<ore-speed-reading text="${text}"></ore-speed-reading>`);
    await page.locator(reader).evaluate((el) => el.seek(200));
    await page.getByText('Read full text', { exact: true }).click();
    const mark = page.locator(`${reader} [part="full-text"] mark`);
    await expect(mark).toHaveText('Sentence');
    await expect
      .poll(async () => {
        const panel = (await page.locator(`${reader} [part="full-text"]`).boundingBox())!;
        const selected = (await mark.boundingBox())!;
        return selected.y >= panel.y && selected.y + selected.height <= panel.y + panel.height;
      })
      .toBe(true);
    const select = page.getByRole('textbox', { name: 'Start at sentence' });
    await select.focus();
    await select.press('Enter');
    await expect(page.getByRole('option', { exact: true, name: '51. Sentence 50 has context.' })).toHaveAttribute(
      'data-focused',
    );
    await select.press('Home');
    await expect(page.getByRole('option', { exact: true, name: '1. Sentence 0 has context.' })).toHaveAttribute(
      'data-focused',
    );
    await select.press('Enter');
    await expect(page.locator(reader)).toHaveAttribute('word-index', '0');
    await expect(page.locator(reader)).toHaveAttribute('state', 'paused');
    await page.getByRole('button', { exact: true, name: 'Resume from here' }).click();
    await expect(page.locator(reader)).toHaveAttribute('state', 'playing');
    await expect(page.getByRole('button', { exact: true, name: 'Pause' })).toBeFocused();
    await expect(page.locator(`${reader} ore-accordion-item details`)).not.toHaveAttribute('open');
  });

  test('keeps recovery and context controls usable at 320px with enlarged text', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 1000, width: 320 });
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await refinePage.mountComponent(
      `<ore-speed-reading text="${'extraordinary'.repeat(30)} Normal text."></ore-speed-reading>`,
    );
    await expect(page.getByRole('button', { exact: true, name: 'Continue after this word' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    await page.getByRole('button', { exact: true, name: 'Continue after this word' }).click();
    await expect(page.locator(viewport)).toBeFocused();
    await expect(page.getByRole('button', { exact: true, name: 'Resume from here' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    for (const name of ['Previous word', 'Resume', 'Next word']) {
      const box = (await page.getByRole('button', { exact: true, name }).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
    }
  });

  test('keeps the previous pace and displays an error for an empty field commit', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-speed-reading wpm="350" text="One two three."></ore-speed-reading>');
    const input = page.getByRole('spinbutton');
    await input.fill('');
    await input.press('Tab');
    await expect(page.getByText('Enter a number between 100 and 600.', { exact: true })).toBeVisible();
    await expect(page.locator(reader)).toHaveAttribute('wpm', '350');
    await input.fill('400');
    await input.press('Tab');
    await expect(page.getByText('Enter a number between 100 and 600.', { exact: true })).toBeHidden();
    await expect(page.locator(reader)).toHaveAttribute('wpm', '400');
  });

  test('loads edited playground text only after an explicit action', async ({ page, refinePage }) => {
    const docs = readFileSync(
      new URL('../../../../../docs/refine/components/speed-reading.md', import.meta.url),
      'utf8',
    );
    const example = [...docs.matchAll(/```html\n([\s\S]*?)```/g)][0]![1]!;
    await refinePage.mountComponent(example);
    const script = [...example.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)][0]![1]!;
    await page.addScriptTag({ content: script, type: 'module' });
    const passage = page.getByRole('textbox', { name: 'Your passage' });
    await expect(passage).not.toHaveValue('');
    await page.locator(reader).evaluate((el) => el.seek(3));
    await passage.fill('My own passage.');
    await expect(page.locator(reader)).toHaveAttribute('word-index', '3');
    await page.getByRole('button', { exact: true, name: 'Load text' }).click();
    await expect(page.locator(reader)).toHaveAttribute('text', 'My own passage.');
    await expect(page.locator(reader)).toHaveAttribute('word-index', '0');
    await expect(page.locator(reader)).toHaveAttribute('state', 'idle');
    await passage.fill('');
    await page.getByRole('button', { exact: true, name: 'Load text' }).click();
    await expect(page.getByText('Enter some text before loading.', { exact: true })).toBeVisible();
    await expect(page.locator(reader)).toHaveAttribute('text', 'My own passage.');
  });
});

test.describe('Accessibility', () => {
  test('provides non-live words, a readable alternative, and accessible controls', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-speed-reading text="One two three four five"></ore-speed-reading>');
    await expect(page.locator(word)).toHaveAttribute('aria-hidden', 'true');
    expect((await axeCheck(page)).violations).toEqual([]);
    await page.getByText('Read full text', { exact: true }).click();
    await expect(page.locator(`${reader} [part="full-text"]`)).toBeVisible();
    const mark = page.locator(`${reader} [part="full-text"] mark`);
    expect(await mark.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    expect((await axeCheck(page)).violations).toEqual([]);
  });
});
