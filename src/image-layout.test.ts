import { layoutGridByRows, SingleRowLayout } from './image-layout';

describe('SingleRowLayout', () => {
    let layout: SingleRowLayout;

    beforeEach(() => {
        layout = new SingleRowLayout([1, 1.5, 0.5], { spacing: 10 });
    });

    test('should initialize with the correct spacing', () => {
        expect(layout.spacing).toBe(10);
    });

    test('should calculate the correct row height', () => {
        expect(layout.getRowHeight(320)).toBe(100);
    });

    test('should calculate the correct row width', () => {
        expect(layout.getRowWidth(100)).toBe(320);
    });

    test('should calculate the correct aspect ratio sum', () => {
        expect(layout.getAspectRatioSum()).toBe(3);
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

test('Layout spacing', () => {
    const aspects = [
        [1.25, 1.5, 1],
        [0.75, 1.75],
    ];

    const layout = layoutGridByRows(aspects, { maxWidth: 300, spacing: 10 });

    expect(layout.positions).toBeDeepCloseTo(
        [
            { height: 74.67, width: 93, x: 0, y: 0 },
            { height: 74.67, width: 112, x: 103, y: 0 },
            { height: 74.67, width: 75, x: 225, y: 0 },
            { height: 116, width: 87, x: 0, y: 84.67 },
            { height: 116, width: 203, x: 97, y: 84.67 },
        ],
        2,
    );

    expect(layout.height).toBeCloseTo(200.67);
    expect(layout.width).toBeCloseTo(300);
});

// Test layoutSingleRow()
// getRowHeight()
// getLayoutHeight()
