import { escape } from '../escape';
import { pad } from '../pad';
import { titleCase } from '../titleCase';
import { unescape } from '../unescape';
import { words } from '../words';

describe('string extras', () => {
  it('extracts words and builds title case', () => {
    expect(words('helloWorld-test_case')).toEqual(['hello', 'World', 'test', 'case']);
    expect(titleCase('helloWorld-test_case')).toBe('Hello World Test Case');
  });

  it('preserves accented letters instead of stripping them — regression', () => {
    expect(words('café bar')).toEqual(['café', 'bar']);
    expect(titleCase('café bar')).toBe('Café Bar');
  });

  it('pads strings evenly', () => {
    expect(pad('hi', 6, '.')).toBe('..hi..');
    expect(pad('cat', 8, '_')).toBe('__cat___');
  });

  it('escapes and unescapes HTML entities', () => {
    expect(escape('<div>"x" & y</div>')).toBe('&lt;div&gt;&quot;x&quot; &amp; y&lt;/div&gt;');
    expect(unescape('&lt;div&gt;&quot;x&quot; &amp; y&lt;/div&gt;')).toBe('<div>"x" & y</div>');
  });
});
