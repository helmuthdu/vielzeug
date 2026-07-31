export function bindRefetch(cache: { refetchStale(): void }, options?: { signal?: AbortSignal }): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};

  const onVisible = () => {
    if (document.visibilityState === 'visible') cache.refetchStale();
  };
  const onOnline = () => cache.refetchStale();

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);

  const dispose = () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
  };

  options?.signal?.addEventListener('abort', dispose, { once: true });

  return dispose;
}
