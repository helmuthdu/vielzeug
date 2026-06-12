import { camelCase } from '../camelCase';

describe('camelCase', () => {
  it('should convert a single word to lowercase', () => {
    expect(camelCase('Hello')).toBe('hello');
  });

  it('should convert a space-separated string to camel case', () => {
    expect(camelCase('hello world')).toBe('helloWorld');
  });

  it('should convert a hyphen-separated string to camel case', () => {
    expect(camelCase('hello-world')).toBe('helloWorld');
  });

  it('should convert an underscore-separated string to camel case', () => {
    expect(camelCase('hello_world')).toBe('helloWorld');
  });

  it('should handle mixed separators correctly', () => {
    expect(camelCase('hello-world_test example')).toBe('helloWorldTestExample');
  });

  it('should handle strings with leading and trailing separators', () => {
    expect(camelCase('-hello-world-')).toBe('helloWorld');
    expect(camelCase('_hello_world_')).toBe('helloWorld');
    expect(camelCase(' hello world ')).toBe('helloWorld');
  });

  it('should handle strings with multiple consecutive separators', () => {
    expect(camelCase('hello--world')).toBe('helloWorld');
    expect(camelCase('hello__world')).toBe('helloWorld');
    expect(camelCase('hello  world')).toBe('helloWorld');
  });

  it('should return an empty string if input is empty', () => {
    expect(camelCase('')).toBe('');
  });

  it('should handle strings with no separators', () => {
    expect(camelCase('helloworld')).toBe('helloworld');
  });

  it('should handle strings with only separators', () => {
    expect(camelCase('---')).toBe('');
    expect(camelCase('___')).toBe('');
    expect(camelCase('   ')).toBe('');
  });

  it('should handle strings with special characters', () => {
    expect(camelCase('hello-world!')).toBe('helloWorld');
    expect(camelCase('hello_world@')).toBe('helloWorld');
  });

  it('should handle strings with numbers', () => {
    expect(camelCase('hello-world-123')).toBe('helloWorld123');
    expect(camelCase('123-hello-world')).toBe('123HelloWorld');
  });
});
