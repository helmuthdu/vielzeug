export function tryCall(callback: () => void, onError: (reason: unknown) => void): void {
  try {
    callback();
  } catch (reason) {
    onError(reason);
  }
}
