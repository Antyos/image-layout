import {ImageLayout, Position, Size} from 'types';

export interface FixedColumnConfig {
    maxWidth: number;
    columnCount: number;
    spacing?: number;
}

export function fixedColumn(elements: Size[], options: FixedColumnConfig): ImageLayout {
    const spacing = options.spacing ?? 0;
    const containerWidth = options.maxWidth;
    const columnCount = options.columnCount ?? 3;
    if (columnCount <= 0) {
        throw new Error('Must have at least 1 column');
    }

    const columnWidth = Math.round(
        (containerWidth - (columnCount - 1) * spacing) / columnCount,
    );

    const positions: Position[] = [];
    const columnHeights: number[] = Array.from({length: columnCount}, () => 0);

    // Distribute images to columns as evenly as possible
    for (const element of elements) {
        const aspect = element.width / element.height;
        const dstWidth = columnWidth;
        const dstHeight = Math.round(dstWidth / aspect);

        // Pick the column that is least-filled
        // eslint-disable-next-line unicorn/no-array-reduce
        const colIndex = columnHeights.reduce(
            (minIndex, colHeight, index, columnHeights) =>
                colHeight < columnHeights[minIndex] ? index : minIndex,
        );

        // Update the column heights
        const yPos = columnHeights[colIndex];
        columnHeights[colIndex] += dstHeight + spacing;

        positions.push({
            x: colIndex * (columnWidth + spacing),
            y: yPos,
            width: dstWidth,
            height: dstHeight,
        });
    }

    // Remove last spacing from each column height
    for (let height of columnHeights) {
        if (height > 0) {
            height -= spacing;
        }
    }

    // TODO: equalize columns w/option?
    return {
        width: containerWidth,
        height: Math.max(...columnHeights),
        positions,
    };
}
