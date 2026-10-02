export function repeatFadeDue(now: number, start: number, end: number): boolean {
  const lead = Math.min(1.5, (end - start) / 2);
  return end > start && now >= end - lead;
}
