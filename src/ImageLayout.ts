import {Size} from 'types';

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

type AspectRatioGrid = number[][];

interface ImageLayout {
  width: number;
  height: number;
  positions: Position[];
}

export interface FixedColumnConfig {
  maxWidth: number;
  columnCount: number;
  spacing?: number;
}

export interface FixedPartitionConfig {
  align?: 'center' | undefined;
  maxWidth: number;
  maxHeight?: number;
  idealElementHeight?: number;
  spacing?: number;
}

function sum<T>(iter: Array<T>, callback?: (arg: T) => number): number {
  // TODO: cleanup no callback case with just numbers
  return callback
    ? iter.reduce((sum, element) => (sum += callback(element)), 0)
    : iter.reduce((sum, x) => (sum += Number(x)), 0);
}

export function fixedColumn(
  elements: Size[],
  options: FixedColumnConfig,
): ImageLayout {
  const spacing = options.spacing ?? 0;
  const containerWidth = options.maxWidth;
  const columnCount = options.columnCount ?? 3;
  if (columnCount <= 0) throw new Error('Must have at least 1 column');
  const columnWidth = Math.round(
    (containerWidth - (columnCount - 1) * spacing) / columnCount,
  );

  const positions: Position[] = [];
  const columnHeights: number[] = Array(columnCount).fill(0);

  // distribute images to columns as evenly as possible
  for (const element of elements) {
    const aspect = element.width / element.height;
    const dst_width = columnWidth;
    const dst_height = Math.round(dst_width / aspect);

    // pick the column that is least-filled
    const colIndex = columnHeights.reduce(
      (minIndex, colHeight, index, columnHeights) =>
        colHeight < columnHeights[minIndex] ? index : minIndex,
    );

    // update the column heights
    const yPos = columnHeights[colIndex];
    columnHeights[colIndex] += dst_height + spacing;

    positions.push({
      x: colIndex * (columnWidth + spacing),
      y: yPos,
      width: dst_width,
      height: dst_height,
    });
  }

  // Remove last spacing from each column height
  columnHeights.forEach(height => {
    if (height > 0) {
      height -= spacing;
    }
  });

  // TODO: equalize columns w/option?
  return {
    width: containerWidth,
    height: Math.max(...columnHeights),
    positions: positions,
  };
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

  // calculate aspect ratio of all photos
  const aspects = elements.map(element => element.width / element.height);

  // calculate total width of all photos
  const summedWidth = sum(aspects) * idealHeight;

  // calculate rows needed. Ignore spacing here for simplicity
  const rowsNeeded = Math.round(summedWidth / containerWidth);

  // adjust photo sizes
  if (rowsNeeded < 1) {
    // (2a) Fallback to just standard size
    // If options.maxHeight is defined and less than idealHeight, use it as the height
    const height =
      options?.maxHeight < idealHeight ? options.maxHeight : idealHeight;

    // Get amount to pad left for centering
    const padLeft =
      options.align !== 'center'
        ? 0
        : (() => {
            const spaceNeeded =
              sum(
                aspects,
                aspect =>
                  Math.round(idealHeight * aspect) -
                  (spacing * (aspects.length - 1)) / aspects.length,
              ) +
              (aspects.length - 1) * spacing;
            // Pad xPos
            return Math.floor((containerWidth - spaceNeeded) / 2);
          })();

    const positions = layoutSingleRow(aspects, height, {
      spacing: spacing,
      offset: {x: padLeft},
    });
    // Return layout
    return {
      width: containerWidth,
      height: height,
      positions: positions,
    };
  }

  // (2b) Distribute photos over rows using the aspect ratio as weight
  const partitions = linearPartition(
    // Original implementation called for getting aspectRatios as a rounded
    // percent, but this doesn't seem necessary (and vastly simplifies things)
    aspects, //.map(aspect => Math.round(aspect * 100)),
    rowsNeeded,
  );

  const layoutOptions = {spacing: options.spacing};
  const layoutHeight = getLayoutHeight(
    partitions,
    containerWidth,
    layoutOptions,
  );

  // Recalculate container if we exceeded the maximum height
  // WIP
  if (layoutHeight > options?.maxHeight) {
    // Get new width based on maxHeight
    const width =
      (options.maxHeight -
        spacing *
          (partitions.length -
            1 -
            sum(partitions, row => (row.length - 1) / sum(row)))) /
      sum(partitions, row => 1 / sum(row));

    return {
      width: width,
      height: options.maxHeight,
      positions: layoutSeveralRows(partitions, width, layoutOptions),
    };
  }

  // Return layout as usual
  return {
    width: containerWidth,
    height: layoutHeight,
    positions: layoutSeveralRows(partitions, containerWidth, layoutOptions),
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
    sum(aspects, row => getRowHeight(row, containerWidth, options)) +
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
    // append position
    positions.push({
      y: yOffset,
      x: xOffset,
      width: width,
      height: height,
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
        spacing: spacing,
        offset: {x: xOffset, y: yOffset},
      }),
    );
    yOffset += rowHeight + spacing;
  }

  return positions;
}

/** Linear partition based on: https://github.com/zaikio/linear-partition
 *
 * Partitions a sequence of non-negative integers into k ranges.
 * Based on Óscar López implementation in Python (http://stackoverflow.com/a/7942946)
 * @see {@link http://www8.cs.umu.se/kurser/TDBAfl/VT06/algorithms/BOOK/BOOK2/NODE45.HTM}
 * @example
 * // returns [[9,2,6,3],[8,5,8],[1,7,3,4]]
 * linearPartition([9,2,6,3,8,5,8,1,7,3,4], 3);
 */
function linearPartition(seq: number[], k: number): AspectRatioGrid {
  const n = seq.length;
  if (k <= 0) return [];
  if (k > n) return seq.map(x => [x]);

  // Set up linear partition tables
  const table: number[][] = Array.from(Array(n), () => Array(k).fill(0)); // size: (n) x (k)
  const solution: number[][] = Array.from(Array(n - 1), () =>
    Array(k - 1).fill(0),
  ); // size: (n-1) x (k-1)

  for (let i = 0; i < n; i++) {
    table[i][0] = seq[i] + (i ? table[i - 1][0] : 0);
  }

  for (let j = 0; j < k; j++) {
    table[0][j] = seq[0];
  }

  for (let i = 1; i < n; i++) {
    for (let j = 1; j < k; j++) {
      const m = [...Array(i).keys()].reduce(
        (min: [number, number], x: number) => {
          const tableVal = Math.max(table[x][j - 1], table[i][0] - table[x][0]);
          return tableVal < min[0] ? [tableVal, x] : min;
        },
        [Math.max(table[0][j - 1], table[i][0] - table[0][0]), 0],
      );
      table[i][j] = m[0];
      solution[i - 1][j - 1] = m[1];
    }
  }

  // Solve linear partition
  const ans: AspectRatioGrid = [];
  let _n = n - 1;
  let _k = k - 2;
  while (_k >= 0) {
    // Append to beginning of array
    // python: [seq[i] for i in range(solution[n-1][k]+1, n+1)]
    ans.unshift(
      [...Array(_n + 1 - (solution[_n - 1][_k] + 1)).keys()].map(
        i => seq[i + solution[_n - 1][_k] + 1],
      ),
    );
    _n = solution[_n - 1][_k];
    _k--;
  }

  ans.unshift([...Array(_n + 1).keys()].map(i => seq[i]));

  return ans;
}
