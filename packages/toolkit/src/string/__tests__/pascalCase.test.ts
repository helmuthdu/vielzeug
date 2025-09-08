import { pascalCase } from '../pascalCase';

describe('pascalCase', () => {
  it('should convert a single word to PascalCase', () => {
    expect(pascalCase('hello')).toBe('Hello');
  });

  it('should convert a space-separated string to PascalCase', () => {
    expect(pascalCase('hello world')).toBe('HelloWorld');
  });

  it('should convert a kebab-case string to PascalCase', () => {
    expect(pascalCase('hello-world')).toBe('HelloWorld');
  });

  it('should convert an underscore-separated string to PascalCase', () => {
    expect(pascalCase('hello_world')).toBe('HelloWorld');
  });

  it('should convert a camelCase string to PascalCase', () => {
    expect(pascalCase('helloWorld')).toBe('HelloWorld');
  });

  it('should convert a mixed-case string to PascalCase', () => {
    expect(pascalCase('hello-World test_example')).toBe('HelloWorldTestExample');
  });

  it('should handle strings with leading and trailing separators', () => {
    expect(pascalCase('-hello-world-')).toBe('HelloWorld');
    expect(pascalCase('_hello_world_')).toBe('HelloWorld');
    expect(pascalCase(' hello world ')).toBe('HelloWorld');
  });

  it('should handle strings with multiple consecutive separators', () => {
    expect(pascalCase('hello--world')).toBe('HelloWorld');
    expect(pascalCase('hello__world')).toBe('HelloWorld');
    expect(pascalCase('hello  world')).toBe('HelloWorld');
  });

  it('should return an empty string if input is empty', () => {
    expect(pascalCase('')).toBe('');
  });

  it('should handle strings with no separators', () => {
    expect(pascalCase('helloworld')).toBe('Helloworld');
  });

  it('should handle strings with only separators', () => {
    expect(pascalCase('---')).toBe('');
    expect(pascalCase('___')).toBe('');
    expect(pascalCase('   ')).toBe('');
  });

  it('should handle strings with special characters', () => {
    expect(pascalCase('hello-world!')).toBe('HelloWorld');
    expect(pascalCase('hello_world@')).toBe('HelloWorld');
  });

  it('should handle strings with numbers', () => {
    expect(pascalCase('helloWorld123')).toBe('HelloWorld123');
    expect(pascalCase('123HelloWorld')).toBe('123HelloWorld');
  });
});
