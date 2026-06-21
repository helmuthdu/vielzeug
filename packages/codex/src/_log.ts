/** Single stderr I/O path for all runtime output in src/. Mockable in tests. */
export function log(message: string): void {
  process.stderr.write(`${message}\n`);
}
