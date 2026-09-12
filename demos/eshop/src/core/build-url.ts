import type { Configuration, Model } from './types';

export function buildConfigurationUrl(model: Model, configuration: Configuration): string {
  const query = new URLSearchParams({
    color: configuration.colorId,
    trim: configuration.trimId,
    wheel: configuration.wheelId,
  });
  if (configuration.packageIds.length) query.set('packages', configuration.packageIds.join(','));
  const path = `/models/${encodeURIComponent(model.slug)}?${query}`;

  return import.meta.env.BASE_URL === '/'
    ? new URL(path, location.origin).toString()
    : `${location.origin}${import.meta.env.BASE_URL}#${path}`;
}
