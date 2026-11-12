/** The D1 statement subset the core binds; null params model nullable columns. */
export interface D1Statement {
  all<T>(): Promise<{ results?: T[] }>;
  bind(...params: (string | number | null)[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
}

/** The D1 database subset the core uses; a deployment's generated D1Database satisfies it. */
export interface D1Like {
  batch(statements: D1Statement[]): Promise<{ meta?: { changes?: number } }[]>;
  prepare(sql: string): D1Statement;
}
