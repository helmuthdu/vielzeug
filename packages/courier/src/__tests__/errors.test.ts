import { describe, expect, it } from 'vitest';

import {
  CourierAbortError,
  CourierError,
  CourierHttpError,
  CourierNetworkError,
  CourierSchemaValidationError,
  CourierTimeoutError,
} from '../errors';

describe('CourierError', () => {
  it('is() returns true for the base class and every subclass instance', () => {
    expect(CourierError.is(new CourierError('boom'))).toBe(true);
    expect(
      CourierError.is(
        new CourierHttpError({
          data: null,
          headers: new Headers(),
          message: 'x',
          method: 'GET',
          status: 500,
          url: 'x',
        }),
      ),
    ).toBe(true);
  });

  it('is() returns false for non-CourierError values', () => {
    expect(CourierError.is(new Error('plain'))).toBe(false);
    expect(CourierError.is(null)).toBe(false);
    expect(CourierError.is(undefined)).toBe(false);
    expect(CourierError.is('not an error')).toBe(false);
  });

  it('sets name to the concrete subclass name, not "CourierError"', () => {
    const err = new CourierHttpError({
      data: null,
      headers: new Headers(),
      message: 'x',
      method: 'GET',
      status: 500,
      url: 'x',
    });

    expect(err.name).toBe('CourierHttpError');
  });
});

describe('CourierHttpError', () => {
  describe('properties', () => {
    it('stores url, method, status, data, headers', () => {
      const headers = new Headers({ 'x-id': '42' });
      const err = new CourierHttpError({
        data: { error: 'not found' },
        headers,
        message: 'Not found',
        method: 'DELETE',
        status: 404,
        url: 'https://api.example.com/users/1',
      });

      expect(err.url).toBe('https://api.example.com/users/1');
      expect(err.method).toBe('DELETE');
      expect(err.status).toBe(404);
      expect(err.data).toEqual({ error: 'not found' });
      expect(err.headers).toBe(headers);
      expect(err.name).toBe('CourierHttpError');
    });

    it('is a CourierError', () => {
      const err = new CourierHttpError({
        data: null,
        headers: new Headers(),
        message: 'err',
        method: 'GET',
        status: 400,
        url: '/',
      });

      expect(err).toBeInstanceOf(CourierError);
    });
  });

  describe('static helpers', () => {
    it('fromResponse() creates an CourierHttpError with status and headers', () => {
      const res = new Response(null, {
        headers: { 'x-request-id': 'abc' },
        status: 422,
        statusText: 'Unprocessable Entity',
      });
      const err = CourierHttpError.fromResponse(res, { errors: ['invalid'] }, 'POST', '/users');

      expect(err).toBeInstanceOf(CourierHttpError);
      expect(err.status).toBe(422);
      expect(err.message).toBe('Unprocessable Entity');
      expect(err.method).toBe('POST');
      expect(err.data).toEqual({ errors: ['invalid'] });
    });

    it('fromResponse() uses HTTP status code when statusText is empty (e.g. HTTP/2)', () => {
      const res = new Response(null, { status: 500, statusText: '' });
      const err = CourierHttpError.fromResponse(res, null, 'GET', '/');

      expect(err.message).toBe('HTTP 500');
    });

    it('is() returns true for CourierHttpError instances', () => {
      const err = new CourierHttpError({
        data: null,
        headers: new Headers(),
        message: 'err',
        method: 'GET',
        status: 400,
        url: '/',
      });

      expect(CourierHttpError.is(err)).toBe(true);
      expect(CourierHttpError.is(err, 400)).toBe(true);
      expect(CourierHttpError.is(err, 404)).toBe(false);
    });

    it('is() returns false for non-CourierHttpError values', () => {
      expect(CourierHttpError.is(new Error('plain'))).toBe(false);
      expect(CourierHttpError.is(null)).toBe(false);
      expect(CourierHttpError.is('string')).toBe(false);
    });
  });
});

describe('CourierNetworkError', () => {
  it('stores url and method', () => {
    const err = new CourierNetworkError({ message: 'fail', method: 'POST', url: '/api' });

    expect(err.url).toBe('/api');
    expect(err.method).toBe('POST');
    expect(err.name).toBe('CourierNetworkError');
  });

  it('is a CourierError', () => {
    expect(new CourierNetworkError({ message: 'x', method: 'GET', url: '/' })).toBeInstanceOf(CourierError);
  });
});

describe('CourierTimeoutError', () => {
  it('stores url and method', () => {
    const err = new CourierTimeoutError({ message: 'timed out', method: 'GET', url: '/slow' });

    expect(err.url).toBe('/slow');
    expect(err.name).toBe('CourierTimeoutError');
  });

  it('is a CourierError', () => {
    expect(new CourierTimeoutError({ message: 'x', method: 'GET', url: '/' })).toBeInstanceOf(CourierError);
  });
});

describe('CourierAbortError', () => {
  it('stores url and method', () => {
    const err = new CourierAbortError({ message: 'aborted', method: 'DELETE', url: '/resource' });

    expect(err.url).toBe('/resource');
    expect(err.name).toBe('CourierAbortError');
  });

  it('is a CourierError', () => {
    expect(new CourierAbortError({ message: 'x', method: 'GET', url: '/' })).toBeInstanceOf(CourierError);
  });
});

describe('CourierSchemaValidationError', () => {
  it('stores data and cause', () => {
    const cause = new Error('bad schema');
    const err = new CourierSchemaValidationError(cause, { raw: true });

    expect(err.data).toEqual({ raw: true });
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('CourierSchemaValidationError');
  });

  it('is a CourierError', () => {
    expect(new CourierSchemaValidationError(new Error(), null)).toBeInstanceOf(CourierError);
  });
});
