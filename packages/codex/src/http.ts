import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  createMcpHandler,
  hostHeaderValidationResponse,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  type McpHttpHandler,
  originValidationResponse,
  type Server,
} from '@modelcontextprotocol/server';
import { log } from './_log.js';
import type { Catalog } from './catalog.js';
import { CodexError } from './errors.js';
import { createMcpServer } from './server.js';

export interface HttpHost {
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  readonly host: string;
  readonly port: number;
  [Symbol.asyncDispose](): Promise<void>;
}

export interface HttpHostOptions {
  catalog: Catalog;
  /** Optional hook invoked after generic tools are registered (e.g. to register Refine tools). */
  configureServer?: (server: Server) => void;
  debug?: boolean;
  host?: '127.0.0.1' | '::1';
  port: number;
  version: string;
}

function close(server: HttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections?.();
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

/**
 * Builds a Web-standard `Request` from a Node `IncomingMessage` — `createMcpHandler()`'s
 * `fetch()` face speaks Fetch API objects (2026-07-28's stateless transport is Web-standard
 * `Request`/`Response`, not Node's own `req`/`res` pair), so the loopback host bridges once here.
 */
function toWebRequest(request: IncomingMessage): Request {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) for (const entry of value) headers.append(key, entry);
    else headers.set(key, value);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const path = request.url?.startsWith('/') ? request.url : '/';

  return new Request(`http://localhost${path}`, {
    ...(hasBody && { body: Readable.toWeb(request) as ReadableStream, duplex: 'half' }),
    headers,
    method: request.method,
  });
}

/** Writes a Web-standard `Response` back onto a Node `ServerResponse`, preserving repeated headers. */
async function sendWebResponse(webResponse: Response, response: ServerResponse): Promise<void> {
  response.statusCode = webResponse.status;

  for (const [key, value] of webResponse.headers) response.appendHeader(key, value);

  if (!webResponse.body) {
    response.end();

    return;
  }

  await pipeline(Readable.fromWeb(webResponse.body), response);
}

/** Streamable HTTP host owns every transport and only listens on loopback addresses. */
export async function startHttpHost(options: HttpHostOptions): Promise<HttpHost> {
  const host = options.host ?? '127.0.0.1';

  if (host !== '127.0.0.1' && host !== '::1') {
    throw new CodexError('HTTP host must be a loopback address (127.0.0.1 or ::1).');
  }
  // Stateless by default (SEP-2575): a fresh server instance per request, matching the
  // spec's "any request can land on any instance" design — codex's tools carry no
  // per-connection state, so a persistent instance buys nothing beyond a small, negligible
  // (13-tool catalog) reconstruction cost per request.
  const factory = () => {
    const server = createMcpServer(options.catalog, { debug: options.debug, version: options.version });

    options.configureServer?.(server);

    return server;
  };

  // `createMcpHandler()` creates and configures one fresh server per MCP request.
  const handler: McpHttpHandler = createMcpHandler(factory);
  const allowedHosts = localhostAllowedHostnames();
  const allowedOrigins = localhostAllowedOrigins();
  const httpServer = createServer((request, response) => {
    const webRequest = toWebRequest(request);
    const rejected =
      hostHeaderValidationResponse(webRequest, allowedHosts) ?? originValidationResponse(webRequest, allowedOrigins);

    if (rejected) {
      request.resume();
      void sendWebResponse(rejected, response).catch((error: unknown) => {
        if (!response.writableEnded) response.end();
        log(`HTTP validation response error: ${error instanceof Error ? error.message : String(error)}`);
      });
      return;
    }

    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'ok', version: options.version }));

      return;
    }

    handler
      .fetch(webRequest)
      .then((webResponse) => sendWebResponse(webResponse, response))
      .catch((error: unknown) => {
        if (!response.headersSent) {
          response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ error: 'MCP request failed' }));
        } else if (!response.writableEnded) response.end();

        log(`HTTP MCP error: ${error instanceof Error ? error.message : String(error)}`);
      });
  });

  const disposal = new AbortController();
  let listening = false;
  let disposed = false;
  let disposing: Promise<void> | undefined;

  const dispose = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (disposing) return disposing;

    disposing = (async () => {
      const errors: unknown[] = [];

      try {
        if (listening) await close(httpServer);
        listening = false;
      } catch (error) {
        errors.push(error);
      }

      try {
        await handler.close();
      } catch (error) {
        errors.push(error);
      }

      if (errors.length > 0) throw new AggregateError(errors, 'Failed to dispose Codex HTTP host');

      disposed = true;
      disposal.abort();
    })().finally(() => {
      disposing = undefined;
    });

    return disposing;
  };

  try {
    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(options.port, host, () => {
        httpServer.off('error', reject);
        listening = true;
        resolve();
      });
    });
  } catch (error) {
    await dispose();
    throw error;
  }

  const address = httpServer.address();
  const port = address && typeof address === 'object' ? address.port : options.port;

  log(`codex MCP HTTP host listening on http://${host}:${port}/`);

  return {
    get disposalSignal() {
      return disposal.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    host,
    port,
    [Symbol.asyncDispose]: dispose,
  };
}
