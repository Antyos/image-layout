import { layoutGridByRows, MultiRowLayout, SingleRowLayout } from './image-layout';

describe('SingleRowLayout', () => {
    let layout: SingleRowLayout;

    beforeEach(() => {
        layout = new SingleRowLayout([1, 1.5, 0.5], { spacing: 10 });
    });

    test('should initialize with the correct spacing', () => {
        expect(layout.config.spacing).toBe(10);
    });

    test('should calculate the correct row height', () => {
        expect(layout.getRowHeight(320)).toBe(100);
    });

    test('should calculate the correct row width', () => {
        expect(layout.getRowWidth(100)).toBe(320);
    });

    test('should calculate the correct aspect ratio sum', () => {
        expect(layout.totalRatio).toBe(3);
    });

    test('should create the correct layout for a single row', () => {
        const positions = layout.layoutSingleRow(100, { offset: { x: 20, y: 30 } });
        expect(positions).toEqual([
            { x: 20, y: 30, width: 100, height: 100 },
            { x: 130, y: 30, width: 150, height: 100 },
            { x: 290, y: 30, width: 50, height: 100 },
        ]);
    });
});

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
            2,
        );

        expect(layout.height).toBeCloseTo(200);
        expect(layout.width).toBeCloseTo(300);
    });
});

describe('MultiRowLayout', () => {
    describe('constructor', () => {
        it('should accept an array of SingleRowLayout instances', () => {
            const singleRowLayout1 = new SingleRowLayout([1, 2], { spacing: 10 });
            const singleRowLayout2 = new SingleRowLayout([1, 2, 3], { spacing: 10 });
            const multiRowLayout = new MultiRowLayout(
                [singleRowLayout1, singleRowLayout2],
                { spacing: 20 },
            );
            expect(multiRowLayout.rows).toHaveLength(2);
            expect(multiRowLayout.rows[0]).toBeInstanceOf(SingleRowLayout);
            expect(multiRowLayout.rows[1]).toBeInstanceOf(SingleRowLayout);
        });

        it('should convert an array of number arrays to SingleRowLayout instances', () => {
            const children = [[1], [1, 2]];
            const multiRowLayout = new MultiRowLayout(children, {});
            expect(multiRowLayout.rows).toHaveLength(2);
            expect(multiRowLayout.rows[0]).toBeInstanceOf(SingleRowLayout);
            expect(multiRowLayout.rows[1]).toBeInstanceOf(SingleRowLayout);
        });
    });

    describe('getLayoutHeight', () => {
        it('should return the correct height for a layout with a single row', () => {
            const singleRowLayout = new SingleRowLayout([1, 2], { spacing: 10 });
            const multiRowLayout = new MultiRowLayout([singleRowLayout], {
                spacing: 20,
            });
            expect(multiRowLayout.getLayoutHeight(100)).toEqual(30);
        });

        it('should return the correct height for a layout with multiple rows', () => {
            const singleRowLayout1 = new SingleRowLayout([0.5, 1.5], { spacing: 10 });
            const singleRowLayout2 = new SingleRowLayout([2, 0.75, 1.25], {
                spacing: 10,
            });
            const multiRowLayout = new MultiRowLayout(
                [singleRowLayout1, singleRowLayout2],
                { spacing: 20 },
            );
            expect(multiRowLayout.getLayoutHeight(120)).toEqual(100);
        });
    });

    describe('getLayoutWidth', () => {
        it('should return the correct width for a layout with a single row', () => {
            const singleRowLayout = new SingleRowLayout([1, 2], { spacing: 10 });
            const multiRowLayout = new MultiRowLayout([singleRowLayout], {
                spacing: 20,
            });
            expect(multiRowLayout.getLayoutWidth(30)).toBeCloseTo(100, 3);
        });

        it('should return the correct width for a layout with multiple rows', () => {
            const singleRowLayout1 = new SingleRowLayout([0.5, 1.5], { spacing: 10 });
            const singleRowLayout2 = new SingleRowLayout([2, 0.75, 1.25], {
                spacing: 10,
            });
            const multiRowLayout = new MultiRowLayout(
                [singleRowLayout1, singleRowLayout2],
                { spacing: 20 },
            );
            expect(multiRowLayout.getLayoutWidth(100)).toEqual(120);
        });
    });

    describe('layoutSeveralRows', () => {
        it('should return the correct layout for multiple rows', () => {
            const aspects = [
                [1.25, 1.5, 1],
                [0.75, 1.75],
            ];

            const layout = new MultiRowLayout(aspects, { maxWidth: 300, spacing: 10 });

            expect(layout.layoutSeveralRows(300)).toBeDeepCloseTo(
                [
                    { height: 74.67, width: 93, x: 0, y: 0 },
                    { height: 74.67, width: 112, x: 103, y: 0 },
                    { height: 74.67, width: 75, x: 225, y: 0 },
                    { height: 116, width: 87, x: 0, y: 84.67 },
                    { height: 116, width: 203, x: 97, y: 84.67 },
                ],
                2,
            );
        });
    });
});
