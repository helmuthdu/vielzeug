import { snakeCase } from '../snakeCase';

describe('snakeCase', () => {
  it('should convert a single word to lowercase', () => {
    expect(snakeCase('Hello')).toBe('hello');
  });

  it('should convert a space-separated string to snake_case', () => {
    expect(snakeCase('hello world')).toBe('hello_world');
  });

  it('should convert a camelCase string to snake_case', () => {
    expect(snakeCase('helloWorld')).toBe('hello_world');
  });

  it('should convert a PascalCase string to snake_case', () => {
    expect(snakeCase('HelloWorld')).toBe('hello_world');
  });

  it('should convert a kebab-case string to snake_case', () => {
    expect(snakeCase('hello-world')).toBe('hello_world');
  });

  it('should handle mixed separators correctly', () => {
    expect(snakeCase('hello-world testExample')).toBe('hello_world_test_example');
  });

  it('should handle strings with leading and trailing separators', () => {
    expect(snakeCase('-hello-world-')).toBe('hello_world');
    expect(snakeCase('_hello_world_')).toBe('hello_world');
    expect(snakeCase(' hello world ')).toBe('hello_world');
  });

  it('should handle strings with multiple consecutive separators', () => {
    expect(snakeCase('hello--world')).toBe('hello_world');
    expect(snakeCase('hello__world')).toBe('hello_world');
    expect(snakeCase('hello  world')).toBe('hello_world');
  });

  it('should return an empty string if input is empty', () => {
    expect(snakeCase('')).toBe('');
  });

  it('should handle strings with no separators', () => {
    expect(snakeCase('helloworld')).toBe('helloworld');
  });

  it('should handle strings with only separators', () => {
    expect(snakeCase('---')).toBe('');
    expect(snakeCase('___')).toBe('');
    expect(snakeCase('   ')).toBe('');
  });

  it('should handle strings with special characters', () => {
    expect(snakeCase('hello-world!')).toBe('hello_world');
    expect(snakeCase('hello_world@')).toBe('hello_world');
  });

  it('should handle strings with numbers', () => {
    expect(snakeCase('helloWorld123')).toBe('hello_world_123');
    expect(snakeCase('123HelloWorld')).toBe('123_hello_world');
  });
});
