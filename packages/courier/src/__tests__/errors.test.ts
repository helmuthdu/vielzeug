import { describe, expect, it } from 'vitest';

import { AbortError, CourierError, HttpError, NetworkError, SchemaValidationError, TimeoutError } from '../errors';

describe('HttpError', () => {
  describe('properties', () => {
    it('stores url, method, status, data, headers', () => {
      const headers = new Headers({ 'x-id': '42' });
      const err = new HttpError({
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
      expect(err.name).toBe('HttpError');
    });

    it('is a CourierError', () => {
      const err = new HttpError({
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
    it('fromResponse() creates an HttpError with status and headers', () => {
      const res = new Response(null, {
        headers: { 'x-request-id': 'abc' },
        status: 422,
        statusText: 'Unprocessable Entity',
      });
      const err = HttpError.fromResponse(res, { errors: ['invalid'] }, 'POST', '/users');

      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBe(422);
      expect(err.message).toBe('[@vielzeug/courier] Unprocessable Entity');
      expect(err.method).toBe('POST');
      expect(err.data).toEqual({ errors: ['invalid'] });
    });

    it('fromResponse() uses HTTP status code when statusText is empty (e.g. HTTP/2)', () => {
      const res = new Response(null, { status: 500, statusText: '' });
      const err = HttpError.fromResponse(res, null, 'GET', '/');

      expect(err.message).toBe('[@vielzeug/courier] HTTP 500');
    });

    it('is() returns true for HttpError instances', () => {
      const err = new HttpError({
        data: null,
        headers: new Headers(),
        message: 'err',
        method: 'GET',
        status: 400,
        url: '/',
      });

      expect(HttpError.is(err)).toBe(true);
      expect(HttpError.is(err, 400)).toBe(true);
      expect(HttpError.is(err, 404)).toBe(false);
    });

    it('is() returns false for non-HttpError values', () => {
      expect(HttpError.is(new Error('plain'))).toBe(false);
      expect(HttpError.is(null)).toBe(false);
      expect(HttpError.is('string')).toBe(false);
    });
  });
});

describe('NetworkError', () => {
  it('stores url and method', () => {
    const err = new NetworkError({ message: 'fail', method: 'POST', url: '/api' });

    expect(err.url).toBe('/api');
    expect(err.method).toBe('POST');
    expect(err.name).toBe('NetworkError');
  });

  it('is a CourierError', () => {
    expect(new NetworkError({ message: 'x', method: 'GET', url: '/' })).toBeInstanceOf(CourierError);
  });
});

describe('TimeoutError', () => {
  it('stores url and method', () => {
    const err = new TimeoutError({ message: 'timed out', method: 'GET', url: '/slow' });

    expect(err.url).toBe('/slow');
    expect(err.name).toBe('TimeoutError');
  });

  it('is a CourierError', () => {
    expect(new TimeoutError({ message: 'x', method: 'GET', url: '/' })).toBeInstanceOf(CourierError);
  });
});

describe('AbortError', () => {
  it('stores url and method', () => {
    const err = new AbortError({ message: 'aborted', method: 'DELETE', url: '/resource' });

    expect(err.url).toBe('/resource');
    expect(err.name).toBe('AbortError');
  });

  it('is a CourierError', () => {
    expect(new AbortError({ message: 'x', method: 'GET', url: '/' })).toBeInstanceOf(CourierError);
  });
});

describe('SchemaValidationError', () => {
  it('stores data and cause', () => {
    const cause = new Error('bad schema');
    const err = new SchemaValidationError(cause, { raw: true });

    expect(err.data).toEqual({ raw: true });
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('SchemaValidationError');
  });

  it('is a CourierError', () => {
    expect(new SchemaValidationError(new Error(), null)).toBeInstanceOf(CourierError);
  });
});
