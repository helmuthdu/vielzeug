import { kebabCase } from '../kebabCase';

describe('kebabCase', () => {
  it('should convert a single word to lowercase', () => {
    expect(kebabCase('Hello')).toBe('hello');
  });

  it('should convert a space-separated string to kebab case', () => {
    expect(kebabCase('hello world')).toBe('hello-world');
  });

  it('should convert a camelCase string to kebab case', () => {
    expect(kebabCase('helloWorld')).toBe('hello-world');
  });

  it('should convert a PascalCase string to kebab case', () => {
    expect(kebabCase('HelloWorld')).toBe('hello-world');
  });

  it('should convert an underscore-separated string to kebab case', () => {
    expect(kebabCase('hello_world')).toBe('hello-world');
  });

  it('should handle mixed separators correctly', () => {
    expect(kebabCase('hello_world testExample')).toBe('hello-world-test-example');
  });

  it('should handle strings with leading and trailing separators', () => {
    expect(kebabCase('-hello-world-')).toBe('hello-world');
    expect(kebabCase('_hello_world_')).toBe('hello-world');
    expect(kebabCase(' hello world ')).toBe('hello-world');
  });

  it('should handle strings with multiple consecutive separators', () => {
    expect(kebabCase('hello--world')).toBe('hello-world');
    expect(kebabCase('hello__world')).toBe('hello-world');
    expect(kebabCase('hello  world')).toBe('hello-world');
  });

  it('should return an empty string if input is empty', () => {
    expect(kebabCase('')).toBe('');
  });

  it('should handle strings with no separators', () => {
    expect(kebabCase('helloworld')).toBe('helloworld');
  });

  it('should handle strings with only separators', () => {
    expect(kebabCase('---')).toBe('');
    expect(kebabCase('___')).toBe('');
    expect(kebabCase('   ')).toBe('');
  });

  it('should handle strings with special characters', () => {
    expect(kebabCase('hello-world!')).toBe('hello-world');
    expect(kebabCase('hello_world@')).toBe('hello-world');
  });

  it('should handle strings with numbers', () => {
    expect(kebabCase('helloWorld123')).toBe('hello-world-123');
    expect(kebabCase('123HelloWorld')).toBe('123-hello-world');
  });
});
