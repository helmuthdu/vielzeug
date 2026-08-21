export function controlValue(event: Event): string | undefined {
  const target = event.currentTarget;

  if (target === null || !('value' in target) || typeof target.value !== 'string') return undefined;

  return target.value;
}
