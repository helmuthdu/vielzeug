import type { Adapter, AnySchema } from '../types';

import { CookieStorage } from './cookie-storage';
import { WebStorageAdapter } from './webstorage';

/* -------------------- CookieAdapter -------------------- */

class CookieAdapter<S extends AnySchema> extends WebStorageAdapter<S> {
  constructor(options: {
    dbName: string;
    path: string;
    sameSite: 'Lax' | 'None' | 'Strict';
    schema: S;
    secure: boolean;
  }) {
    const cookieStorage = new CookieStorage({
      path: options.path,
      sameSite: options.sameSite,
      secure: options.secure,
    });

    super(options.dbName, options.schema, () => cookieStorage, 'document.cookie');
  }
}

/* -------------------- Factory -------------------- */

export function createCookie<S extends AnySchema>(options: {
  dbName: string;
  path?: string;
  sameSite?: 'Lax' | 'None' | 'Strict';
  schema: S;
  secure?: boolean;
}): Adapter<S> {
  return new CookieAdapter({
    dbName: options.dbName,
    path: options.path ?? '/',
    sameSite: options.sameSite ?? 'Strict',
    schema: options.schema,
    secure: options.secure ?? false,
  });
}
