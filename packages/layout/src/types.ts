export interface Size {
    width: number;
    height: number;
}

export type AspectRatioGrid = number[][];

export interface Position {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ImageLayout {
    width: number;
    height: number;
    positions: Position[];
}
