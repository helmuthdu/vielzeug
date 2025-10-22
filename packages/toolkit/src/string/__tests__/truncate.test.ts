import { truncate } from '../truncate';

describe('truncate', () => {
  it('should return the original string if it is shorter than the limit', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('should truncate the string to the specified limit and add ellipsis', () => {
    expect(truncate('Hello World', 5)).toBe('Hello…');
  });

  it('should truncate the string to the nearest word if completeWords is true', () => {
    expect(truncate('Hello World', 8, true)).toBe('Hello…');
  });

  it('should handle strings with no spaces when completeWords is true', () => {
    expect(truncate('HelloWorld', 5)).toBe('Hello…');
  });

  it('should return the original string if the limit is greater than the string length', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('should use a custom ellipsis if provided', () => {
    expect(truncate('Hello World', 5, false, '...')).toBe('Hello...');
  });

  it('should handle empty strings gracefully', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('should handle a limit of 0', () => {
    expect(truncate('Hello World', 0)).toBe('…');
  });

  it('should handle a limit of 0 with completeWords set to true', () => {
    expect(truncate('Hello World', 0, true)).toBe('…');
  });

  it('should handle strings with only spaces', () => {
    expect(truncate('     ', 3)).toBe('…');
  });
});
