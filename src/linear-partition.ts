/** Linear partition based on: https://github.com/zaikio/linear-partition
 *
 * Partitions a sequence of non-negative integers into k ranges.
 * Based on Óscar López implementation in Python (http://stackoverflow.com/a/7942946)
 * @see {@link http://www8.cs.umu.se/kurser/TDBAfl/VT06/algorithms/BOOK/BOOK2/NODE45.HTM}
 * @example
 * // returns [[9,2,6,3],[8,5,8],[1,7,3,4]]
 * linearPartition([9,2,6,3,8,5,8,1,7,3,4], 3);
 */
export default function linearPartition(seq: number[], k: number): number[][] {
    const n = seq.length;
    if (k <= 0) {
        return [];
    }

    if (k > n) {
        return seq.map(x => [x]);
    }

    // Set up linear partition tables
    // Size: (n) x (k)
    const table: number[][] = Array.from(Array.from({length: n}), () =>
        Array.from({length: k}, () => 0),
    );
    // Size: (n-1) x (k-1)
    const solution: number[][] = Array.from(Array.from({length: n - 1}), () =>
        Array.from({length: k - 1}, () => 0),
    );

    for (let i = 0; i < n; i++) {
        table[i][0] = seq[i] + (i ? table[i - 1][0] : 0);
    }

    for (let j = 0; j < k; j++) {
        table[0][j] = seq[0];
    }

    for (let i = 1; i < n; i++) {
        for (let j = 1; j < k; j++) {
            // eslint-disable-next-line unicorn/no-array-reduce
            const m = [...Array.from({length: i}).keys()].reduce(
                (min: [number, number], x: number) => {
                    const tableValue = Math.max(
                        table[x][j - 1],
                        table[i][0] - table[x][0],
                    );
                    return tableValue < min[0] ? [tableValue, x] : min;
                },
                [Math.max(table[0][j - 1], table[i][0] - table[0][0]), 0],
            );
            table[i][j] = m[0];
            solution[i - 1][j - 1] = m[1];
        }
    }

    // Solve linear partition
    const ans: number[][] = [];
    let _n = n - 1;
    let _k = k - 2;
    while (_k >= 0) {
        // Append to beginning of array
        // python: [seq[i] for i in range(solution[n-1][k]+1, n+1)]
        ans.unshift(
            [...Array.from({length: _n + 1 - (solution[_n - 1][_k] + 1)}).keys()].map(
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                i => seq[i + solution[_n - 1][_k] + 1],
            ),
        );
        _n = solution[_n - 1][_k];
        _k--;
    }

    ans.unshift([...Array.from({length: _n + 1}).keys()].map(i => seq[i]));

    return ans;
}
