/**
 * Creates a function that runs the provided callback in a web worker with specified dependencies.
 *
 * @example
 * const sum = worker(({ _ }) => (...args) => _.sum([...args]), ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js']);
 * await sum(1, 2); // 3
 *
 * @param callback - A function that receives the worker's `self` and performs work.
 * @param dependencies - (optional) array of URLs to scripts that the worker should import.
 *
 * @returns A function that takes the arguments for the callback and returns a promise with the result.
 */
// biome-ignore lint/suspicious/noExplicitAny: -
export function worker<T extends (...args: any) => any, R = Awaited<ReturnType<T>>>(
  // biome-ignore lint/suspicious/noExplicitAny: -
  callback: (self: any) => T,
  dependencies: string[] = [],
): (...args: Parameters<T>) => Promise<R> {
  const callbackString = callback.toString();
  const workerScript = `
    ${dependencies.map((dep) => `importScripts('${dep}');`).join('\n')}
    const callback = (${callbackString})(self);
    self.onmessage = async function(e) {
      try {
        const result = await callback(...e.data.args);
        self.postMessage({ success: true, result });
      } catch (error) {
        self.postMessage({ success: false, error: error?.message || String(error) });
      }
    };
  `;
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);

  return (...args: Parameters<T>): Promise<R> =>
    new Promise((resolve, reject) => {
      const workerInstance = new Worker(workerUrl);

      const cleanup = () => {
        workerInstance.terminate();
        URL.revokeObjectURL(workerUrl);
      };

      workerInstance.onmessage = (e) => {
        cleanup();
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };

      workerInstance.onerror = (err) => {
        cleanup();
        reject(new Error(err.message || 'Worker error occurred'));
      };

      workerInstance.postMessage({ args });
    });
}
