export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stddev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  const v = mean(arr.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
