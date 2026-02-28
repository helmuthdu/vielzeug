/**
 * Craftit - CSS Utilities Tests
 * Tests for styling helpers
 */

import { css } from '../css';

describe('CSS Utilities', () => {
  describe('css tagged template', () => {
    it('should create CSS string', () => {
      const styles = css`
				.button {
					color: red;
					padding: 1rem;
				}
			`;

      expect(styles).toContain('.button');
      expect(styles).toContain('color: red');
      expect(styles).toContain('padding: 1rem');
    });

    it('should support interpolation', () => {
      const color = 'blue';
      const size = '2rem';

      const styles = css`
				.box {
					background: ${color};
					padding: ${size};
				}
			`;

      expect(styles).toContain('background: blue');
      expect(styles).toContain('padding: 2rem');
    });

    it('should handle multiple values', () => {
      const primary = '#3b82f6';
      const secondary = '#10b981';
      const radius = '0.5rem';

      const styles = css`
				.card {
					color: ${primary};
					background: ${secondary};
					border-radius: ${radius};
				}
			`;

      expect(styles).toContain(primary);
      expect(styles).toContain(secondary);
      expect(styles).toContain(radius);
    });

    it('should preserve whitespace', () => {
      const styles = css`
				.test {
					color: red;
				}
			`;

      expect(styles.trim()).toContain('.test');
    });
  });

  describe('css.theme()', () => {
    it('should create theme with CSS variables', () => {
      const theme = css.theme({
        primary: '#3b82f6',
        secondary: '#10b981',
      });

      expect(theme.primary).toBe('var(--primary)');
      expect(theme.secondary).toBe('var(--secondary)');
    });

    it('should generate CSS rule', () => {
      const theme = css.theme({
        primary: '#3b82f6',
      });

      const cssRule = theme.toString();

      expect(cssRule).toContain(':host');
      expect(cssRule).toContain('--primary: #3b82f6');
    });

    it('should support light and dark themes', () => {
      const theme = css.theme({ bg: '#ffffff', text: '#000000' }, { bg: '#000000', text: '#ffffff' });

      const cssRule = theme.toString();

      expect(cssRule).toContain('--bg: #ffffff');
      expect(cssRule).toContain('--bg: #000000');
      expect(cssRule).toContain('prefers-color-scheme: dark');
    });

    it('should support custom selector', () => {
      const theme = css.theme({ primary: 'blue' }, { primary: 'lightblue' }, { selector: '.my-component' });

      const cssRule = theme.toString();

      expect(cssRule).toContain('.my-component');
      expect(cssRule).not.toContain(':host');
    });

    it('should support custom attribute', () => {
      const theme = css.theme({ primary: 'blue' }, { primary: 'lightblue' }, { attribute: 'theme' });

      const cssRule = theme.toString();

      expect(cssRule).toContain('theme="');
    });

    it('should handle camelCase properties', () => {
      const theme = css.theme({
        backgroundColor: '#ffffff',
        primaryColor: '#3b82f6',
      });

      expect(theme.primaryColor).toBe('var(--primary-color)');
      expect(theme.backgroundColor).toBe('var(--background-color)');
    });

    it('should handle kebab-case properties', () => {
      const theme = css.theme({
        '--custom-color': '#3b82f6',
      });

      const cssRule = theme.toString();
      expect(cssRule).toContain('--custom-color: #3b82f6');
    });

    it('should support numeric values', () => {
      const theme = css.theme({
        fontSize: 16,
        lineHeight: 1.5,
      });

      const cssRule = theme.toString();

      expect(cssRule).toContain('--font-size: 16');
      expect(cssRule).toContain('--line-height: 1.5');
    });
  });

  describe('css.classes()', () => {
    it('should create class string from object', () => {
      const classes = css.classes({
        active: true,
        disabled: false,
        primary: true,
      });

      expect(classes).toContain('active');
      expect(classes).toContain('primary');
      expect(classes).not.toContain('disabled');
    });

    it('should handle array of strings', () => {
      const classes = css.classes(['btn', 'btn-primary', 'active']);

      expect(classes).toBe('btn btn-primary active');
    });

    it('should handle mixed array', () => {
      const classes = css.classes(['btn', false, 'primary', null, 'active', undefined]);

      expect(classes).toBe('btn primary active');
    });

    it('should handle array with object', () => {
      const classes = css.classes([
        'btn',
        {
          active: true,
          disabled: false,
        },
        'primary',
      ]);

      expect(classes).toContain('btn');
      expect(classes).toContain('active');
      expect(classes).toContain('primary');
      expect(classes).not.toContain('disabled');
    });

    it('should handle empty values', () => {
      const classes = css.classes({
        active: false,
        disabled: false,
      });

      expect(classes).toBe('');
    });

    it('should handle undefined values in object', () => {
      const classes = css.classes({
        active: true,
        disabled: undefined,
        primary: false,
      });

      expect(classes).toBe('active');
    });

    it('should filter out falsy values in array', () => {
      const classes = css.classes(['btn', '', false, null, undefined, 'active']);

      expect(classes).toBe('btn active');
    });
  });

  describe('css.styles()', () => {
    it('should create inline style string', () => {
      const styles = css.styles({
        backgroundColor: 'blue',
        color: 'red',
        fontSize: '16px',
      });

      expect(styles).toContain('color: red');
      expect(styles).toContain('background-color: blue');
      expect(styles).toContain('font-size: 16px');
    });

    it('should convert camelCase to kebab-case', () => {
      const styles = css.styles({
        backgroundColor: 'blue',
        borderRadius: '4px',
        marginTop: '1rem',
      });

      expect(styles).toContain('background-color');
      expect(styles).toContain('border-radius');
      expect(styles).toContain('margin-top');
    });

    it('should filter out null values', () => {
      const styles = css.styles({
        backgroundColor: null,
        color: 'red',
        fontSize: '16px',
      });

      expect(styles).toContain('color: red');
      expect(styles).not.toContain('background-color');
      expect(styles).toContain('font-size: 16px');
    });

    it('should filter out undefined values', () => {
      const styles = css.styles({
        backgroundColor: undefined,
        color: 'red',
        fontSize: '16px',
      });

      expect(styles).toContain('color: red');
      expect(styles).not.toContain('background-color');
      expect(styles).toContain('font-size: 16px');
    });

    it('should handle numeric values', () => {
      const styles = css.styles({
        height: 200,
        opacity: 0.5,
        width: 100,
      });

      expect(styles).toContain('width: 100');
      expect(styles).toContain('height: 200');
      expect(styles).toContain('opacity: 0.5');
    });

    it('should handle empty object', () => {
      const styles = css.styles({});

      expect(styles).toBe('');
    });

    it('should join multiple properties with semicolon', () => {
      const styles = css.styles({
        color: 'red',
        fontSize: '16px',
      });

      expect(styles).toMatch(/color: red; font-size: 16px|font-size: 16px; color: red/);
    });
  });

  describe('Integration', () => {
    it('should work with theme in template', () => {
      const theme = css.theme({
        primary: '#3b82f6',
        secondary: '#10b981',
      });

      const styles = css`
				${theme}
				
				.button {
					background: ${theme.primary};
					color: white;
				}
				
				.button.secondary {
					background: ${theme.secondary};
				}
			`;

      expect(styles).toContain(':host');
      expect(styles).toContain('--primary');
      expect(styles).toContain('var(--primary)');
      expect(styles).toContain('var(--secondary)');
    });

    it('should combine classes and styles', () => {
      const isActive = true;
      const isPrimary = true;

      const classNames = css.classes({
        active: isActive,
        btn: true,
        disabled: false,
        primary: isPrimary,
      });

      const inlineStyles = css.styles({
        color: isActive ? 'blue' : 'gray',
        display: isPrimary ? 'block' : 'inline',
        fontSize: '16px',
      });

      expect(classNames).toContain('btn');
      expect(classNames).toContain('active');
      expect(classNames).toContain('primary');

      expect(inlineStyles).toContain('color: blue');
      expect(inlineStyles).toContain('display: block');
    });

    it('should handle dynamic theme switching', () => {
      const lightTheme = css.theme({ bg: '#ffffff', text: '#000000' }, { bg: '#1a1a1a', text: '#ffffff' });

      const styles = css`
				${lightTheme}
				
				.container {
					background: ${lightTheme.bg};
					color: ${lightTheme.text};
				}
			`;

      expect(styles).toContain('var(--bg)');
      expect(styles).toContain('var(--text)');
      expect(styles).toContain('prefers-color-scheme');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long class lists', () => {
      const classes = css.classes(Array.from({ length: 100 }, (_, i) => `class-${i}`));

      expect(classes.split(' ').length).toBe(100);
    });

    it('should handle special characters in values', () => {
      const styles = css.styles({
        content: '"Hello World"',
        fontFamily: "'Roboto', sans-serif",
      });

      expect(styles).toContain('"Hello World"');
      expect(styles).toContain("'Roboto'");
    });

    it('should handle CSS custom properties', () => {
      const styles = css.styles({
        '--custom-color': '#3b82f6',
        '--spacing': '1rem',
      } as any);

      expect(styles).toContain('--custom-color: #3b82f6');
      expect(styles).toContain('--spacing: 1rem');
    });

    it('should handle empty strings in classes array', () => {
      const classes = css.classes(['btn', '', 'active', '']);

      expect(classes).toBe('btn active');
    });
  });
});
