export function unique(arr) {
    return Array.from(new Set(arr));
}
export function mean(arr) {
    if (arr.length === 0)
        return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}
export function stddev(arr) {
    if (arr.length === 0)
        return 0;
    const m = mean(arr);
    const v = mean(arr.map((x) => (x - m) ** 2));
    return Math.sqrt(v);
}
export function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
