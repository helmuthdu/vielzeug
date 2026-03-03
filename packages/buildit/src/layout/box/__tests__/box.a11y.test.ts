import { type Fixture, mount } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('bit-box - Accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../box');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should render as a container element', async () => {
    fixture = await mount('bit-box');
    const box = fixture.query('.box');
    expect(box).toBeTruthy();
  });

  it('should preserve aria attributes', async () => {
    fixture = await mount('bit-box');
    fixture.element.setAttribute('aria-label', 'Test box');
    expect(fixture.element.getAttribute('aria-label')).toBe('Test box');
  });

  it('should preserve role attribute', async () => {
    fixture = await mount('bit-box');
    fixture.element.setAttribute('role', 'region');
    expect(fixture.element.getAttribute('role')).toBe('region');
  });

  it('should allow aria-labelledby', async () => {
    fixture = await mount('bit-box');
    fixture.element.setAttribute('aria-labelledby', 'heading-id');
    expect(fixture.element.getAttribute('aria-labelledby')).toBe('heading-id');
  });

  it('should allow aria-describedby', async () => {
    fixture = await mount('bit-box');
    fixture.element.setAttribute('aria-describedby', 'desc-id');
    expect(fixture.element.getAttribute('aria-describedby')).toBe('desc-id');
  });
});
