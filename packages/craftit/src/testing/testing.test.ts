/**
 * Example tests showing how to use craftit testing utilities
 * These serve as both documentation and validation
 */

import { defineElement, html } from '../craftit';
import { createFixture, queryShadow } from './index';

describe('craftit testing utilities examples', () => {
  beforeAll(() => {
    // Define a simple test component
    defineElement('test-counter', {
      onConnected(el) {
        el.on('.increment', 'click', () => {
          el.state.count++;
        });
      },
      state: { count: 0 },
      template: (el) => html`
        <div class="count">${el.state.count}</div>
        <button class="increment">+</button>
      `,
    });
  });

  it('should create and test a component with createFixture', async () => {
    const fixture = await createFixture('test-counter');

    // Query shadow DOM
    const countDisplay = fixture.query('.count');
    const button = fixture.query<HTMLButtonElement>('.increment');

    expect(countDisplay?.textContent).toBe('0');

    // Simulate interaction
    button?.click();
    await fixture.update();

    expect(countDisplay?.textContent).toBe('1');

    fixture.destroy();
  });

  it('should query shadow DOM with queryShadow', async () => {
    const fixture = await createFixture('test-counter');

    const button = queryShadow<HTMLButtonElement>(fixture.element, '.increment');
    const countDisplay = queryShadow(fixture.element, '.count');

    expect(button).toBeTruthy();
    expect(countDisplay).toBeTruthy();

    fixture.destroy();
  });

  it('should update attributes and wait for render', async () => {
    const fixture = await createFixture('test-counter');

    await fixture.setAttribute('data-test', 'value');
    expect(fixture.element.getAttribute('data-test')).toBe('value');

    await fixture.setAttribute('data-test', false);
    expect(fixture.element.hasAttribute('data-test')).toBe(false);

    fixture.destroy();
  });
});
