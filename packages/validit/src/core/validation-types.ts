export type Issue = {
  code: string;
  message: string;
  params?: Record<string, unknown>;
  path: (string | number)[];
};

export type ValidateFn = (value: unknown, path: (string | number)[]) => Issue[] | null;
export type AsyncValidateFn = (value: unknown, path: (string | number)[]) => Promise<Issue[] | null>;
