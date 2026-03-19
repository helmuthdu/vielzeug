import { currentRuntime, fire } from './runtime';

export type EmitFn<T extends Record<string, unknown>> = {
  <K extends { [P in keyof T]: T[P] extends undefined ? P : never }[keyof T]>(event: K): void;
  <K extends keyof T>(event: K, detail: T[K]): void;
};

export const createEmitFn = <T extends Record<string, unknown>>(): EmitFn<T> => {
  const el = currentRuntime().el;

  return (<K extends keyof T>(event: K, detail?: T[K]) => {
    fire(el, String(event), { detail });
  }) as EmitFn<T>;
};
