import { AspectRatioGrid, ImageLayout, Position, Size } from './types';
import linearPartition from './linear-partition';
import { sum, isArrayOf } from './utils';

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

const defaultRowLayoutConfig: RowLayoutConfig = {
    spacing: 0,
} as const;

export class SingleRowLayout {
    public readonly config: typeof defaultRowLayoutConfig;

    public constructor(public readonly ratios: number[], config?: RowLayoutConfig) {
        this.config = {
            ...defaultRowLayoutConfig,
            ...config,
        };
    }

    public get length() {
        return this.ratios.length;
    }

    /**
     * The sum of all child aspect ratios
     */
    public get totalRatio() {
        return sum(this.ratios);
    }

    /**
     * Get height of a row of aspect ratios from the width and spacing
     */
    public getRowHeight(width: number): number {
        return (
            (width - this.config.spacing * (this.ratios.length - 1)) / sum(this.ratios)
        );
    }

    /**
     * Get width of a row of aspect ratios from the height and spacing
     */
    public getRowWidth(height: number) {
        return height * this.totalRatio + this.config.spacing * (this.length - 1);
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
        for (const ratio of this.ratios) {
            const width = Math.round(height * ratio);
            // Append position
            positions.push({
                y: yOffset,
                x: xOffset,
                width,
                height,
            });
            // Accumulate xPos
            xOffset += width + this.config.spacing;
        }

        return positions;
    }
}

// Will eventually be a generic column layout
export class MultiRowLayout {
    public readonly config: RowLayoutConfig;
    public readonly rows: SingleRowLayout[];
    private readonly containerWidth?: number;
    private readonly containerHeight?: number;

    public constructor(rows: SingleRowLayout[] | number[][], config?: RowLayoutConfig) {
        // Coerce rows to SingleRowLayout
        this.rows = isArrayOf(rows, SingleRowLayout)
            ? rows
            : rows.map((row: number[]) => new SingleRowLayout(row, config));

        // Apply default config
        this.config = {
            ...defaultRowLayoutConfig,
            ...config,
        };

        // Determine the container width and height based on potential maximums
        // Definitely a more elegant way exists
        if (this.config.maxWidth !== undefined && this.config.maxHeight !== undefined) {
            const layoutHeight = this.getLayoutHeight(this.config.maxWidth);
            if (layoutHeight > this.config.maxHeight) {
                this.containerHeight = this.config.maxHeight;
                this.containerWidth = this.getLayoutWidth(this.config.maxHeight);
            } else {
                this.containerWidth = this.config.maxWidth;
                this.containerHeight = layoutHeight;
            }
        } else if (
            this.config.maxWidth !== undefined &&
            this.config.maxHeight === undefined
        ) {
            this.containerWidth = this.config.maxWidth;
            this.containerHeight = this.getLayoutHeight(this.config.maxWidth);
        }
    }

    /**
     * Get height of full layout from an aspect ratio grid, width, and spacing
     */
    public getLayoutHeight(width: number): number {
        return (
            sum(this.rows, (row) => row.getRowHeight(width)) +
            this.config.spacing * (this.rows.length - 1)
        );
    }

    // Not going to work as is
    public getLayoutWidth(height: number): number {
        return (
            (height +
                sum(
                    this.rows,
                    (row) => ((row.length - 1) * row.config.spacing) / row.totalRatio,
                ) -
                this.config.spacing * (this.rows.length - 1)) /
            sum(this.rows, (row) => 1 / row.totalRatio)
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
        for (const row of this.rows) {
            const rowHeight = row.getRowHeight(width);
            // Reconstruct row based on aspect ratios
            positions.push(
                ...row.layoutSingleRow(rowHeight, {
                    offset: { x: xOffset, y: yOffset },
                }),
            );
            yOffset += rowHeight + this.config.spacing;
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
        const layout = new SingleRowLayout(aspects, options);

        // (2a) Fallback to just standard size
        // If options.maxHeight is defined and less than idealHeight, use it as the height
        const height =
            options?.maxHeight < idealHeight ? options.maxHeight : idealHeight;

        // Get amount to pad left for centering
        const padLeft =
            options.align === 'center'
                ? Math.floor((containerWidth - layout.getRowWidth(idealHeight)) / 2)
                : 0;

        const positions = layout.layoutSingleRow(height, {
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

export function layoutGridByRows(
    imageAspects: number[][],
    options: FixedPartitionConfig,
): ImageLayout {
    const spacing = options.spacing ?? 0;
    const containerWidth = options.maxWidth;

    const layout = new MultiRowLayout(imageAspects, options);

    const layoutOptions = { spacing: options.spacing };
    const layoutHeight = layout.getLayoutHeight(containerWidth);

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
            positions: layout.layoutSeveralRows(width),
        };
    }

    // Return layout as usual
    return {
        width: containerWidth,
        height: layoutHeight,
        positions: layout.layoutSeveralRows(containerWidth),
    };
}
