import {
  FORM_ERROR,
  ForgeConfigError,
  ForgeDisposedError,
  ForgeError,
  ForgeSubmitError,
  ForgeValidationError,
} from '../../index';

describe('ForgeError hierarchy', () => {
  test('ForgeError.is() returns false for a plain Error instance', () => {
    expect(ForgeError.is(new Error('not a forge error'))).toBe(false);
  });

  test.each([
    ['a string', 'not an error'],
    ['a plain object', { message: 'looks like an error' }],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
  ])('ForgeError.is() returns false for %s', (_, value) => {
    expect(ForgeError.is(value)).toBe(false);
  });

  test.each([
    ['ForgeError', new ForgeError('base error')],
    ['ForgeConfigError', new ForgeConfigError('config error')],
    ['ForgeDisposedError', new ForgeDisposedError()],
    ['ForgeSubmitError', new ForgeSubmitError('submit error')],
    ['ForgeValidationError', new ForgeValidationError({ field: 'bad' })],
  ] as const)(
    '%s instances are recognized by ForgeError.is() and set .name to their own class name',
    (className, error) => {
      expect(ForgeError.is(error)).toBe(true);
      expect(error).toBeInstanceOf(ForgeError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(className);
    },
  );

  test('ForgeValidationError exposes the exact errors map passed to its constructor', () => {
    const errors = { email: 'Invalid', name: 'Required' };
    const error = new ForgeValidationError(errors);

    expect(error.errors).toBe(errors);
    expect(error.message).toBe('Form validation failed');
  });

  test('ForgeDisposedError always carries the same fixed message', () => {
    expect(new ForgeDisposedError().message).toBe('Cannot modify a disposed form');
  });

  test('the base ForgeError supports cause chaining via ErrorOptions', () => {
    const cause = new Error('root cause');
    const error = new ForgeError('wrapped', { cause });

    expect(error.cause).toBe(cause);
  });
});

describe('FORM_ERROR constant', () => {
  test('is the reserved literal "_form"', () => {
    expect(FORM_ERROR).toBe('_form');
  });
});
