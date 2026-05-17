import { type Fixture, mount } from '@vielzeug/craftit/testing';

describe('attributeChangedCallback diagnostic', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./password-strength');
  });
  afterEach(() => {
    fixture?.destroy();
  });
  it('diagnostic: setAttribute triggers update?', async () => {
    fixture = await mount('bit-password-strength', { attrs: { score: '1' } });
    console.log('Before update:');
    console.log('  data-level:', fixture.element.getAttribute('data-level'));
    console.log('  score attr:', fixture.element.getAttribute('score'));
    console.log('  active segments:', fixture.queryAll('.segment.active').length);
    fixture.element.setAttribute('score', '4');
    console.log('\nImmediately after setAttribute (sync):');
    console.log('  data-level:', fixture.element.getAttribute('data-level'));
    console.log('  score attr:', fixture.element.getAttribute('score'));
    console.log('  active segments:', fixture.queryAll('.segment.active').length);
    await fixture.flush();
    console.log('\nAfter flush:');
    console.log('  data-level:', fixture.element.getAttribute('data-level'));
    console.log('  score attr:', fixture.element.getAttribute('score'));
    console.log('  active segments:', fixture.queryAll('.segment.active').length);
    // Try the helper method
  });
  it('diagnostic: using fixture.attr helper', async () => {
    fixture = await mount('bit-password-strength', { attrs: { score: '1' } });
    console.log('Before update:');
    console.log('  data-level:', fixture.element.getAttribute('data-level'));
    await fixture.attr('score', '4');
    console.log('After fixture.attr:');
    console.log('  data-level:', fixture.element.getAttribute('data-level'));
    console.log('  active segments:', fixture.queryAll('.segment.active').length);
  });
});
