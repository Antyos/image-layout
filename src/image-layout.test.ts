import {layoutGridByRows} from './image-layout';

describe("Test Grid Layout", () => {
    test("Several rows, full width, no spacing", () => {
        const aspects = [
            [1.25, 1.5, 1],
            [0.75, 1.75]
        ]

        const layout = layoutGridByRows(aspects, {maxWidth: 300, spacing: 0});
        expect(layout.positions).toStrictEqual([
            {height: 80, width: 100, x: 0, y: 0},
            {height: 80, width: 120, x: 100, y: 0},
            {height: 80, width: 80, x: 220, y: 0},
            {height: 120, width: 90, x: 0, y: 80},
            {height: 120, width: 210, x: 90, y: 80},
        ]);
    });
});
