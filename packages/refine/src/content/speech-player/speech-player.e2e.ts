import type { Page } from '@playwright/test';
import { axeCheck, expect, test } from '../../testing/fixtures';

// Headless Chromium ships the Web Speech API but no voices, so the engine is stubbed
// here and speech behavior itself is owned by the jsdom suite's controlled mock. These
// tests exercise the real DOM contract: clicks, keyboard activation, focus, attribute
// reflection, and the full axe scan with contrast and target-size enabled.

const PLAYER = 'ore-speech-player';
const TOGGLE = 'ore-speech-player [part="play"]';
const RATE = 'ore-speech-player [part="rate"]';
const LABEL = 'ore-speech-player .toggle-label';
const STOP = 'ore-speech-player [part="stop"]';

test.describe('Rendering', () => {
  test('renders the labeled invitation, the speed control, and hides stop while idle', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);

    await expect(page.locator(TOGGLE)).toBeEnabled();
    await expect(page.locator(LABEL)).toBeVisible();
    await expect(page.locator(LABEL)).toHaveText('Read aloud');
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: normal');
    await expect(page.locator(RATE)).toContainText('1×');
    await expect(page.locator(STOP)).toBeHidden();
  });

  test('disables the toggle when the text is empty', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text=""></${PLAYER}>`);

    await expect(page.locator(TOGGLE)).toBeDisabled();
  });
});

test.describe('Interaction', () => {
  test('toggles to playing, folds the label, and reveals the stop control', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    await page.locator(TOGGLE).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'playing');
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-label', 'Pause reading');
    // The label folds away — its text stays in the DOM, hidden with the control.
    await expect(page.locator(LABEL)).toBeHidden();
    await expect(page.locator(STOP)).toBeVisible();
  });

  test('pauses on the second activation and resumes on the third', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    await page.locator(TOGGLE).click();
    await page.locator(TOGGLE).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'paused');
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-label', 'Resume reading');

    await page.locator(TOGGLE).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'playing');
  });

  test('stops and returns to idle from the stop control', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    await page.locator(TOGGLE).click();
    await page.locator(STOP).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'idle');
    await expect(page.locator(LABEL)).toBeVisible();
    await expect(page.locator(STOP)).toBeHidden();
  });

  test('cycles the speed control through its steps', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);

    await page.locator(RATE).click();
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: slow');
    await expect(page.locator(RATE)).toContainText('0.85×');

    await page.locator(RATE).click();
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: fast');

    await page.locator(RATE).click();
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: normal');
  });

  test('begins reading from a bound resume-at sentence', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="First sentence. Second sentence." resume-at="1"></${PLAYER}>`);
    await stubEngine(page);

    const progress: number[] = [];
    await page.exposeFunction('__onProgress', (sentence: number) => progress.push(sentence));
    await page.evaluate(() => {
      document.querySelector('ore-speech-player')?.addEventListener('progress', (event) => {
        const detail = (event as CustomEvent<{ sentence: number }>).detail;
        (window as { __onProgress?: (sentence: number) => void }).__onProgress?.(detail.sentence);
      });
    });

    await page.locator(TOGGLE).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'playing');
    await expect(progress).toEqual([1]);
  });

  test('activates from the keyboard like a native button', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    await page.locator(TOGGLE).focus();
    await page.keyboard.press('Enter');

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'playing');
  });
});

test.describe('Accessibility', () => {
  test('passes the full axe scan while idle and while playing', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    expect((await axeCheck(page)).violations).toEqual([]);

    await page.locator(TOGGLE).click();

    expect((await axeCheck(page)).violations).toEqual([]);
  });
});

/** Headless Chromium has no voices — keep the engine quiet without any engine behavior. */
async function stubEngine(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.speechSynthesis.speak = () => {};
    window.speechSynthesis.pause = () => {};
    window.speechSynthesis.resume = () => {};
    window.speechSynthesis.cancel = () => {};
  });
}
