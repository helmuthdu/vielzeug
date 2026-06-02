import { endsWith } from '../endsWith';
import { escape } from '../escape';
import { pad } from '../pad';
import { startsWith } from '../startsWith';
import { titleCase } from '../titleCase';
import { unescape } from '../unescape';
import { words } from '../words';

describe('string extras', () => {
  it('extracts words and builds title case', () => {
    expect(words('helloWorld-test_case')).toEqual(['hello', 'World', 'test', 'case']);
    expect(titleCase('helloWorld-test_case')).toBe('Hello World Test Case');
  });

  it('pads strings evenly', () => {
    expect(pad('hi', 6, '.')).toBe('..hi..');
    expect(pad('cat', 8, '_')).toBe('__cat___');
  });

  it('escapes and unescapes HTML entities', () => {
    expect(escape('<div>"x" & y</div>')).toBe('&lt;div&gt;&quot;x&quot; &amp; y&lt;/div&gt;');
    expect(unescape('&lt;div&gt;&quot;x&quot; &amp; y&lt;/div&gt;')).toBe('<div>"x" & y</div>');
  });

  it('checks prefixes and suffixes', () => {
    expect(startsWith('vielzeug', 'viel')).toBe(true);
    expect(endsWith('vielzeug', 'zeug')).toBe(true);
  });
});
