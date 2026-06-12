import { describe, expect, it } from 'vitest';

import { HttpError } from '../errors';

describe('HttpError', () => {
  describe('classifyKind()', () => {
    it("classifies as 'http' when status is present", () => {
      const err = new HttpError({ message: 'Not Found', method: 'GET', status: 404, url: '/test' });

      expect(err.kind).toBe('http');
    });

    it("classifies as 'network' when no status, cause, or signal reason", () => {
      const err = new HttpError({ message: 'Network error', method: 'GET', url: '/test' });

      expect(err.kind).toBe('network');
    });

    it("classifies as 'abort' when cause is a DOMException AbortError", () => {
      const cause = new DOMException('User aborted', 'AbortError');
      const err = new HttpError({ cause, message: 'Aborted', method: 'GET', url: '/test' });

      expect(err.kind).toBe('abort');
    });

    it("classifies as 'timeout' when cause is a DOMException TimeoutError", () => {
      const cause = new DOMException('Timed out', 'TimeoutError');
      const err = new HttpError({ cause, message: 'Timeout', method: 'GET', url: '/test' });

      expect(err.kind).toBe('timeout');
    });

    it("classifies as 'timeout' when signalReason has name 'TimeoutError'", () => {
      // Use a plain Error with name='TimeoutError' — in jsdom DOMException does not extend
      // Error, so the `instanceof Error && .name === 'TimeoutError'` check uses this form.
      const timeoutErr = Object.assign(new Error('Timeout'), { name: 'TimeoutError' });
      const err = new HttpError({
        message: 'Timeout',
        method: 'GET',
        signalReason: timeoutErr,
        url: '/test',
      });

      expect(err.kind).toBe('timeout');
    });

    it("classifies as 'abort' when cause is an Error with name 'AbortError'", () => {
      const cause = Object.assign(new Error('Aborted'), { name: 'AbortError' });
      const err = new HttpError({ cause, message: 'Aborted', method: 'GET', url: '/test' });

      expect(err.kind).toBe('abort');
    });

    it("classifies as 'abort' when aborted:true with no cause", () => {
      const err = new HttpError({ aborted: true, message: 'Aborted', method: 'GET', url: '/test' });

      expect(err.kind).toBe('abort');
    });

    it('signalReason takes priority over cause for TimeoutError', () => {
      const timeoutErr = Object.assign(new Error('Timeout'), { name: 'TimeoutError' });
      const cause = new DOMException('Abort', 'AbortError');
      const err = new HttpError({
        cause,
        message: 'Timeout',
        method: 'GET',
        signalReason: timeoutErr,
        url: '/test',
      });

      expect(err.kind).toBe('timeout');
    });
  });

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

    it('isTimeout returns true when kind is timeout', () => {
      const cause = new DOMException('Timeout', 'TimeoutError');
      const err = new HttpError({ cause, message: 'Timeout', method: 'GET', url: '/test' });

      expect(err.isTimeout).toBe(true);
      expect(err.isAborted).toBe(false);
    });

    it('isAborted returns true when kind is abort', () => {
      const err = new HttpError({ aborted: true, message: 'Aborted', method: 'GET', url: '/test' });

      expect(err.isAborted).toBe(true);
      expect(err.isTimeout).toBe(false);
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

      expect(err.kind).toBe('http');
      expect(err.status).toBe(422);
      expect(err.message).toBe('Unprocessable Entity');
      expect(err.method).toBe('POST');
      expect(err.data).toEqual({ errors: ['invalid'] });
    });

    it('fromResponse() uses HTTP status code when statusText is empty (e.g. HTTP/2)', () => {
      const res = new Response(null, { status: 500, statusText: '' });
      const err = HttpError.fromResponse(res, null, 'GET', '/');

      expect(err.message).toBe('HTTP 500');
    });

    it('fromCause() creates a network error from a plain Error', () => {
      const cause = new Error('fetch failed');
      const err = HttpError.fromCause(cause, 'GET', '/test');

      expect(err.kind).toBe('network');
      expect(err.message).toBe('fetch failed');
      expect(err.cause).toBe(cause);
    });

    it('fromCause() reads signal.reason for timeout classification', () => {
      const ac = new AbortController();
      const timeoutReason = Object.assign(new Error('Timeout'), { name: 'TimeoutError' });

      ac.abort(timeoutReason);

      const err = HttpError.fromCause(new Error('aborted'), 'GET', '/test', ac.signal);

      expect(err.kind).toBe('timeout');
    });

    it('fromCause() uses String(cause) when cause is not an Error', () => {
      const err = HttpError.fromCause('string cause', 'GET', '/test');

      expect(err.message).toBe('string cause');
    });

    it('is() returns true for HttpError instances', () => {
      const err = new HttpError({ message: 'err', method: 'GET', status: 400, url: '/' });

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
