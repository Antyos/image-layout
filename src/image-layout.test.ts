import { layoutGridByRows } from './image-layout';

describe('Grid layout bounds with no spacing', () => {
    const aspects = [
        [1.25, 1.5, 1],
        [0.75, 1.75],
    ];

    test.each([
        { str: 'no', config: { maxWidth: 300, maxHeight: undefined } },
        { str: 'non-constraining', config: { maxWidth: 300, maxHeight: 300 } },
        { str: 'constraining', config: { maxWidth: 600, maxHeight: 200 } },
    ])('$str maxHeight', ({ str, config }) => {
        const layout = layoutGridByRows(aspects, config);
        expect(layout.positions).toBeDeepCloseTo(
            [
                { height: 80, width: 100, x: 0, y: 0 },
                { height: 80, width: 120, x: 100, y: 0 },
                { height: 80, width: 80, x: 220, y: 0 },
                { height: 120, width: 90, x: 0, y: 80 },
                { height: 120, width: 210, x: 90, y: 80 },
            ],
            1,
        );
    });
});
