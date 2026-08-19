import { compileTemplate, type Template } from './_template';
import { LinguaInvalidCatalogError } from './errors';
import type { Catalog, CatalogNode, PluralMessage } from './types';

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

export type CompiledText = { readonly kind: 'text'; readonly template: Template };
export type CompiledPlural = { readonly forms: ReadonlyMap<string, Template>; readonly kind: 'plural' };
export type CompiledMessage = CompiledPlural | CompiledText;
export type CompiledCatalog = ReadonlyMap<string, CompiledMessage>;

export function isPluralMessage(node: CatalogNode): node is PluralMessage {
  return typeof node === 'object' && node !== null && Object.hasOwn(node, 'plural');
}

/** Compile explicit catalog nodes once. Nested objects only group keys; plural intent is never inferred. */
export function compileCatalog(catalog: Catalog): CompiledCatalog {
  const messages = new Map<string, CompiledMessage>();

  const visit = (node: CatalogNode, prefix: string): void => {
    if (typeof node === 'string') {
      messages.set(prefix, { kind: 'text', template: compileTemplate(node) });

      return;
    }

    if (typeof node !== 'object' || node === null || Array.isArray(node)) {
      throw new LinguaInvalidCatalogError(`Catalog node "${prefix}" must be a string, plural message, or object.`);
    }

    if (isPluralMessage(node)) {
      if (Reflect.ownKeys(node).some((key) => key !== 'plural')) {
        throw new LinguaInvalidCatalogError(`Plural message "${prefix}" must contain only a "plural" property.`);
      }

      if (typeof node.plural !== 'object' || node.plural === null || Array.isArray(node.plural)) {
        throw new LinguaInvalidCatalogError(`Plural message "${prefix}" must provide an object of string forms.`);
      }

      const forms = new Map<string, Template>();

      for (const [form, template] of Object.entries(node.plural)) {
        if (typeof template !== 'string') {
          throw new LinguaInvalidCatalogError(`Plural form "${prefix}.${form}" must be a string.`);
        }

        forms.set(form, compileTemplate(template));
      }

      messages.set(prefix, { forms, kind: 'plural' });

      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (unsafeKeys.has(key)) {
        throw new LinguaInvalidCatalogError(`Catalog key "${key}" is reserved.`);
      }

      visit(value, prefix ? `${prefix}.${key}` : key);
    }
  };

  for (const [key, value] of Object.entries(catalog)) {
    if (unsafeKeys.has(key)) throw new LinguaInvalidCatalogError(`Catalog key "${key}" is reserved.`);

    visit(value, key);
  }

  return messages;
}
