export async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
}
