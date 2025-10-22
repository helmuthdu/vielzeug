# Fetchit API Reference

This document describes the public API of the `@vielzeug/fetchit` package.

## Http Methods

- `Http.get(url, config?)` – GET request
- `Http.post(url, config?)` – POST request
- `Http.put(url, config?)` – PUT request
- `Http.patch(url, config?)` – PATCH request
- `Http.delete(url, config?)` – DELETE request
- `Http.setHeaders(headers)` – Set default headers

## Factory & Utilities

- `createFetchService(context?)` – Create a custom Http instance
- `buildUrl(baseUrl, params?)` – Build a URL with query params

## Types

- `RequestConfig`: Request options (method, headers, body, etc.)
- `RequestResponse<T>`: `{ data: T; ok: boolean; status: number; }`
- `ContextProps`: Context for base URL, headers, params, timeout, etc.
- `RequestErrorType`: Common HTTP error codes
- `RequestStatus`: 'ERROR' | 'PENDING' | 'SUCCESS'

See source for full type details and generics support.
