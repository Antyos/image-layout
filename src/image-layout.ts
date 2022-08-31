import linearPartition from 'linear-partition';
import {AspectRatioGrid, ImageLayout, Position, Size} from 'types';
import {sum} from 'utils';

export interface FixedPartitionConfig {
    align?: 'center' | undefined;
    maxWidth: number;
    maxHeight?: number;
    idealElementHeight?: number;
    spacing?: number;
}

/**
 * Algorithm: fixed-partition
 *
 * The algorithm outlined by Johannes Treitz in "The algorithm
 * for a perfectly balanced photo gallery" (see url below).
 *
 * @see https://www.crispymtn.com/stories/the-algorithm-for-a-perfectly-balanced-photo-gallery
 */
export function fixedPartition(
    elements: Size[],
    options: FixedPartitionConfig,
): ImageLayout {
    const spacing = options.spacing ?? 0;
    const containerWidth = options.maxWidth;
    const idealHeight = options.idealElementHeight ?? containerWidth / 3;

    // Calculate aspect ratio of all photos
    const aspects = elements.map((element) => element.width / element.height);

    // Calculate total width of all photos
    const summedWidth = sum(aspects) * idealHeight;

    // Calculate rows needed. Ignore spacing here for simplicity
    const rowsNeeded = Math.round(summedWidth / containerWidth);

    // Adjust photo sizes
    if (rowsNeeded < 1) {
        // (2a) Fallback to just standard size
        // If options.maxHeight is defined and less than idealHeight, use it as the height
        const height =
            options?.maxHeight < idealHeight ? options.maxHeight : idealHeight;

        // Get amount to pad left for centering
        const padLeft =
            options.align === 'center'
                ? Math.floor(
                      (containerWidth - getRowWidth(aspects, idealHeight, spacing)) / 2,
                  )
                : 0;

        const positions = layoutSingleRow(aspects, height, {
            spacing,
            offset: {x: padLeft},
        });
        // Return layout
        return {
            width: containerWidth,
            height,
            positions,
        };
    }

    // (2b) Distribute photos over rows using the aspect ratio as weight
    const partitions = linearPartition(
        // Original implementation called for getting aspectRatios as a rounded
        // percent, but this doesn't seem necessary (and vastly simplifies things)
        aspects, // .map(aspect => Math.round(aspect * 100)),
        rowsNeeded,
    );

    return layoutGridByRows(partitions, options);
}

function getRowWidth(aspects: number[], idealHeight: number, spacing: number) {
    return (
        sum(
            aspects,
            (aspect) =>
                (Math.round(idealHeight * aspect) - spacing * (aspects.length - 1)) /
                aspects.length,
        ) +
        (aspects.length - 1) * spacing
    );
}

export function layoutGridByRows(
    imageAspects: number[][],
    options: FixedPartitionConfig,
): ImageLayout {
    const spacing = options.spacing ?? 0;
    const containerWidth = options.maxWidth;

    const layoutOptions = {spacing: options.spacing};
    const layoutHeight = getLayoutHeight(imageAspects, containerWidth, layoutOptions);

    // Recalculate container if we exceeded the maximum height
    // WIP
    if (layoutHeight > options?.maxHeight) {
        // Get new width based on maxHeight
        const width =
            (options.maxHeight -
                spacing *
                    (imageAspects.length -
                        1 -
                        sum(imageAspects, (row) => (row.length - 1) / sum(row)))) /
            sum(imageAspects, (row) => 1 / sum(row));

        return {
            width,
            height: options.maxHeight,
            positions: layoutSeveralRows(imageAspects, width, layoutOptions),
        };
    }

    // Return layout as usual
    return {
        width: containerWidth,
        height: layoutHeight,
        positions: layoutSeveralRows(imageAspects, containerWidth, layoutOptions),
    };
}

/**
 * Get height of a row of aspect ratios from the width and spacing
 */
function getRowHeight(
    aspects: number[],
    rowWidth: number,
    options?: {spacing?: number},
): number {
    const spacing = options?.spacing ?? 0;
    return (rowWidth - spacing * (aspects.length - 1)) / sum(aspects);
}

/**
 * Get height of full layout from an aspect ratio grid, width, and spacing
 */
function getLayoutHeight(
    aspects: AspectRatioGrid,
    containerWidth: number,
    options?: {spacing?: number},
): number {
    return (
        sum(aspects, (row) => getRowHeight(row, containerWidth, options)) +
        (options?.spacing ?? 0) * (aspects.length - 1)
    );
}

/**
 * Layout images for a single row given the row height
 */
function layoutSingleRow(
    aspects: number[],
    height: number,
    options?: {
        spacing?: number;
        offset?: {x?: number; y?: number};
    },
): Position[] {
    let xOffset = options?.offset.x ?? 0;
    const yOffset = options?.offset.y ?? 0;
    const spacing = options?.spacing ?? 0;
    const positions: Position[] = [];
    // Create layout for the row
    for (const aspect of aspects) {
        const width = Math.round(height * aspect);
        // Append position
        positions.push({
            y: yOffset,
            x: xOffset,
            width,
            height,
        });
        // Accumulate xPos
        xOffset += width + spacing;
    }

    return positions;
}

function layoutSeveralRows(
    aspects: AspectRatioGrid,
    width: number,
    options?: {
        spacing?: number;
        offset?: {x?: number; y?: number};
    },
): Position[] {
    const xOffset = options?.offset?.x ?? 0;
    let yOffset = options?.offset?.y ?? 0;
    const spacing = options?.spacing ?? 0;
    const positions: Position[] = [];
    for (const rowAspects of aspects) {
        const rowHeight = getRowHeight(rowAspects, width, options);
        // Reconstruct row based on aspect ratios
        positions.push(
            ...layoutSingleRow(rowAspects, rowHeight, {
                spacing,
                offset: {x: xOffset, y: yOffset},
            }),
        );
        yOffset += rowHeight + spacing;
    }

    return positions;
}
