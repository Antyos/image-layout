import { AspectRatioGrid, ImageLayout, Position, Size } from './types';
import linearPartition from './linear-partition';
import { sum } from './utils';

export interface FixedPartitionConfig {
    align?: 'center' | undefined;
    maxWidth: number;
    maxHeight?: number;
    idealElementHeight?: number;
    spacing?: number;
}

export interface RowLayoutConfig {
    align?: 'center' | undefined;
    maxWidth?: number;
    maxHeight?: number;
    spacing?: number;
}

export class SingleRowLayout {
    public readonly spacing: number;
    private readonly maxWidth?: number;
    private readonly maxHeight?: number;

    public constructor(private readonly children: number[], config: RowLayoutConfig) {
        this.spacing = config.spacing ?? 0;
        this.maxWidth = config.maxWidth;
        this.maxHeight = config.maxHeight;
    }

    public get length() {
        return this.children.length;
    }

    /**
     * Get height of a row of aspect ratios from the width and spacing
     */
    public getRowHeight(width: number): number {
        return (width - this.spacing * (this.children.length - 1)) / sum(this.children);
    }

    public getRowWidth(height: number) {
        return height * this.getAspectRatioSum() + this.spacing * (this.length - 1);
    }

    public getAspectRatioSum() {
        return sum(this.children);
    }

    /**
     * Layout images for a single row given the row height
     */
    public layoutSingleRow(
        height: number,
        options?: {
            offset?: { x?: number; y?: number };
        },
    ): Position[] {
        let xOffset = options?.offset.x ?? 0;
        const yOffset = options?.offset.y ?? 0;
        const positions: Position[] = [];
        // Create layout for the row
        for (const child of this.children) {
            const width = Math.round(height * child);
            // Append position
            positions.push({
                y: yOffset,
                x: xOffset,
                width,
                height,
            });
            // Accumulate xPos
            xOffset += width + this.spacing;
        }

        return positions;
    }
}

// Will eventually be a generic column layout
export class MultiRowLayout {
    public readonly spacing: number;
    private readonly containerWidth?: number;
    private readonly containerHeight?: number;

    public constructor(
        private readonly children: SingleRowLayout[],
        config: RowLayoutConfig,
    ) {
        this.spacing = config.spacing ?? 0;
        // Determine the container width and height based on potential maximums
        // Definitely a more elegant way exists
        if (config.maxWidth !== undefined && config.maxHeight !== undefined) {
            const layoutHeight = this.getLayoutHeight(config.maxWidth);
            if (layoutHeight > config.maxHeight) {
                this.containerHeight = config.maxHeight;
                this.containerWidth = this.getLayoutWidth(config.maxHeight);
            } else {
                this.containerWidth = config.maxWidth;
                this.containerHeight = layoutHeight;
            }
        } else if (config.maxWidth !== undefined && config.maxHeight === undefined) {
            this.containerWidth = config.maxWidth;
            this.containerHeight = this.getLayoutHeight(config.maxWidth);
        }
    }

    /**
     * Get height of full layout from an aspect ratio grid, width, and spacing
     */
    public getLayoutHeight(width: number): number {
        return (
            sum(this.children, (row) => row.getRowHeight(width)) +
            this.spacing * (this.children.length - 1)
        );
    }

    // Not going to work as is
    public getLayoutWidth(height: number): number {
        return (
            (height -
                this.spacing *
                    (this.children.length -
                        1 -
                        sum(
                            this.children,
                            (row) => (row.length - 1) / row.getAspectRatioSum(),
                        ))) /
            sum(this.children, (row) => 1 / row.getAspectRatioSum())
        );
    }

    public layoutSeveralRows(
        width: number,
        options?: {
            offset?: { x?: number; y?: number };
        },
    ): Position[] {
        const xOffset = options?.offset?.x ?? 0;
        let yOffset = options?.offset?.y ?? 0;
        const positions: Position[] = [];
        for (const row of this.children) {
            const rowHeight = row.getRowHeight(width);
            // Reconstruct row based on aspect ratios
            positions.push(
                ...row.layoutSingleRow(rowHeight, {
                    offset: { x: xOffset, y: yOffset },
                }),
            );
            yOffset += rowHeight + this.spacing;
        }

        return positions;
    }
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
            offset: { x: padLeft },
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

function getRowWidth(aspects: number[], height: number, spacing: number) {
    return Math.round(sum(aspects) * height) + (aspects.length - 1) * spacing;
}

export function layoutGridByRows(
    imageAspects: number[][],
    options: FixedPartitionConfig,
): ImageLayout {
    const spacing = options.spacing ?? 0;
    const containerWidth = options.maxWidth;

    const layoutOptions = { spacing: options.spacing };
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
    options?: { spacing?: number },
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
    options?: { spacing?: number },
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
        offset?: { x?: number; y?: number };
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
        offset?: { x?: number; y?: number };
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
                offset: { x: xOffset, y: yOffset },
            }),
        );
        yOffset += rowHeight + spacing;
    }

    return positions;
}
