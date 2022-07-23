export function sum<T>(iter: T[], callback?: (arg: T) => number): number {
    return callback
        ? iter.reduce((sum, element) => sum + callback(element), 0)
        : iter.reduce((sum, x) => sum + Number(x), 0);
}
