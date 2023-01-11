// See: https://stackoverflow.com/a/73094037/3721066
export function sum<T>(
    ...[iter, callback]:
        | [iter: number[], callback?: undefined]
        | [iter: T[], callback: (arg: T) => number]
): number {
    return callback
        ? (iter as T[]).reduce((sum, element) => sum + callback(element), 0)
        : (iter as number[]).reduce((sum, x) => sum + x, 0);
}

/**
 * Returns true if `value` is an array of `constructor`
 */
export function isArrayOf<T>(
    value: unknown,
    constructor: new (...args: any[]) => T,
): value is T[] {
    return Array.isArray(value) && value.every((item) => item instanceof constructor);
}
